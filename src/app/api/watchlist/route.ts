import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

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

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedClient(request);
  if (!auth) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { supabase, user } = auth;
  const movieId = request.nextUrl.searchParams.get("movie_id");

  try {
    // If movie_id is provided, just check if it's in the watchlist (lightweight)
    if (movieId) {
      const { data } = await supabase
        .from("watchlist")
        .select("movie_id")
        .eq("user_id", user.id)
        .eq("movie_id", movieId)
        .maybeSingle();

      return NextResponse.json({ in_watchlist: !!data });
    }

    const { data, error } = await supabase
      .from("watchlist")
      .select(
        `
        movie_id,
        added_at,
        movies(
          id, tmdb_id, imdb_id, title, original_title, release_date,
          runtime_minutes, overview, poster_path, backdrop_path,
          popularity, imdb_rating, rotten_tomatoes_score, metacritic_score,
          platform_avg_rating, platform_rating_count
        )
      `
      )
      .eq("user_id", user.id)
      .order("added_at", { ascending: false });

    if (error) {
      console.error("Watchlist GET error:", error);
      return NextResponse.json(
        { error: "Failed to fetch watchlist" },
        { status: 500 }
      );
    }

    const items = (data || []).map((row) => ({
      movie_id: row.movie_id,
      added_at: row.added_at,
      movie: row.movies,
    }));

    return NextResponse.json({ watchlist: items });
  } catch (error) {
    console.error("Watchlist GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch watchlist" },
      { status: 500 }
    );
  }
}

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
    const body = await request.json();
    const { movie_id } = body;

    if (!movie_id || typeof movie_id !== "string") {
      return NextResponse.json(
        { error: "movie_id is required and must be a string (UUID)" },
        { status: 400 }
      );
    }

    // Verify the movie exists
    const { data: movieExists } = await supabase
      .from("movies")
      .select("id")
      .eq("id", movie_id)
      .single();

    if (!movieExists) {
      return NextResponse.json(
        { error: "Movie not found" },
        { status: 404 }
      );
    }

    const { error } = await supabase.from("watchlist").upsert(
      {
        user_id: user.id,
        movie_id,
        added_at: new Date().toISOString(),
      },
      { onConflict: "user_id,movie_id" }
    );

    if (error) {
      console.error("Watchlist POST error:", error);
      return NextResponse.json(
        { error: "Failed to add to watchlist" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, movie_id });
  } catch (error) {
    console.error("Watchlist POST error:", error);
    return NextResponse.json(
      { error: "Failed to add to watchlist" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthenticatedClient(request);
  if (!auth) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { supabase, user } = auth;

  try {
    const body = await request.json();
    const { movie_id } = body;

    if (!movie_id || typeof movie_id !== "string") {
      return NextResponse.json(
        { error: "movie_id is required and must be a string (UUID)" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("watchlist")
      .delete()
      .eq("user_id", user.id)
      .eq("movie_id", movie_id);

    if (error) {
      console.error("Watchlist DELETE error:", error);
      return NextResponse.json(
        { error: "Failed to remove from watchlist" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, movie_id });
  } catch (error) {
    console.error("Watchlist DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to remove from watchlist" },
      { status: 500 }
    );
  }
}
