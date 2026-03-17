import { NextRequest, NextResponse } from "next/server";
import {
  getSimilarMovies,
  discoverMovies,
  getMovieDetails,
  type TMDBMovie,
} from "@/lib/tmdb";
import { fetchRatings, fetchRatingsByTitle } from "@/lib/omdb";
import OpenAI from "openai";

// Mood-to-TMDB discover parameter mapping
const MOOD_MAP: Record<
  string,
  { with_genres?: string; vote_average_gte?: string; vote_average_lte?: string; vote_count_gte?: string; vote_count_lte?: string; sort_by?: string }
> = {
  "date night": {
    with_genres: "10749,35",
  },
  "mind-bending": {
    with_genres: "878,53",
    vote_average_gte: "7",
  },
  "feel-good": {
    with_genres: "35,10751,16",
  },
  "hidden gems": {
    vote_count_lte: "1000",
    vote_average_gte: "7",
  },
  "award winners": {
    vote_average_gte: "8",
    vote_count_gte: "5000",
  },
  underrated: {
    vote_average_gte: "7",
    vote_count_gte: "100",
    vote_count_lte: "2000",
  },
  "comfort rewatch": {
    with_genres: "10751,35,16",
    sort_by: "popularity.desc",
  },
  "based on true events": {
    with_genres: "36,99",
  },
};

interface RecommendRequestBody {
  seeds?: string[];
  natural_language?: string;
  mood?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RecommendRequestBody = await request.json();
    const { seeds, natural_language, mood } = body;

    if (!seeds?.length && !natural_language && !mood) {
      return NextResponse.json(
        { error: "At least one of seeds, natural_language, or mood is required" },
        { status: 400 }
      );
    }

    let tmdbResults: TMDBMovie[] = [];
    let matchType: "seed" | "mood" | "discovery" = "discovery";
    let explanationPrefix = "";

    // Strategy 1: Seed-based (similar movies)
    if (seeds && seeds.length > 0) {
      matchType = "seed";
      const seedIds = seeds.map((s) => parseInt(s, 10)).filter((n) => !isNaN(n));

      const similarPromises = seedIds.map((id) =>
        getSimilarMovies(id).catch(() => ({ results: [] as TMDBMovie[] }))
      );
      const similarResults = await Promise.all(similarPromises);

      // Collect all similar movies, deduplicate
      const seen = new Set<number>(seedIds);
      for (const result of similarResults) {
        for (const movie of result.results) {
          if (!seen.has(movie.id)) {
            seen.add(movie.id);
            tmdbResults.push(movie);
          }
        }
      }

      // Sort by popularity descending
      tmdbResults.sort((a, b) => b.popularity - a.popularity);
      explanationPrefix = "Similar to movies you selected";
    }

    // Strategy 2: Mood-based (TMDB discover with mapped params)
    if (mood && tmdbResults.length < 8) {
      matchType = tmdbResults.length > 0 ? matchType : "mood";
      const normalizedMood = mood.toLowerCase().trim();
      const moodParams = MOOD_MAP[normalizedMood];

      if (moodParams) {
        const discoverParams: Record<string, string> = {};
        if (moodParams.with_genres) discoverParams["with_genres"] = moodParams.with_genres;
        if (moodParams.vote_average_gte) discoverParams["vote_average.gte"] = moodParams.vote_average_gte;
        if (moodParams.vote_average_lte) discoverParams["vote_average.lte"] = moodParams.vote_average_lte;
        if (moodParams.vote_count_gte) discoverParams["vote_count.gte"] = moodParams.vote_count_gte;
        if (moodParams.vote_count_lte) discoverParams["vote_count.lte"] = moodParams.vote_count_lte;
        if (moodParams.sort_by) discoverParams["sort_by"] = moodParams.sort_by;

        const discoverResult = await discoverMovies(discoverParams);
        const existingIds = new Set(tmdbResults.map((m) => m.id));
        for (const movie of discoverResult.results) {
          if (!existingIds.has(movie.id)) {
            existingIds.add(movie.id);
            tmdbResults.push(movie);
          }
        }
        explanationPrefix = explanationPrefix || `Matches your "${mood}" mood`;
      } else {
        // Unknown mood: treat as a genre keyword search via discover
        const discoverResult = await discoverMovies({});
        const existingIds = new Set(tmdbResults.map((m) => m.id));
        for (const movie of discoverResult.results) {
          if (!existingIds.has(movie.id)) {
            existingIds.add(movie.id);
            tmdbResults.push(movie);
          }
        }
        explanationPrefix = explanationPrefix || "Popular picks for you";
      }
    }

