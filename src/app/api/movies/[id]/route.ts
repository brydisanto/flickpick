import { NextRequest, NextResponse } from "next/server";
import { getMovieDetails, getMovieCredits } from "@/lib/tmdb";
import { fetchRatings } from "@/lib/omdb";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tmdbId = parseInt(id, 10);

  if (isNaN(tmdbId)) {
    return NextResponse.json(
      { error: "Invalid movie ID" },
      { status: 400 }
    );
  }

  try {
    const supabase = createServerClient();

    // Check Supabase cache first
    const { data: cachedMovie } = await supabase
      .from("movies")
      .select(
        `
        *,
        movie_genres!inner(genre_id, genres!inner(id, tmdb_id, name)),
        movie_credits(
          id, role_type, character_name, job, display_order,
          people(id, tmdb_id, name, profile_path, known_for_department)
        )
      `
      )
      .eq("tmdb_id", tmdbId)
      .single();

    if (cachedMovie) {
      // Backfill external ratings if missing
      const needsRatings =
        cachedMovie.imdb_rating == null &&
        cachedMovie.rotten_tomatoes_score == null &&
        cachedMovie.metacritic_score == null;

      if (needsRatings && cachedMovie.imdb_id) {
        const backfillRatings = await fetchRatings(cachedMovie.imdb_id);
        if (backfillRatings) {
          const updates: Record<string, unknown> = {};
          if (backfillRatings.imdb_rating != null) updates.imdb_rating = backfillRatings.imdb_rating;
          if (backfillRatings.imdb_votes != null) updates.imdb_votes = backfillRatings.imdb_votes;
          if (backfillRatings.rotten_tomatoes_score != null) updates.rotten_tomatoes_score = backfillRatings.rotten_tomatoes_score;
          if (backfillRatings.metacritic_score != null) updates.metacritic_score = backfillRatings.metacritic_score;
          if (Object.keys(updates).length > 0) {
            updates.external_ratings_updated_at = new Date().toISOString();
            await supabase.from("movies").update(updates).eq("id", cachedMovie.id);
            Object.assign(cachedMovie, updates);
          }
        }
      }

      const movie = formatCachedMovie(cachedMovie);
      return NextResponse.json({ movie });
    }

    // Not cached: fetch from TMDB
    const [tmdbMovie, tmdbCredits] = await Promise.all([
      getMovieDetails(tmdbId),
      getMovieCredits(tmdbId),
    ]);

    // Fetch OMDB ratings if we have an IMDb ID
    let ratings = null;
    if (tmdbMovie.imdb_id) {
      ratings = await fetchRatings(tmdbMovie.imdb_id);
    }

    // Upsert movie into Supabase
    const movieRow = {
      tmdb_id: tmdbMovie.id,
      imdb_id: tmdbMovie.imdb_id || null,
      title: tmdbMovie.title,
      original_title: tmdbMovie.original_title,
      release_date: tmdbMovie.release_date || null,
      runtime_minutes: tmdbMovie.runtime || null,
      overview: tmdbMovie.overview || null,
      tagline: tmdbMovie.tagline || null,
      poster_path: tmdbMovie.poster_path,
      backdrop_path: tmdbMovie.backdrop_path,
      original_language: tmdbMovie.original_language,
      popularity: tmdbMovie.popularity,
      imdb_rating: ratings?.imdb_rating ?? null,
      imdb_votes: ratings?.imdb_votes ?? null,
      rotten_tomatoes_score: ratings?.rotten_tomatoes_score ?? null,
      metacritic_score: ratings?.metacritic_score ?? null,
      external_ratings_updated_at: ratings ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const { data: upsertedMovie, error: upsertError } = await supabase
      .from("movies")
      .upsert(movieRow, { onConflict: "tmdb_id" })
      .select("id")
      .single();

    if (upsertError) {
      console.error("Movie upsert error:", upsertError);
      // Return the TMDB data directly if upsert fails
      return NextResponse.json({
        movie: buildMovieFromTmdb(tmdbMovie, tmdbCredits, ratings),
      });
    }

    const movieId = upsertedMovie.id;

    // Upsert genres and link them
    if (tmdbMovie.genres && tmdbMovie.genres.length > 0) {
      for (const genre of tmdbMovie.genres) {
        await supabase
          .from("genres")
          .upsert({ tmdb_id: genre.id, name: genre.name }, { onConflict: "tmdb_id" });
      }

      // Get genre records to link
      const { data: genreRows } = await supabase
        .from("genres")
        .select("id, tmdb_id")
        .in(
          "tmdb_id",
          tmdbMovie.genres.map((g) => g.id)
        );

      if (genreRows) {
        // Remove existing links and re-insert
        await supabase.from("movie_genres").delete().eq("movie_id", movieId);
        const links = genreRows.map((g) => ({
          movie_id: movieId,
          genre_id: g.id,
        }));
        await supabase.from("movie_genres").insert(links);
      }
    }

    // Upsert people and credits (top 15 cast + key crew)
    const topCast = tmdbCredits.cast.slice(0, 15);
    const keyCrew = tmdbCredits.crew.filter((c) =>
      ["Director", "Screenplay", "Writer", "Producer"].includes(c.job)
    );

    const allPeople = [
      ...topCast.map((c) => ({
        tmdb_id: c.id,
        name: c.name,
        profile_path: c.profile_path,
        known_for_department: c.known_for_department,
      })),
      ...keyCrew.map((c) => ({
        tmdb_id: c.id,
        name: c.name,
        profile_path: c.profile_path,
        known_for_department: c.known_for_department,
      })),
    ];

    // Deduplicate people by tmdb_id
    const uniquePeople = Array.from(
      new Map(allPeople.map((p) => [p.tmdb_id, p])).values()
    );

    for (const person of uniquePeople) {
      await supabase
        .from("people")
        .upsert(person, { onConflict: "tmdb_id" });
    }

    // Get person records for credit linking
    const { data: personRows } = await supabase
      .from("people")
      .select("id, tmdb_id")
      .in(
        "tmdb_id",
        uniquePeople.map((p) => p.tmdb_id)
      );

    if (personRows) {
      const personMap = new Map(personRows.map((p) => [p.tmdb_id, p.id]));

      // Remove existing credits and re-insert
      await supabase.from("movie_credits").delete().eq("movie_id", movieId);

      const creditRows = [
        ...topCast.map((c) => ({
          movie_id: movieId,
          person_id: personMap.get(c.id),
          role_type: "cast" as const,
          character_name: c.character,
          job: null,
          display_order: c.order,
        })),
        ...keyCrew.map((c) => ({
          movie_id: movieId,
          person_id: personMap.get(c.id),
          role_type: "crew" as const,
          character_name: null,
          job: c.job,
          display_order: null,
        })),
      ].filter((c) => c.person_id != null);

      if (creditRows.length > 0) {
        await supabase.from("movie_credits").insert(creditRows);
      }
    }

    // Return the fully constructed movie
    return NextResponse.json({
      movie: buildMovieFromTmdb(tmdbMovie, tmdbCredits, ratings),
    });
  } catch (error) {
    console.error("Movie detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch movie details" },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatCachedMovie(row: any) {
  const genres = (row.movie_genres || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mg: any) => mg.genres
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const credits = (row.movie_credits || []).map((mc: any) => ({
    id: mc.id,
    movie_id: row.id,
    person_id: mc.people?.id,
    role_type: mc.role_type,
    character_name: mc.character_name,
    job: mc.job,
    display_order: mc.display_order,
    person: mc.people || undefined,
  }));

  return {
    id: row.id,
    tmdb_id: row.tmdb_id,
    imdb_id: row.imdb_id,
    title: row.title,
    original_title: row.original_title,
    release_date: row.release_date,
    runtime_minutes: row.runtime_minutes,
    overview: row.overview,
    tagline: row.tagline,
    poster_path: row.poster_path,
    backdrop_path: row.backdrop_path,
    original_language: row.original_language,
    popularity: row.popularity,
    imdb_rating: row.imdb_rating,
    imdb_votes: row.imdb_votes,
    rotten_tomatoes_score: row.rotten_tomatoes_score,
    metacritic_score: row.metacritic_score,
    platform_avg_rating: row.platform_avg_rating,
    platform_rating_count: row.platform_rating_count,
    external_ratings_updated_at: row.external_ratings_updated_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    genres,
    credits,
  };
}

function buildMovieFromTmdb(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tmdb: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  credits: any,
  ratings: { imdb_rating: number | null; imdb_votes: number | null; rotten_tomatoes_score: number | null; metacritic_score: number | null } | null
) {
  return {
    tmdb_id: tmdb.id,
    imdb_id: tmdb.imdb_id,
    title: tmdb.title,
    original_title: tmdb.original_title,
    release_date: tmdb.release_date,
    runtime_minutes: tmdb.runtime,
    overview: tmdb.overview,
    tagline: tmdb.tagline,
    poster_path: tmdb.poster_path,
    backdrop_path: tmdb.backdrop_path,
    original_language: tmdb.original_language,
    popularity: tmdb.popularity,
    imdb_rating: ratings?.imdb_rating ?? null,
    imdb_votes: ratings?.imdb_votes ?? null,
    rotten_tomatoes_score: ratings?.rotten_tomatoes_score ?? null,
    metacritic_score: ratings?.metacritic_score ?? null,
    platform_avg_rating: null,
    platform_rating_count: 0,
    external_ratings_updated_at: ratings ? new Date().toISOString() : null,
    genres: tmdb.genres || [],
    credits: [
      ...credits.cast.slice(0, 15).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (c: any) => ({
          role_type: "cast",
          character_name: c.character,
          job: null,
          display_order: c.order,
          person: {
            tmdb_id: c.id,
            name: c.name,
            profile_path: c.profile_path,
            known_for_department: c.known_for_department,
          },
        })
      ),
      ...credits.crew
        .filter((c: { job: string }) =>
          ["Director", "Screenplay", "Writer", "Producer"].includes(c.job)
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((c: any) => ({
          role_type: "crew",
          character_name: null,
          job: c.job,
          display_order: null,
          person: {
            tmdb_id: c.id,
            name: c.name,
            profile_path: c.profile_path,
            known_for_department: c.known_for_department,
          },
        })),
    ],
  };
}
