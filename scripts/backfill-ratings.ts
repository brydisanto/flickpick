/**
 * Backfill external ratings (RT, IMDb, Metacritic) from OMDB for movies
 * in Supabase that are missing them.
 *
 * Usage: npx tsx scripts/backfill-ratings.ts
 *
 * Respects OMDB free tier (1,000 req/day) with a 1.5s delay between calls.
 * Safe to re-run — only touches movies with all three scores null.
 */

import { createClient } from "@supabase/supabase-js";

// Load .env.local
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("@next/env").loadEnvConfig(process.cwd());

const OMDB_API_KEY = process.env.OMDB_API_KEY || "";
const OMDB_BASE = "http://www.omdbapi.com";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface OMDBRating {
  Source: string;
  Value: string;
}

interface OMDBResponse {
  Title: string;
  imdbRating: string;
  imdbVotes: string;
  Metascore: string;
  Ratings: OMDBRating[];
  Response: "True" | "False";
  Error?: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!OMDB_API_KEY) {
    console.error("OMDB_API_KEY not set in .env.local");
    process.exit(1);
  }

  // Find movies missing all external ratings
  const { data: movies, error } = await supabase
    .from("movies")
    .select("id, tmdb_id, imdb_id, title, release_date")
    .is("rotten_tomatoes_score", null)
    .is("imdb_rating", null)
    .is("metacritic_score", null)
    .order("popularity", { ascending: false })
    .limit(500);

  if (error) {
    console.error("DB error:", error.message);
    process.exit(1);
  }

  console.log(`Found ${movies.length} movies missing external ratings.\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const movie of movies) {
    // Prefer IMDb ID lookup, fall back to title search
    let url: string;
    if (movie.imdb_id) {
      url = `${OMDB_BASE}/?i=${encodeURIComponent(movie.imdb_id)}&apikey=${OMDB_API_KEY}`;
    } else {
      const year = movie.release_date
        ? new Date(movie.release_date).getFullYear().toString()
        : "";
      url = `${OMDB_BASE}/?t=${encodeURIComponent(movie.title)}&apikey=${OMDB_API_KEY}`;
      if (year) url += `&y=${year}`;
    }

    try {
      const res = await fetch(url);
      const data: OMDBResponse = await res.json();

      if (data.Response === "False") {
        if (data.Error === "Request limit reached!") {
          console.log(`\n⚠ OMDB daily limit reached after ${updated} updates. Re-run tomorrow.`);
          break;
        }
        console.log(`  SKIP  ${movie.title} — ${data.Error}`);
        skipped++;
        await sleep(500);
        continue;
      }

      const updates: Record<string, unknown> = {};

      if (data.imdbRating && data.imdbRating !== "N/A") {
        updates.imdb_rating = parseFloat(data.imdbRating);
      }
      if (data.imdbVotes && data.imdbVotes !== "N/A") {
        updates.imdb_votes = parseInt(data.imdbVotes.replace(/,/g, ""), 10);
      }
      if (data.Metascore && data.Metascore !== "N/A") {
        updates.metacritic_score = parseInt(data.Metascore, 10);
      }
      const rt = data.Ratings?.find((r) => r.Source === "Rotten Tomatoes");
      if (rt) {
        updates.rotten_tomatoes_score = parseInt(rt.Value.replace("%", ""), 10);
      }

      if (Object.keys(updates).length === 0) {
        console.log(`  SKIP  ${movie.title} — no scores available`);
        skipped++;
      } else {
        updates.external_ratings_updated_at = new Date().toISOString();
        await supabase.from("movies").update(updates).eq("id", movie.id);
        console.log(
          `  ✓  ${movie.title} — RT:${updates.rotten_tomatoes_score ?? "-"} IMDb:${updates.imdb_rating ?? "-"} MC:${updates.metacritic_score ?? "-"}`
        );
        updated++;
      }
    } catch (err) {
      console.log(`  FAIL  ${movie.title} — ${err}`);
      failed++;
    }

    // Rate limit: ~1.5s between requests
    await sleep(1500);
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`);
}

main();
