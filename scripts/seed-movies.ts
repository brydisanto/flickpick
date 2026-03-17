/**
 * Flickpick Database Seed Script
 *
 * Fetches popular movies from TMDB (pages 1-50 = ~1000 movies),
 * enriches with OMDB ratings, and upserts into Supabase.
 *
 * Rate limits:
 *   TMDB: 40 requests per 10 seconds
 *   OMDB: 1000 requests per day (free tier)
 *
 * Run with: npx tsx scripts/seed-movies.ts
 */

import { createClient } from "@supabase/supabase-js";

// ===========================
// Configuration
// ===========================

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const OMDB_API_KEY = process.env.OMDB_API_KEY || "a9177c3f";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TMDB_API_KEY) {
  console.error("ERROR: TMDB_API_KEY environment variable is required");
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const TMDB_BASE = "https://api.themoviedb.org/3";
const OMDB_BASE = "https://www.omdbapi.com";

const TOTAL_PAGES = 50;
const TMDB_RATE_LIMIT = 40; // requests per 10 seconds
const TMDB_RATE_WINDOW = 10_000; // 10 seconds in ms

// ===========================
// Rate Limiter
// ===========================

class RateLimiter {
  private timestamps: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    // Remove timestamps outside the window
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      const oldestInWindow = this.timestamps[0];
      const waitTime = this.windowMs - (now - oldestInWindow) + 100; // 100ms buffer
      if (waitTime > 0) {
        await sleep(waitTime);
      }
      return this.waitForSlot(); // re-check
    }

    this.timestamps.push(Date.now());
  }
}

const tmdbLimiter = new RateLimiter(TMDB_RATE_LIMIT, TMDB_RATE_WINDOW);