    // Strategy 3: Natural language (OpenAI extraction -> TMDB discover)
    if (natural_language && tmdbResults.length < 8) {
      matchType = tmdbResults.length > 0 ? matchType : "discovery";

      const extracted = await extractDiscoverParams(natural_language);

      if (extracted) {
        const discoverParams: Record<string, string> = {};
        if (extracted.genres) discoverParams["with_genres"] = extracted.genres;
        if (extracted.year_gte) discoverParams["primary_release_date.gte"] = `${extracted.year_gte}-01-01`;
        if (extracted.year_lte) discoverParams["primary_release_date.lte"] = `${extracted.year_lte}-12-31`;
        if (extracted.vote_average_gte) discoverParams["vote_average.gte"] = extracted.vote_average_gte;
        if (extracted.keywords) discoverParams["with_keywords"] = extracted.keywords;
        if (extracted.sort_by) discoverParams["sort_by"] = extracted.sort_by;

        const discoverResult = await discoverMovies(discoverParams);
        const existingIds = new Set(tmdbResults.map((m) => m.id));
        for (const movie of discoverResult.results) {
          if (!existingIds.has(movie.id)) {
            existingIds.add(movie.id);
            tmdbResults.push(movie);
          }
        }
        explanationPrefix =
          explanationPrefix || extracted.explanation || "Based on your description";
      }
    }

    // Limit to 8 results
    tmdbResults = tmdbResults.slice(0, 8);

