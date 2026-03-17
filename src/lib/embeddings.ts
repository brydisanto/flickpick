import OpenAI from "openai";

// ===========================
// OpenAI Client (lazy init)
// ===========================

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (_openai) return _openai;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }
  _openai = new OpenAI({ apiKey });
  return _openai;
}

// ===========================
// Types
// ===========================

export interface MovieEmbeddingInput {
  title: string;
  overview?: string | null;
  genres?: string[];
  cast?: string[];
  director?: string | null;
  keywords?: string[];
  release_year?: string | null;
  tagline?: string | null;
}

export interface RatedMovieForTaste {
  rating: number;
  embedding: number[];
}

// ===========================
// Embedding Generation
// ===========================

/**
 * Builds a descriptive text string from movie metadata, then generates
 * a 1536-dimension embedding via OpenAI text-embedding-3-small.
 */
export async function generateMovieEmbedding(
  movie: MovieEmbeddingInput
): Promise<number[]> {
  const parts: string[] = [];

  parts.push(`Title: ${movie.title}`);

  if (movie.tagline) {
    parts.push(`Tagline: ${movie.tagline}`);
  }

  if (movie.overview) {
    parts.push(`Overview: ${movie.overview}`);
  }

  if (movie.genres && movie.genres.length > 0) {
    parts.push(`Genres: ${movie.genres.join(", ")}`);
  }

  if (movie.director) {
    parts.push(`Director: ${movie.director}`);
  }

  if (movie.cast && movie.cast.length > 0) {
    parts.push(`Cast: ${movie.cast.slice(0, 10).join(", ")}`);
  }

  if (movie.keywords && movie.keywords.length > 0) {
    parts.push(`Keywords: ${movie.keywords.slice(0, 15).join(", ")}`);
  }

  if (movie.release_year) {
    parts.push(`Year: ${movie.release_year}`);
  }

  const text = parts.join("\n");

  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}

// ===========================
// Taste Profile Computation
// ===========================

/**
 * Rating-to-weight mapping. Higher-rated movies contribute more to the
 * taste profile. Negative ratings (1.0 and below) still participate
 * but with very low weight so the profile skews toward what the user likes.
 */
const RATING_WEIGHTS: Record<string, number> = {
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

function getRatingWeight(rating: number): number {
  // Round to nearest 0.5 and look up. Fallback to linear interpolation.
  const rounded = (Math.round(rating * 2) / 2).toString();
  return RATING_WEIGHTS[rounded] ?? Math.max(0.1, rating / 5 * 3);
}

/**
 * Computes a weighted average embedding from a user's rated movies.
 * Movies rated higher contribute more to the resulting taste vector.
 * The result is L2-normalized so cosine similarity works correctly with pgvector.
 */
export function generateTasteProfile(
  ratings: RatedMovieForTaste[]
): number[] | null {
  if (ratings.length === 0) return null;

  const dimensions = ratings[0].embedding.length;
  const result = new Array<number>(dimensions).fill(0);
  let totalWeight = 0;

  for (const item of ratings) {
    const weight = getRatingWeight(item.rating);
    totalWeight += weight;

    for (let i = 0; i < dimensions; i++) {
      result[i] += item.embedding[i] * weight;
    }
  }

  if (totalWeight === 0) return null;

  // Compute weighted average
  for (let i = 0; i < dimensions; i++) {
    result[i] /= totalWeight;
  }

  // L2 normalize for cosine similarity
  const magnitude = Math.sqrt(
    result.reduce((sum, val) => sum + val * val, 0)
  );

  if (magnitude === 0) return null;

  for (let i = 0; i < dimensions; i++) {
    result[i] /= magnitude;
  }

  return result;
}

// ===========================
// Cosine Similarity
// ===========================

/**
 * Computes cosine similarity between two vectors.
 * Returns a value between -1 and 1, where 1 means identical direction.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `Vector dimension mismatch: ${a.length} vs ${b.length}`
    );
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  const denominator = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

// ===========================
// Batch Helpers
// ===========================

/**
 * Generates embeddings for a batch of movies with rate limiting.
 * Processes in chunks of `batchSize` with a delay between chunks
 * to respect OpenAI rate limits.
 */
export async function generateEmbeddingsBatch(
  movies: MovieEmbeddingInput[],
  options: { batchSize?: number; delayMs?: number } = {}
): Promise<{ embedding: number[]; index: number }[]> {
  const { batchSize = 20, delayMs = 1000 } = options;
  const results: { embedding: number[]; index: number }[] = [];

  for (let i = 0; i < movies.length; i += batchSize) {
    const chunk = movies.slice(i, i + batchSize);

    const chunkResults = await Promise.all(
      chunk.map(async (movie, chunkIndex) => {
        try {
          const embedding = await generateMovieEmbedding(movie);
          return { embedding, index: i + chunkIndex };
        } catch (error) {
          console.error(
            `Failed to generate embedding for "${movie.title}":`,
            error
          );
          return null;
        }
      })
    );

    for (const result of chunkResults) {
      if (result) results.push(result);
    }

    // Delay between batches (skip after last batch)
    if (i + batchSize < movies.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
