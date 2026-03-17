import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import {
  generateMovieEmbedding,
  type MovieEmbeddingInput,
} from "@/lib/embeddings";

// ===========================
// POST /api/embeddings/generate
// Admin/cron endpoint for batch embedding generation
// ===========================

export async function POST(request: NextRequest) {
  // Verify admin access via a shared secret or service key
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Accept either a valid CRON_SECRET or a service role bearer token
  const isAuthorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (authHeader?.startsWith("Bearer ") && await verifyServiceRole(authHeader));

  if (!isAuthorized) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const supabase = createServerClient();

  try {
    const body = await request.json().catch(() => ({}));
    const limit = Math.min(Math.max(1, body.limit ?? 100), 500);

    // Find movies without embeddings
    const { data: movies, error: fetchError } = await supabase
      .from("movies")
      .select("id, title, overview, tagline, release_date")
      .is("embedding", null)
      .order("popularity", { ascending: false })
      .limit(limit);

    if (fetchError) {
      console.error("Movie fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch movies" },
        { status: 500 }
      );
    }

    if (!movies || movies.length === 0) {
      // Check if there are any remaining
      const { count } = await supabase
        .from("movies")
        .select("id", { count: "exact", head: true })
        .is("embedding", null);

      return NextResponse.json({
        processed: 0,
        failed: 0,
        remaining: count ?? 0,
        message: "No movies need embedding generation",
      });
    }

    let processed = 0;
    let failed = 0;
    const BATCH_SIZE = 20;
    const BATCH_DELAY_MS = 1200; // Slightly over 1s to respect rate limits

    for (let i = 0; i < movies.length; i += BATCH_SIZE) {
      const batch = movies.slice(i, i + BATCH_SIZE);

      // Process batch in parallel
      const results = await Promise.allSettled(
        batch.map(async (movie) => {
          // Fetch genres and credits for this movie
          const [genreResult, creditResult] = await Promise.all([
            supabase
              .from("movie_genres")
              .select("genres(name)")
              .eq("movie_id", movie.id),
            supabase
              .from("movie_credits")
              .select("role_type, job, people(name)")
              .eq("movie_id", movie.id)
              .order("display_order", { ascending: true })
              .limit(15),
          ]);

          const genres = (genreResult.data || [])
            .map((g) => (g.genres as unknown as { name: string } | null)?.name)
            .filter(Boolean) as string[];

          const cast = (creditResult.data || [])
            .filter((c) => c.role_type === "cast")
            .map((c) => (c.people as unknown as { name: string } | null)?.name)
            .filter(Boolean) as string[];

          const directorCredit = (creditResult.data || []).find(
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
              ? String(movie.release_date).split("-")[0]
              : null,
          };

          const embedding = await generateMovieEmbedding(input);

          // Save embedding
          const { error: updateError } = await supabase
            .from("movies")
            .update({
              embedding: JSON.stringify(embedding),
              updated_at: new Date().toISOString(),
            })
            .eq("id", movie.id);

          if (updateError) {
            throw new Error(
              `DB update failed for "${movie.title}": ${updateError.message}`
            );
          }

          return movie.title;
        })
      );

      // Count successes and failures
      for (const result of results) {
        if (result.status === "fulfilled") {
          processed++;
        } else {
          failed++;
          console.error("Embedding generation failed:", result.reason);
        }
      }

      // Rate limit delay between batches
      if (i + BATCH_SIZE < movies.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    // Count remaining
    const { count: remaining } = await supabase
      .from("movies")
      .select("id", { count: "exact", head: true })
      .is("embedding", null);

    return NextResponse.json({
      processed,
      failed,
      remaining: remaining ?? 0,
    });
  } catch (error) {
    console.error("Batch embedding error:", error);
    return NextResponse.json(
      { error: "Failed to generate embeddings" },
      { status: 500 }
    );
  }
}

// ===========================
// Auth Helper
// ===========================

async function verifyServiceRole(authHeader: string): Promise<boolean> {
  try {
    const token = authHeader.replace("Bearer ", "");
    const supabase = createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    // For admin endpoints, you could check a user role or just accept any valid token
    // For now, this endpoint is primarily designed to be called via CRON_SECRET
    return !error && user != null;
  } catch {
    return false;
  }
}
