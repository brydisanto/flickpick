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
  const { searchParams } = request.nextUrl;
  const movieId = searchParams.get("movie_id");
  const sort = searchParams.get("sort") || "recent";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
  const userId = searchParams.get("user_id");

  if (!movieId) {
    return NextResponse.json(
      { error: "movie_id query parameter is required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const offset = (page - 1) * limit;

  try {
    // Build query
    let query = supabase
      .from("reviews")
      .select(
        `
        id,
        user_id,
        movie_id,
        rating,
        review_text,
        contains_spoilers,
        like_count,
        created_at,
        updated_at,
        profiles!reviews_user_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `,
        { count: "exact" }
      )
      .eq("movie_id", movieId);

    // If filtering by specific user
    if (userId) {
      query = query.eq("user_id", userId);
    }

    // Sort
    switch (sort) {
      case "rating":
        query = query.order("rating", { ascending: false }).order("created_at", { ascending: false });
        break;
      case "likes":
        query = query.order("like_count", { ascending: false }).order("created_at", { ascending: false });
        break;
      case "recent":
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Reviews GET error:", error);
      return NextResponse.json(
        { error: "Failed to fetch reviews" },
        { status: 500 }
      );
    }

    // Transform: flatten the joined profile
    const reviews = (data || []).map((row) => {
      const profile = Array.isArray(row.profiles)
        ? row.profiles[0]
        : row.profiles;

      return {
        id: row.id,
        user_id: row.user_id,
        movie_id: row.movie_id,
        rating: row.rating,
        review_text: row.review_text,
        contains_spoilers: row.contains_spoilers,
        like_count: row.like_count,
        created_at: row.created_at,
        updated_at: row.updated_at,
        profile: profile || null,
      };
    });

    return NextResponse.json({
      reviews,
      total: count ?? 0,
      page,
    });
  } catch (error) {
    console.error("Reviews GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthenticatedClient(request);
  if (!auth) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { supabase, user } = auth;

  try {
    const body = await request.json();
    const { review_id } = body;

    if (!review_id || typeof review_id !== "string") {
      return NextResponse.json(
        { error: "review_id is required" },
        { status: 400 }
      );
    }

    // Only allow deleting own reviews
    const { data: review } = await supabase
      .from("reviews")
      .select("id, user_id")
      .eq("id", review_id)
      .single();

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (review.user_id !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", review_id);

    if (error) {
      console.error("Review delete error:", error);
      return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Review DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
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
    const { movie_id, rating, review_text, contains_spoilers } = body;

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

    // Validate review_text length
    if (review_text && typeof review_text === "string" && review_text.length > 5000) {
      return NextResponse.json(
        { error: "Review text must be 5000 characters or fewer" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("reviews")
      .upsert(
        {
          user_id: user.id,
          movie_id,
          rating: roundedRating,
          review_text: review_text?.trim() || null,
          contains_spoilers: contains_spoilers === true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,movie_id" }
      )
      .select(
        `
        id,
        user_id,
        movie_id,
        rating,
        review_text,
        contains_spoilers,
        like_count,
        created_at,
        updated_at,
        profiles!reviews_user_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `
      )
      .single();

    if (error) {
      console.error("Review upsert error:", error);
      return NextResponse.json(
        { error: "Failed to save review" },
        { status: 500 }
      );
    }

    const profile = Array.isArray(data.profiles)
      ? data.profiles[0]
      : data.profiles;

    return NextResponse.json({
      review: {
        id: data.id,
        user_id: data.user_id,
        movie_id: data.movie_id,
        rating: data.rating,
        review_text: data.review_text,
        contains_spoilers: data.contains_spoilers,
        like_count: data.like_count,
        created_at: data.created_at,
        updated_at: data.updated_at,
        profile: profile || null,
      },
    });
  } catch (error) {
    console.error("Review POST error:", error);
    return NextResponse.json(
      { error: "Failed to save review" },
      { status: 500 }
    );
  }
}
