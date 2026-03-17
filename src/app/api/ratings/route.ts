import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

function getUserIdFromRequest(request: NextRequest): string | null {
  // Extract user ID from Authorization header (Bearer token -> Supabase JWT)
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader; // We'll use the full header to create an authenticated client
}

async function getAuthenticatedClient(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createServerClient();

  // Verify the JWT and get the user
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;

  return { supabase, user };
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
    const { movie_id, rating } = body;

    if (!movie_id || typeof movie_id !== "string") {
      return NextResponse.json(
        { error: "movie_id is required and must be a string (UUID)" },
        { status: 400 }
      );
    }

    if (typeof rating !== "number" || rating < 0.5 || rating > 5.0) {
      return NextResponse.json(
        { error: "rating must be a number between 0.5 and 5.0" },
        { status: 400 }
      );
    }

    // Round to nearest 0.5
    const roundedRating = Math.round(rating * 2) / 2;

    const { data, error } = await supabase
      .from("reviews")
      .upsert(
        {
          user_id: user.id,
          movie_id,
          rating: roundedRating,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,movie_id" }
      )
      .select("id, rating, created_at, updated_at")
      .single();

    if (error) {
      console.error("Rating upsert error:", error);
      return NextResponse.json(
        { error: "Failed to save rating" },
        { status: 500 }
      );
    }

    return NextResponse.json({ rating: data });
  } catch (error) {
    console.error("Rating POST error:", error);
    return NextResponse.json(
      { error: "Failed to save rating" },
      { status: 500 }
    );
  }
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

  if (!movieId) {
    return NextResponse.json(
      { error: "movie_id query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("id, rating, review_text, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("movie_id", movieId)
      .maybeSingle();

    if (error) {
      console.error("Rating GET error:", error);
      return NextResponse.json(
        { error: "Failed to fetch rating" },
        { status: 500 }
      );
    }

    return NextResponse.json({ rating: data });
  } catch (error) {
    console.error("Rating GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch rating" },
      { status: 500 }
    );
  }
}