// ===========================
// Helpers
// ===========================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tmdbFetch<T>(
  path: string,
  params: Record<string, string> = {}
): Promise<T> {
  await tmdbLimiter.waitForSlot();

  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", TMDB_API_KEY!);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

interface OMDBRating {
  Source: string;
  Value: string;
}

interface OMDBResponse {
  imdbRating: string;
  imdbVotes: string;
  Metascore: string;
  Ratings: OMDBRating[];
  Response: "True" | "False";
}

interface ParsedRatings {
  imdb_rating: number | null;
  imdb_votes: number | null;
  rotten_tomatoes_score: number | null;
  metacritic_score: number | null;
}

async function fetchOmdbRatings(imdbId: string): Promise<ParsedRatings | null> {
  try {
    const url = `${OMDB_BASE}/?i=${encodeURIComponent(imdbId)}&apikey=${OMDB_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data: OMDBResponse = await res.json();
    if (data.Response === "False") return null;

    const result: ParsedRatings = {
      imdb_rating: null,
      imdb_votes: null,
      rotten_tomatoes_score: null,
      metacritic_score: null,
    };

    if (data.imdbRating && data.imdbRating !== "N/A") {
      result.imdb_rating = parseFloat(data.imdbRating);
    }
    if (data.imdbVotes && data.imdbVotes !== "N/A") {
      result.imdb_votes = parseInt(data.imdbVotes.replace(/,/g, ""), 10);
    }
    if (data.Metascore && data.Metascore !== "N/A") {
      result.metacritic_score = parseInt(data.Metascore, 10);
    }
    const rt = data.Ratings?.find((r) => r.Source === "Rotten Tomatoes");
    if (rt) {
      result.rotten_tomatoes_score = parseInt(rt.Value.replace("%", ""), 10);
    }

    return result;
  } catch {
    return null;
  }
}

// ===========================
// Seed: Genres
// ===========================

async function seedGenres(): Promise<void> {
  console.log("\n--- Seeding genres ---");

  const data = await tmdbFetch<{ genres: { id: number; name: string }[] }>(
    "/genre/movie/list"
  );

  for (const genre of data.genres) {
    const { error } = await supabase
      .from("genres")
      .upsert({ tmdb_id: genre.id, name: genre.name }, { onConflict: "tmdb_id" });

    if (error) {
      console.error(`  Failed to upsert genre "${genre.name}":`, error.message);
    }
  }

  console.log(`  Upserted ${data.genres.length} genres`);
}

// ===========================
// Seed: Movies
// ===========================

interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  runtime: number | null;
  overview: string;
  tagline: string;
  poster_path: string | null;
  backdrop_path: string | null;
  original_language: string;
  popularity: number;
  genres?: { id: number; name: string }[];
  imdb_id: string | null;
}

interface TMDBListResult {
  page: number;
  total_results: number;
  total_pages: number;
  results: { id: number; title: string }[];
}

async function seedMovies(): Promise<void> {
  console.log("\n--- Seeding movies ---");

  let totalSeeded = 0;
  let totalFailed = 0;
  let omdbCallCount = 0;
  const MAX_OMDB_CALLS = 950; // stay safely under 1000/day

  // Pre-fetch genre map for linking
  const { data: genreRows } = await supabase
    .from("genres")
    .select("id, tmdb_id");
  const genreMap = new Map<number, number>();
  if (genreRows) {
    for (const g of genreRows) {
      genreMap.set(g.tmdb_id, g.id);
    }
  }

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    console.log(`\n  Page ${page}/${TOTAL_PAGES}...`);

    let listResult: TMDBListResult;
    try {
      listResult = await tmdbFetch<TMDBListResult>("/movie/popular", {
        page: String(page),
      });
    } catch (error) {
      console.error(`  Failed to fetch page ${page}:`, error);
      continue;
    }

    for (const item of listResult.results) {
      try {
        // Fetch full movie details
        const movie = await tmdbFetch<TMDBMovie>(`/movie/${item.id}`);

        // Fetch OMDB ratings if we have an IMDb ID and haven't hit the limit
        let ratings: ParsedRatings | null = null;
        if (movie.imdb_id && omdbCallCount < MAX_OMDB_CALLS) {
          ratings = await fetchOmdbRatings(movie.imdb_id);
          omdbCallCount++;
        }

        // Upsert movie
        const movieRow = {
          tmdb_id: movie.id,
          imdb_id: movie.imdb_id || null,
          title: movie.title,
          original_title: movie.original_title,
          release_date: movie.release_date || null,
          runtime_minutes: movie.runtime || null,
          overview: movie.overview || null,
          tagline: movie.tagline || null,
          poster_path: movie.poster_path,
          backdrop_path: movie.backdrop_path,
          original_language: movie.original_language,
          popularity: movie.popularity,
          imdb_rating: ratings?.imdb_rating ?? null,
          imdb_votes: ratings?.imdb_votes ?? null,
          rotten_tomatoes_score: ratings?.rotten_tomatoes_score ?? null,
          metacritic_score: ratings?.metacritic_score ?? null,
          external_ratings_updated_at: ratings
            ? new Date().toISOString()
            : null,
          updated_at: new Date().toISOString(),
        };

        const { data: upserted, error: upsertError } = await supabase
          .from("movies")
          .upsert(movieRow, { onConflict: "tmdb_id" })
          .select("id")
          .single();

        if (upsertError) {
          console.error(
            `    Failed to upsert "${movie.title}":`,
            upsertError.message
          );
          totalFailed++;
          continue;
        }

        // Link genres
        if (movie.genres && movie.genres.length > 0 && upserted) {
          // Clear existing links
          await supabase
            .from("movie_genres")
            .delete()
            .eq("movie_id", upserted.id);

          const genreLinks = movie.genres
            .filter((g) => genreMap.has(g.id))
            .map((g) => ({
              movie_id: upserted.id,
              genre_id: genreMap.get(g.id)!,
            }));

          if (genreLinks.length > 0) {
            const { error: linkError } = await supabase
              .from("movie_genres")
              .insert(genreLinks);

            if (linkError) {
              console.error(
                `    Failed to link genres for "${movie.title}":`,
                linkError.message
              );
            }
          }
        }

        totalSeeded++;

        // Progress log every 20 movies
        if (totalSeeded % 20 === 0) {
          const rt = ratings?.rotten_tomatoes_score
            ? ` RT:${ratings.rotten_tomatoes_score}%`
            : "";
          const imdb = ratings?.imdb_rating
            ? ` IMDb:${ratings.imdb_rating}`
            : "";
          console.log(
            `    [${totalSeeded}] "${movie.title}" (${movie.release_date?.split("-")[0] || "?"})${imdb}${rt}`
          );
        }
      } catch (error) {
        console.error(`    Failed to process movie ${item.id}:`, error);
        totalFailed++;
      }
    }

    if (omdbCallCount >= MAX_OMDB_CALLS) {
      console.log(
        `\n  WARNING: OMDB daily limit approaching (${omdbCallCount} calls). Skipping remaining OMDB lookups.`
      );
    }
  }

  console.log(`\n--- Seed complete ---`);
  console.log(`  Movies seeded: ${totalSeeded}`);
  console.log(`  Movies failed: ${totalFailed}`);
  console.log(`  OMDB API calls: ${omdbCallCount}`);
}

// ===========================
// Main
// ===========================

async function main(): Promise<void> {
  console.log("========================================");
  console.log("  Flickpick Database Seed");
  console.log("========================================");
  console.log(`  TMDB API Key: ${TMDB_API_KEY?.slice(0, 4)}...`);
  console.log(`  OMDB API Key: ${OMDB_API_KEY?.slice(0, 4)}...`);
  console.log(`  Supabase URL: ${SUPABASE_URL}`);
  console.log(`  Target pages: ${TOTAL_PAGES} (~${TOTAL_PAGES * 20} movies)`);

  const startTime = Date.now();

  try {
    await seedGenres();
    await seedMovies();
  } catch (error) {
    console.error("\nFATAL ERROR:", error);
    process.exit(1);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n  Total time: ${elapsed}s`);
}

main();
