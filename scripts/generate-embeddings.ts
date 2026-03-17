/**
 * Flickpick Embedding Generation Script
 *
 * Generates OpenAI text-embedding-3-small embeddings for all movies
 * in the database that don't have one yet.
 *
 * Rate limits:
 *   OpenAI: ~3000 RPM for text-embedding-3-small (we stay well under)
 *   Processes in batches of 20 with 1.2s delay between batches
 *
 * Run with: npx tsx scripts/generate-embeddings.ts
 */

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// ===========================
// Configuration
// ===========================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
  );
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error("ERROR: OPENAI_API_KEY environment variable is required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 1200;
const PAGE_SIZE = 100;

// ===========================
// Types
// ===========================

interface MovieRow {
  id: string;
  title: string;
  overview: string | null;
  tagline: string | null;
  release_date: string | null;
}

interface MovieEmbeddingInput {
  title: string;
  overview?: string | null;
  tagline?: string | null;
  genres?: string[];
  cast?: string[];
  director?: string | null;
  release_year?: string | null;
}

// ===========================
// Helpers
// ===========================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildEmbeddingText(input: MovieEmbeddingInput): string {
  const parts: string[] = [];

  parts.push(`Title: ${input.title}`);

  if (input.tagline) {
    parts.push(`Tagline: ${input.tagline}`);
  }

  if (input.overview) {
    parts.push(`Overview: ${input.overview}`);
  }

  if (input.genres && input.genres.length > 0) {
    parts.push(`Genres: ${input.genres.join(", ")}`);
  }

  if (input.director) {
    parts.push(`Director: ${input.director}`);
  }

  if (input.cast && input.cast.length > 0) {
    parts.push(`Cast: ${input.cast.slice(0, 10).join(", ")}`);
  }

  if (input.release_year) {
    parts.push(`Year: ${input.release_year}`);
  }

  return parts.join("\n");
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

async function fetchMovieMetadata(
  movie: MovieRow
): Promise<MovieEmbeddingInput> {
  // Fetch genres
  const { data: genreData } = await supabase
    .from("movie_genres")
    .select("genres(name)")
    .eq("movie_id", movie.id);

  const genres = (genreData || [])
    .map((g) => (g.genres as unknown as { name: string } | null)?.name)
    .filter(Boolean) as string[];

  // Fetch credits (top cast + director)
  const { data: creditData } = await supabase
    .from("movie_credits")
    .select("role_type, job, people(name)")
    .eq("movie_id", movie.id)
    .order("display_order", { ascending: true })
    .limit(15);

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

  return {
    title: movie.title,
    overview: movie.overview,
    tagline: movie.tagline,
    genres,
    cast,
    director,
    release_year: movie.release_date
      ? String(movie.release_date).split("-")[0]
      : null,
  };
}

// ===========================
// Main
// ===========================

async function main(): Promise<void> {
  console.log("========================================");
  console.log("  Flickpick Embedding Generation");
  console.log("========================================");
  console.log(`  OpenAI API Key: ${OPENAI_API_KEY?.slice(0, 8)}...`);
  console.log(`  Supabase URL: ${SUPABASE_URL}`);
  console.log(`  Batch size: ${BATCH_SIZE}`);
  console.log(`  Batch delay: ${BATCH_DELAY_MS}ms`);
  console.log("");

  const startTime = Date.now();

  // Count total movies needing embeddings
  const { count: totalRemaining } = await supabase
    .from("movies")
    .select("id", { count: "exact", head: true })
    .is("embedding", null);

  const { count: totalMovies } = await supabase
    .from("movies")
    .select("id", { count: "exact", head: true });

  console.log(`  Total movies in database: ${totalMovies ?? "?"}`);
  console.log(`  Movies needing embeddings: ${totalRemaining ?? "?"}`);
  console.log("");

  if (!totalRemaining || totalRemaining === 0) {
    console.log("  All movies already have embeddings. Nothing to do.");
    return;
  }

  let totalProcessed = 0;
  let totalFailed = 0;
  let hasMore = true;

  while (hasMore) {
    // Fetch a page of movies without embeddings
    const { data: movies, error: fetchError } = await supabase
      .from("movies")
      .select("id, title, overview, tagline, release_date")
      .is("embedding", null)
      .order("popularity", { ascending: false })
      .limit(PAGE_SIZE);

    if (fetchError) {
      console.error("  Failed to fetch movies:", fetchError.message);
      break;
    }

    if (!movies || movies.length === 0) {
      hasMore = false;
      break;
    }

    console.log(
      `\n  Processing batch of ${movies.length} movies (${totalProcessed} done so far)...`
    );

    // Process in sub-batches for rate limiting
    for (let i = 0; i < movies.length; i += BATCH_SIZE) {
      const batch = movies.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (movie) => {
          const metadata = await fetchMovieMetadata(movie);
          const text = buildEmbeddingText(metadata);
          const embedding = await generateEmbedding(text);

          const { error: updateError } = await supabase
            .from("movies")
            .update({
              embedding: JSON.stringify(embedding),
              updated_at: new Date().toISOString(),
            })
            .eq("id", movie.id);

          if (updateError) {
            throw new Error(
              `DB update for "${movie.title}": ${updateError.message}`
            );
          }

          return movie.title;
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          totalProcessed++;
        } else {
          totalFailed++;
          console.error(`    FAILED: ${result.reason}`);
        }
      }

      // Progress log
      const batchEnd = Math.min(i + BATCH_SIZE, movies.length);
      const lastMovie = batch[batch.length - 1];
      console.log(
        `    [${totalProcessed}/${totalRemaining}] Processed ${batchEnd}/${movies.length} in page | Last: "${lastMovie.title}"`
      );

      // Rate limit delay between sub-batches
      if (i + BATCH_SIZE < movies.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    // Delay between pages
    await sleep(BATCH_DELAY_MS);

    // Safety check: if this page had fewer than PAGE_SIZE, we're done
    if (movies.length < PAGE_SIZE) {
      hasMore = false;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n========================================");
  console.log("  Embedding Generation Complete");
  console.log("========================================");
  console.log(`  Processed: ${totalProcessed}`);
  console.log(`  Failed: ${totalFailed}`);
  console.log(`  Total time: ${elapsed}s`);
  console.log(
    `  Avg per movie: ${totalProcessed > 0 ? ((Date.now() - startTime) / totalProcessed / 1000).toFixed(2) : 0}s`
  );
}

main().catch((error) => {
  console.error("\nFATAL ERROR:", error);
  process.exit(1);
});