    if (tmdbResults.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Fetch full details and OMDB ratings for each result
    const enrichedResults = await Promise.all(
      tmdbResults.map(async (tmdbMovie, index) => {
        // Get full details if we only have search-level data
        let fullMovie = tmdbMovie;
        if (!tmdbMovie.imdb_id) {
          try {
            fullMovie = await getMovieDetails(tmdbMovie.id);
          } catch {
            // Use what we have
          }
        }

        // Fetch OMDB ratings
        let ratings = null;
        if (fullMovie.imdb_id) {
          ratings = await fetchRatings(fullMovie.imdb_id);
        } else {
          const year = fullMovie.release_date
            ? fullMovie.release_date.split("-")[0]
            : undefined;
          ratings = await fetchRatingsByTitle(fullMovie.title, year);
        }

        // Compute a recommendation score (0-100)
        const score = computeRecommendationScore(fullMovie, ratings, index);

        return {
          movie: {
            tmdb_id: fullMovie.id,
            imdb_id: fullMovie.imdb_id || null,
            title: fullMovie.title,
            release_date: fullMovie.release_date,
            runtime_minutes: fullMovie.runtime || null,
            overview: fullMovie.overview,
            poster_path: fullMovie.poster_path,
            backdrop_path: fullMovie.backdrop_path,
            popularity: fullMovie.popularity,
            genres: fullMovie.genres || [],
            imdb_rating: ratings?.imdb_rating ?? null,
            imdb_votes: ratings?.imdb_votes ?? null,
            rotten_tomatoes_score: ratings?.rotten_tomatoes_score ?? null,
            metacritic_score: ratings?.metacritic_score ?? null,
          },
          score,
          explanation: buildExplanation(
            explanationPrefix,
            fullMovie,
            ratings,
            matchType
          ),
          match_type: matchType,
        };
      })
    );

    // Sort by score descending
    enrichedResults.sort((a, b) => b.score - a.score);

    return NextResponse.json({ results: enrichedResults });
  } catch (error) {
    console.error("Recommendation error:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}

interface ExtractedParams {
  genres?: string;
  keywords?: string;
  year_gte?: string;
  year_lte?: string;
  vote_average_gte?: string;
  sort_by?: string;
  explanation?: string;
}

async function extractDiscoverParams(
  text: string
): Promise<ExtractedParams | null> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error("OPENAI_API_KEY not set, skipping NL extraction");
    return null;
  }

  const openai = new OpenAI({ apiKey: openaiKey });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `You are a movie recommendation assistant. Given a natural language description of what someone wants to watch, extract TMDB Discover API parameters.

Return a JSON object with these optional fields:
- genres: comma-separated TMDB genre IDs. Common IDs: Action=28, Adventure=12, Animation=16, Comedy=35, Crime=80, Documentary=99, Drama=18, Family=10751, Fantasy=14, History=36, Horror=27, Music=10402, Mystery=9648, Romance=10749, Science Fiction=878, Thriller=53, War=10752, Western=37
- keywords: comma-separated TMDB keyword IDs if you know them, otherwise omit
- year_gte: start year (e.g. "1990")
- year_lte: end year (e.g. "1999")
- vote_average_gte: minimum vote average (e.g. "7")
- sort_by: TMDB sort option (popularity.desc, vote_average.desc, revenue.desc, primary_release_date.desc)
- explanation: a short human-readable explanation of what you interpreted

Return ONLY valid JSON, no markdown.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return null;

    // Strip markdown code fences if present
    const cleaned = content.replace(/^```json?\s*/, "").replace(/\s*```$/, "");
    return JSON.parse(cleaned) as ExtractedParams;
  } catch (error) {
    console.error("OpenAI extraction error:", error);
    return null;
  }
}

function computeRecommendationScore(
  movie: TMDBMovie,
  ratings: {
    imdb_rating: number | null;
    imdb_votes: number | null;
    rotten_tomatoes_score: number | null;
    metacritic_score: number | null;
  } | null,
  positionIndex: number
): number {
  let score = 50; // base score

  // Boost from external ratings
  if (ratings) {
    if (ratings.imdb_rating != null) {
      score += (ratings.imdb_rating - 5) * 5; // 5.0 = neutral, 10.0 = +25
    }
    if (ratings.rotten_tomatoes_score != null) {
      score += (ratings.rotten_tomatoes_score - 50) * 0.2; // 100% = +10
    }
    if (ratings.metacritic_score != null) {
      score += (ratings.metacritic_score - 50) * 0.15; // 100 = +7.5
    }
  }

  // Small boost from popularity (log scale)
  if (movie.popularity > 0) {
    score += Math.min(Math.log10(movie.popularity) * 3, 10);
  }

  // Position penalty (earlier results from TMDB are more relevant)
  score -= positionIndex * 0.5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildExplanation(
  prefix: string,
  movie: TMDBMovie,
  ratings: {
    imdb_rating: number | null;
    rotten_tomatoes_score: number | null;
    metacritic_score: number | null;
  } | null,
  matchType: string
): string {
  const parts: string[] = [];

  if (prefix) parts.push(prefix);

  // Add rating context
  const ratingSnippets: string[] = [];
  if (ratings?.imdb_rating != null && ratings.imdb_rating >= 7) {
    ratingSnippets.push(`${ratings.imdb_rating}/10 on IMDb`);
  }
  if (ratings?.rotten_tomatoes_score != null && ratings.rotten_tomatoes_score >= 70) {
    ratingSnippets.push(`${ratings.rotten_tomatoes_score}% on Rotten Tomatoes`);
  }

  if (ratingSnippets.length > 0) {
    parts.push(`Rated ${ratingSnippets.join(" and ")}`);
  }

  if (parts.length === 0) {
    if (matchType === "seed") return "Fans of your picks also enjoy this";
    if (matchType === "mood") return "A great fit for your current mood";
    return "Recommended for you";
  }

  return parts.join(". ");
}
