import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { fetchRatings } from "@/lib/omdb";
import { cosineSimilarity } from "@/lib/embeddings";

// ===========================
// Auth Helper
// ===========================

async function getAuthenticatedClient(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;

  return { supabase, user };
}

// ===========================
// GET /api/recommend/personal
// ===========================

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedClient(request);
  if (!auth) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { supabase, user } = auth;

  try {
    // Fetch user's taste embedding from profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("taste_embedding, taste_updated_at")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return NextResponse.json(
        { error: "Failed to fetch profile" },
        { status: 500 }
      );
    }

    if (!profile?.taste_embedding) {
      return NextResponse.json({
        results: [],
        message: "Rate more movies to get personal recommendations",
        profile_strength: "none",
      });
    }

    // Query pgvector for nearest neighbors, excluding already-rated movies
    const { data: matches, error: matchError } = await supabase.rpc(
      "match_movies_by_taste",
      {
        query_embedding: profile.taste_embedding,
        match_user_id: user.id,
        match_count: 10,
      }
    );

    if (matchError) {
      console.error("Vector search error:", matchError);
      return NextResponse.json(
        { error: "Failed to find recommendations" },
        { status: 500 }
      );
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json({
        results: [],
        message: "No recommendations found. Try rating more diverse movies.",
        profile_strength: "getting_started",
      });
    }

    // Fetch user's top-rated movies for explanation context
    const { data: topRated } = await supabase
      .from("reviews")
      .select(
        `
        rating,
        movies(id, title, embedding)
      `
      )
      .eq("user_id", user.id)
      .order("rating", { ascending: false })
      .limit(10);

    const topRatedMovies = (topRated || [])
      .filter((r) => r.rating >= 4.0 && r.movies)
      .map((r) => {
        const movie = r.movies as unknown as { id: string; title: string; embedding: number[] | null };
        return {
          id: movie.id,
          title: movie.title,
          embedding: movie.embedding,
        };
      });

    // Enrich results with OMDB ratings and build explanations
    const enrichedResults = await Promise.all(
      matches.map(async (match: Record<string, unknown>, index: number) => {
        // Fetch fresh OMDB ratings if the movie has an imdb_id
        let freshRatings = null;
        const imdbId = match.imdb_id as string | null;
        if (imdbId) {
          freshRatings = await fetchRatings(imdbId).catch(() => null);
        }

        // Build explanation referencing similar top-rated movies
        const explanation = buildPersonalExplanation(
          match,
          topRatedMovies,
          match.similarity as number
        );

        const similarity = match.similarity as number;

        return {
          movie: {
            id: match.id,
            tmdb_id: match.tmdb_id,
            imdb_id: match.imdb_id,
            title: match.title,
            overview: match.overview,
            release_date: match.release_date,
            runtime_minutes: match.runtime_minutes,
            poster_path: match.poster_path,
            backdrop_path: match.backdrop_path,
            popularity: match.popularity,
            imdb_rating: freshRatings?.imdb_rating ?? match.imdb_rating ?? null,
            imdb_votes: freshRatings?.imdb_votes ?? match.imdb_votes ?? null,
            rotten_tomatoes_score:
              freshRatings?.rotten_tomatoes_score ??
              match.rotten_tomatoes_score ??
              null,
            metacritic_score:
              freshRatings?.metacritic_score ?? match.metacritic_score ?? null,
            platform_avg_rating: match.platform_avg_rating,
            platform_rating_count: match.platform_rating_count,
          },
          score: Math.round(similarity * 100),
          explanation,
          match_type: "taste" as const,
          similarity,
          rank: index + 1,
        };
      })
    );

    // Get profile strength
    const { count: ratingCount } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const profileStrength = getProfileStrength(ratingCount ?? 0);

    return NextResponse.json({
      results: enrichedResults,
      profile_strength: profileStrength,
      taste_updated_at: profile.taste_updated_at,
      movies_rated: ratingCount ?? 0,
    });
  } catch (error) {
    console.error("Personal recommendation error:", error);
    return NextResponse.json(
      { error: "Failed to generate personal recommendations" },
      { status: 500 }
    );
  }
}

// ===========================
// Helpers
// ===========================

function buildPersonalExplanation(
  match: Record<string, unknown>,
  topRatedMovies: { id: string; title: string; embedding: number[] | null }[],
  similarity: number
): string {
  const parts: string[] = [];

  // Find which of the user's top-rated movies are most similar to this recommendation
  if (topRatedMovies.length > 0) {
    const matchEmbedding = match.embedding as number[] | undefined;

    if (matchEmbedding) {
      const similarities = topRatedMovies
        .filter((m) => m.embedding != null)
        .map((m) => ({
          title: m.title,
          similarity: cosineSimilarity(matchEmbedding, m.embedding!),
        }))
        .sort((a, b) => b.similarity - a.similarity);

      if (similarities.length > 0) {
        const topSimilar = similarities.slice(0, 2);
        const titles = topSimilar.map((s) => s.title);

        if (titles.length === 1) {
          parts.push(`Because you loved ${titles[0]}`);
        } else {
          parts.push(
            `Because you loved ${titles[0]} and ${titles[1]}`
          );
        }
      }
    }
  }

  // Fallback if we couldn't find similar movies
  if (parts.length === 0) {
    if (similarity >= 0.85) {
      parts.push("Strongly matches your taste profile");
    } else if (similarity >= 0.7) {
      parts.push("A great match for your taste");
    } else {
      parts.push("Recommended based on your ratings");
    }
  }

  // Add rating context
  const ratingSnippets: string[] = [];
  const imdbRating = match.imdb_rating as number | null;
  const rtScore = match.rotten_tomatoes_score as number | null;

  if (imdbRating != null && imdbRating >= 7) {
    ratingSnippets.push(`${imdbRating}/10 on IMDb`);
  }
  if (rtScore != null && rtScore >= 70) {
    ratingSnippets.push(`${rtScore}% on Rotten Tomatoes`);
  }

  if (ratingSnippets.length > 0) {
    parts.push(`Rated ${ratingSnippets.join(" and ")}`);
  }

  return parts.join(". ");
}

function getProfileStrength(
  ratingCount: number
): "none" | "getting_started" | "taking_shape" | "strong" | "cinephile" {
  if (ratingCount === 0) return "none";
  if (ratingCount < 5) return "getting_started";
  if (ratingCount < 15) return "taking_shape";
  if (ratingCount < 50) return "strong";
  return "cinephile";
}
