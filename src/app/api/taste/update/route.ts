import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import {
  generateMovieEmbedding,
  generateTasteProfile,
  type RatedMovieForTaste,
  type MovieEmbeddingInput,
} from "@/lib/embeddings";

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
// Rating Weight Map
// ===========================

const RATING_WEIGHT_MAP: Record<string, number> = {
  "5": 3,
  "4.5": 2.5,
  "4": 2,
  "3.5": 1.5,
  "3": 1,
  "2.5": 0.75,
  "2": 0.5,
  "1.5": 0.35,
  "1": 0.25,
  "0.5": 0.1,
};

// ===========================
// POST /api/taste/update
// ===========================

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedClient(request);
  if (!auth) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { supabase, user } = auth;

  try {
    // Fetch all user ratings with movie data
    const { data: reviews, error: reviewsError } = await supabase
      .from("reviews")
      .select(
        `
        rating,
        movie_id,
        movies(
          id, title, overview, tagline, embedding,
          release_date
        )
      `
      )
      .eq("user_id", user.id)
      .order("rating", { ascending: false });

    if (reviewsError) {
      console.error("Reviews fetch error:", reviewsError);
      return NextResponse.json(
        { error: "Failed to fetch ratings" },
        { status: 500 }
      );
    }

    if (!reviews || reviews.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No ratings found. Rate some movies first.",
        movies_used: 0,
        profile_strength: "none" as const,
      });
    }

    // Process each rated movie: ensure it has an embedding
    const ratedMovies: RatedMovieForTaste[] = [];
    let embeddingsGenerated = 0;

    for (const review of reviews) {
      const movie = review.movies as unknown as {
        id: string;
        title: string;
        overview: string | null;
        tagline: string | null;
        embedding: number[] | null;
        release_date: string | null;
      } | null;

      if (!movie) continue;

      let embedding = movie.embedding;

      // Generate embedding if missing
      if (!embedding) {
        try {
          // Fetch genres and credits for richer embedding
          const { data: genreData } = await supabase
            .from("movie_genres")
            .select("genres(name)")
            .eq("movie_id", movie.id);

          const { data: creditData } = await supabase
            .from("movie_credits")
            .select("person_id, role_type, job, people(name)")
            .eq("movie_id", movie.id)
            .order("display_order", { ascending: true })
            .limit(15);

          const genres = (genreData || [])
            .map((g) => (g.genres as unknown as { name: string } | null)?.name)
            .filter(Boolean) as string[];

          const cast = (creditData || [])
            .filter((c) => c.role_type === "cast")
            .map((c) => (c.people as unknown as { name: string } | null)?.name)
            .filter(Boolean) as string[];

          const directorCredit = (creditData || []).find(
            (c) => c.role_type === "crew" && c.job === "Director"
          );
          const director = directorCredit
            ? (directorCredit.people as unknown as { name: string } | null)?.name ?? null
            : null;

          const input: MovieEmbeddingInput = {
            title: movie.title,
            overview: movie.overview,
            tagline: movie.tagline,
            genres,
            cast,
            director,
            release_year: movie.release_date
              ? movie.release_date.split("-")[0]
              : null,
          };

          embedding = await generateMovieEmbedding(input);

          // Save the generated embedding back to the movies table
          const { error: updateError } = await supabase
            .from("movies")
            .update({
              embedding: JSON.stringify(embedding),
              updated_at: new Date().toISOString(),
            })
            .eq("id", movie.id);

          if (updateError) {
            console.error(
              `Failed to save embedding for "${movie.title}":`,
              updateError
            );
          } else {
            embeddingsGenerated++;
          }
        } catch (error) {
          console.error(
            `Failed to generate embedding for "${movie.title}":`,
            error
          );
          continue; // Skip this movie in taste computation
        }
      }

      ratedMovies.push({
        rating: review.rating,
        embedding: Array.isArray(embedding) ? embedding : JSON.parse(embedding as string),
      });
    }

    if (ratedMovies.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Could not compute taste profile. Try again later.",
        movies_used: 0,
        profile_strength: "none" as const,
      });
    }

    // Compute weighted average taste embedding
    const tasteEmbedding = generateTasteProfile(ratedMovies);

    if (!tasteEmbedding) {
      return NextResponse.json({
        success: false,
        error: "Failed to compute taste profile",
        movies_used: 0,
        profile_strength: "none" as const,
      });
    }

    // Store taste embedding in profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        taste_embedding: JSON.stringify(tasteEmbedding),
        taste_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
      return NextResponse.json(
        { error: "Failed to update taste profile" },
        { status: 500 }
      );
    }

    const profileStrength = getProfileStrength(ratedMovies.length);

    return NextResponse.json({
      success: true,
      movies_used: ratedMovies.length,
      embeddings_generated: embeddingsGenerated,
      profile_strength: profileStrength,
    });
  } catch (error) {
    console.error("Taste update error:", error);
    return NextResponse.json(
      { error: "Failed to update taste profile" },
      { status: 500 }
    );
  }
}

// ===========================
// Helpers
// ===========================

function getProfileStrength(
  moviesUsed: number
): "getting_started" | "taking_shape" | "strong" | "cinephile" {
  if (moviesUsed < 5) return "getting_started";
  if (moviesUsed < 15) return "taking_shape";
  if (moviesUsed < 50) return "strong";
  return "cinephile";
}
