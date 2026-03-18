"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Heart,
  ThumbsUp,
  Meh,
  ThumbsDown,
  Shuffle,
  ArrowRight,
  Loader2,
  SkipForward,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase";

// Rating values mapped to the review table's 1-10 scale
type RatingState = null | "loved" | "liked" | "meh" | "disliked";

const RATING_VALUES: Record<Exclude<RatingState, null>, number> = {
  loved: 10,
  liked: 7,
  meh: 5,
  disliked: 3,
};

const RATING_CYCLE: RatingState[] = [null, "loved", "liked", "meh", "disliked"];

interface CuratedMovie {
  tmdb_id: number;
  title: string;
  poster_path: string;
}

// Hardcoded curated set with TMDB poster paths
const CURATED_MOVIES: CuratedMovie[] = [
  { tmdb_id: 278, title: "The Shawshank Redemption", poster_path: "/9cjIGRnKoRKg6Mfxkz0D5MwGOOf.jpg" },
  { tmdb_id: 238, title: "The Godfather", poster_path: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg" },
  { tmdb_id: 680, title: "Pulp Fiction", poster_path: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg" },
  { tmdb_id: 155, title: "The Dark Knight", poster_path: "/qJ2tW6WMUDux911BTUgMe1nqVQ.jpg" },
  { tmdb_id: 550, title: "Fight Club", poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg" },
  { tmdb_id: 13, title: "Forrest Gump", poster_path: "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg" },
  { tmdb_id: 120, title: "The Lord of the Rings: The Fellowship of the Ring", poster_path: "/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg" },
  { tmdb_id: 240, title: "The Godfather Part II", poster_path: "/hek3koDUyRQq7FkGKL2V4owETd8.jpg" },
  { tmdb_id: 424, title: "Schindler's List", poster_path: "/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg" },
  { tmdb_id: 769, title: "GoodFellas", poster_path: "/aKuFiU82s5ISJDx4OD9dPhMRAGn.jpg" },
  { tmdb_id: 497, title: "The Green Mile", poster_path: "/8VG8fDNiy50H4FedGwdSVUPoaJe.jpg" },
  { tmdb_id: 346, title: "12 Angry Men", poster_path: "/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg" },
  { tmdb_id: 637, title: "Life Is Beautiful", poster_path: "/74hLDKjD5aGYOotO6esUVaeISa2.jpg" },
  { tmdb_id: 372058, title: "Your Name.", poster_path: "/q719jXXEzOoYaps6babgKnONONX.jpg" },
  { tmdb_id: 27205, title: "Inception", poster_path: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg" },
  { tmdb_id: 157336, title: "Interstellar", poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg" },
  { tmdb_id: 244786, title: "Whiplash", poster_path: "/7fn624j5lj3xTme2SgiLCeuedmO.jpg" },
  { tmdb_id: 298618, title: "The Mummy", poster_path: "/yhIsOpEhBMOEcfNMAFgcsYPbZhU.jpg" },
  { tmdb_id: 603, title: "The Matrix", poster_path: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg" },
  { tmdb_id: 129, title: "Spirited Away", poster_path: "/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg" },
  { tmdb_id: 429, title: "The Lord of the Rings: The Two Towers", poster_path: "/5VTN0pR8gcqV3EPUHHfMGnJYN9L.jpg" },
  { tmdb_id: 398818, title: "Call Me by Your Name", poster_path: "/nPTjj6ZfBXXBwOhd7iN3j5cBz1h.jpg" },
  { tmdb_id: 569094, title: "Spider-Man: Into the Spider-Verse", poster_path: "/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg" },
  { tmdb_id: 76341, title: "Mad Max: Fury Road", poster_path: "/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg" },
];

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function RatingIcon({ state }: { state: RatingState }) {
  switch (state) {
    case "loved":
      return <Heart size={20} className="fill-red-500 text-red-500" />;
    case "liked":
      return <ThumbsUp size={20} className="fill-gold text-gold" />;
    case "meh":
      return <Meh size={20} className="text-accent" />;
    case "disliked":
      return <ThumbsDown size={20} className="text-text-tertiary" />;
    default:
      return null;
  }
}

function ratingLabel(state: RatingState): string {
  switch (state) {
    case "loved":
      return "Loved";
    case "liked":
      return "Liked";
    case "meh":
      return "Meh";
    case "disliked":
      return "Disliked";
    default:
      return "Rate";
  }
}

function ratingBorderClass(state: RatingState): string {
  switch (state) {
    case "loved":
      return "ring-2 ring-red-500";
    case "liked":
      return "ring-2 ring-gold";
    case "meh":
      return "ring-2 ring-accent";
    case "disliked":
      return "ring-2 ring-text-tertiary";
    default:
      return "";
  }
}

const MIN_RATINGS = 5;

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [movies, setMovies] = useState<CuratedMovie[]>(CURATED_MOVIES);
  const [ratings, setRatings] = useState<Record<number, RatingState>>({});
  const [isSaving, setIsSaving] = useState(false);

  const ratedCount = useMemo(
    () => Object.values(ratings).filter((r) => r !== null).length,
    [ratings]
  );

  const canContinue = ratedCount >= MIN_RATINGS;

  const cycleRating = useCallback((tmdbId: number) => {
    setRatings((prev) => {
      const current = prev[tmdbId] ?? null;
      const currentIndex = RATING_CYCLE.indexOf(current);
      const nextIndex = (currentIndex + 1) % RATING_CYCLE.length;
      const next = RATING_CYCLE[nextIndex];
      if (next === null) {
        const { [tmdbId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [tmdbId]: next };
    });
  }, []);

  const handleShuffle = useCallback(() => {
    setMovies((prev) => shuffleArray(prev));
  }, []);

  const handleSave = useCallback(async () => {
    if (!user) {
      router.replace("/");
      return;
    }

    setIsSaving(true);

    try {
      const supabase = getSupabase();

      // First, look up movie UUIDs from tmdb_ids, or insert them
      const ratedEntries = Object.entries(ratings).filter(
        ([, state]) => state !== null
      );

      for (const [tmdbIdStr, state] of ratedEntries) {
        const tmdbId = parseInt(tmdbIdStr, 10);
        const movie = CURATED_MOVIES.find((m) => m.tmdb_id === tmdbId);
        if (!movie || !state) continue;

        // Find the movie in our DB
        let { data: dbMovie } = await supabase
          .from("movies")
          .select("id")
          .eq("tmdb_id", tmdbId)
          .single();

        // If movie doesn't exist yet, create a stub
        if (!dbMovie) {
          const { data: insertedMovie } = await supabase
            .from("movies")
            .insert({
              tmdb_id: tmdbId,
              title: movie.title,
              poster_path: movie.poster_path,
            })
            .select("id")
            .single();
          dbMovie = insertedMovie;
        }

        if (!dbMovie) continue;

        // Upsert the rating as a review
        await supabase.from("reviews").upsert(
          {
            user_id: user.id,
            movie_id: dbMovie.id,
            rating: RATING_VALUES[state],
          },
          { onConflict: "user_id,movie_id" }
        );
      }

      router.replace("/");
    } catch (err) {
      console.error("Error saving onboarding ratings:", err);
      setIsSaving(false);
    }
  }, [ratings, user, router]);

  const handleSkip = useCallback(() => {
    router.replace("/");
  }, [router]);

  const remaining = Math.max(0, MIN_RATINGS - ratedCount);
  const progressPercent = Math.min(100, (ratedCount / MIN_RATINGS) * 100);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
          Rate movies to train your taste profile
        </h1>
        <p className="text-text-secondary text-sm sm:text-base max-w-lg mx-auto">
          Tap a poster to rate it. We&apos;ll use your ratings to recommend
          movies you&apos;ll love.
        </p>
      </div>

      {/* Progress */}
      <div className="max-w-md mx-auto mb-8">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-text-secondary">
            <span className="font-semibold text-text-primary">{ratedCount}</span>{" "}
            rated
          </span>
          <span className="text-text-tertiary">
            {canContinue
              ? "Ready for recommendations!"
              : `Rate ${remaining} more for your first recommendations`}
          </span>
        </div>
        <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-gold rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Movie grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
        {movies.map((movie) => {
          const rating = ratings[movie.tmdb_id] ?? null;
          return (
            <button
              key={movie.tmdb_id}
              onClick={() => cycleRating(movie.tmdb_id)}
              className={`group relative rounded-[var(--radius-lg)] overflow-hidden bg-bg-tertiary aspect-[2/3] transition-all duration-200 hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-gold/50 ${ratingBorderClass(rating)}`}
              aria-label={`${movie.title} - ${ratingLabel(rating)}`}
            >
              <Image
                src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
                alt={movie.title}
                fill
                sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 16vw"
                className="object-cover"
              />

              {/* Overlay with rating state */}
              {rating && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1">
                  <RatingIcon state={rating} />
                  <span className="text-white text-xs font-medium">
                    {ratingLabel(rating)}
                  </span>
                </div>
              )}

              {/* Hover hint when unrated */}
              {!rating && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                  <div className="w-full p-2 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-white text-xs font-medium truncate">
                      {movie.title}
                    </p>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
        <button
          onClick={handleShuffle}
          className="flex items-center gap-2 px-5 h-10 rounded-full border border-border-subtle bg-bg-elevated text-text-secondary hover:text-text-primary hover:border-border text-sm font-medium transition-colors"
        >
          <Shuffle size={16} />
          Show me different movies
        </button>

        <button
          onClick={handleSave}
          disabled={!canContinue || isSaving}
          className="flex items-center gap-2 px-6 h-10 rounded-full bg-gold hover:bg-gold-hover text-bg-primary text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Continue
              <ArrowRight size={16} />
            </>
          )}
        </button>

        <button
          onClick={handleSkip}
          className="flex items-center gap-2 px-4 h-10 text-text-tertiary hover:text-text-secondary text-sm transition-colors"
        >
          <SkipForward size={14} />
          Skip for now
        </button>
      </div>
    </div>
  );
}
