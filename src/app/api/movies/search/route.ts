import { NextRequest, NextResponse } from "next/server";
import { searchMovies } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");

  if (!q || q.trim().length === 0) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  if (q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const data = await searchMovies(q.trim());

    const results = data.results.slice(0, 10).map((movie) => ({
      tmdb_id: movie.id,
      title: movie.title,
      year: movie.release_date ? movie.release_date.split("-")[0] : null,
      poster_path: movie.poster_path,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Movie search error:", error);
    return NextResponse.json(
      { error: "Failed to search movies" },
      { status: 500 }
    );
  }
}
