"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  RefreshCw,
  Bookmark,
  Star,
  Sparkles,
  TrendingUp,
  User,
  Loader2,
} from "lucide-react";
import {
  getTmdbImageUrl,
  computeAggregateScore,
  getScoreLevel,
} from "@/types";
import type { Movie } from "@/types";
import { useAuth } from "@/lib/auth-context";

// ===========================
// Types
// ===========================

interface PersonalRecResult {
  movie: Movie;
  score: number;
  explanation: string;
  match_type: "taste";
  similarity: number;
  rank: number;
}

interface PersonalResponse {
  results: PersonalRecResult[];
  message?: string;
  profile_strength: "none" | "getting_started" | "taking_shape" | "strong" | "cinephile";
  taste_updated_at?: string;
  movies_rated?: number;
}

type ProfileStrength = PersonalResponse["profile_strength"];

// ===========================
// Constants
// ===========================

const SCORE_COLORS: Record<string, string> = {
  high: "bg-score-high text-white",
  good: "bg-score-good text-white",
  mixed: "bg-score-mixed text-black",
  low: "bg-score-low text-white",
};

const STRENGTH_CONFIG: Record<
  ProfileStrength,
  { label: string; color: string; description: string; percent: number }
> = {
  none: {
    label: "No Profile",
    color: "bg-gray-500",
    description: "Rate movies to build your taste profile",
    percent: 0,
  },
  getting_started: {
    label: "Getting Started",
    color: "bg-orange-500",
    description: "Rate a few more movies to improve recommendations",
    percent: 25,
  },
  taking_shape: {
    label: "Taking Shape",
    color: "bg-yellow-500",
    description: "Your taste profile is forming. Keep rating!",
    percent: 50,
  },
  strong: {
    label: "Strong",
    color: "bg-green-500",
    description: "Great profile! Your recommendations are dialed in",
    percent: 75,
  },
  cinephile: {
    label: "Cinephile",
    color: "bg-gold",
    description: "Expert-level taste profile with excellent recommendations",
    percent: 100,
  },
};

// ===========================
// Components
// ===========================

function SkeletonCard() {
  return (
    <div className="bg-bg-elevated rounded-[var(--radius-lg)] border border-border-subtle overflow-hidden animate-pulse">
      <div className="flex flex-col sm:flex-row">
        <div className="w-full sm:w-32 md:w-40 aspect-[2/3] sm:aspect-auto sm:h-52 bg-bg-tertiary" />
        <div className="flex-1 p-4 sm:p-5 space-y-3">
          <div className="h-5 bg-bg-tertiary rounded w-3/4" />
          <div className="h-4 bg-bg-tertiary rounded w-1/3" />
          <div className="h-3 bg-bg-tertiary rounded w-full" />
          <div className="h-3 bg-bg-tertiary rounded w-2/3" />
          <div className="h-8 bg-bg-tertiary rounded w-24 mt-4" />
        </div>
      </div>
    </div>
  );
}

function TasteStrengthIndicator({
  strength,
  moviesRated,
}: {
  strength: ProfileStrength;
  moviesRated: number;
}) {
  const config = STRENGTH_CONFIG[strength];

  return (
    <div className="bg-bg-elevated rounded-[var(--radius-lg)] border border-border-subtle p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center">
          <User size={20} className="text-text-secondary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            Taste Profile: {config.label}
          </h3>
          <p className="text-xs text-text-secondary">
            {moviesRated} movie{moviesRated !== 1 ? "s" : ""} rated
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${config.color}`}
          style={{ width: `${config.percent}%` }}
        />
      </div>
      <p className="text-xs text-text-tertiary">{config.description}</p>
    </div>
  );
}

function EmptyState({ strength }: { strength: ProfileStrength }) {
  const isNoProfile = strength === "none";

  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-bg-tertiary flex items-center justify-center">
        <Sparkles size={28} className="text-text-tertiary" />
      </div>
      <h2 className="text-xl font-bold text-text-primary mb-2">
        {isNoProfile
          ? "Build Your Taste Profile"
          : "Not Enough Data Yet"}
      </h2>
      <p className="text-text-secondary max-w-md mx-auto mb-8">
        {isNoProfile
          ? "Rate at least 5 movies so we can learn what you love and recommend films tailored to your taste."
          : "Rate a few more movies to unlock personalized recommendations. The more you rate, the better they get."}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/search?q=popular"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-bg-primary rounded-full font-medium hover:bg-gold-hover transition-colors"
        >
          <Star size={18} />
          Rate Movies
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 border border-border text-text-secondary rounded-full font-medium hover:text-text-primary hover:border-border-color transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Discover
        </Link>
      </div>
    </div>
  );
}

function UnauthenticatedState() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-bg-tertiary flex items-center justify-center">
        <User size={28} className="text-text-tertiary" />
      </div>
      <h2 className="text-xl font-bold text-text-primary mb-2">
        Sign In Required
      </h2>
      <p className="text-text-secondary max-w-md mx-auto mb-8">
        Create a free account to get AI-powered movie recommendations
        personalized to your taste.
      </p>
      <Link
        href="/auth/signin"
        className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-bg-primary rounded-full font-medium hover:bg-gold-hover transition-colors"
      >
        Sign In
      </Link>
    </div>
  );
}

// ===========================
// Main Page
// ===========================

export default function ForYouPage() {
  const { user, isLoading: authLoading, getAccessToken } = useAuth();
  const [results, setResults] = useState<PersonalRecResult[]>([]);
  const [profileStrength, setProfileStrength] = useState<ProfileStrength>("none");
  const [moviesRated, setMoviesRated] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(
    async (showRefreshing = false) => {
      const token = await getAccessToken();
      if (!token) return;

      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const res = await fetch("/api/recommend/personal", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        const data: PersonalResponse = await res.json();

        setResults(data.results);
        setProfileStrength(data.profile_strength);
        setMoviesRated(data.movies_rated ?? 0);
        setMessage(data.message ?? null);
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load recommendations"
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [getAccessToken]
  );

  const handleRefreshTaste = async () => {
    const token = await getAccessToken();
    if (!token) return;
    setIsRefreshing(true);

    try {
      // First update the taste profile
      const updateRes = await fetch("/api/taste/update", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!updateRes.ok) {
        const data = await updateRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update taste profile");
      }

      // Then fetch fresh recommendations
      await fetchRecommendations(true);
    } catch (err) {
      console.error("Taste refresh error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to refresh"
      );
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchRecommendations();
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }
  }, [authLoading, user, fetchRecommendations]);

  // ===========================
  // Render States
  // ===========================

  // Auth loading
  if (authLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <UnauthenticatedState />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={20} className="text-gold" />
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
              For You
            </h1>
          </div>
          <p className="text-text-secondary">
            Personalized picks based on your ratings
          </p>
        </div>
        <button
          onClick={handleRefreshTaste}
          disabled={isRefreshing || isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium text-text-secondary hover:text-text-primary hover:border-border-color transition-colors disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={isRefreshing ? "animate-spin" : ""}
          />
          {isRefreshing ? "Updating..." : "Refresh"}
        </button>
      </div>

      {/* Taste Profile Strength */}
      <div className="mb-8">
        <TasteStrengthIndicator
          strength={profileStrength}
          moviesRated={moviesRated}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-[var(--radius-md)] text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty / Message States */}
      {!isLoading && results.length === 0 && (
        <EmptyState strength={profileStrength} />
      )}

      {/* Results */}
      {!isLoading && results.length > 0 && (
        <>
          <div className="space-y-4">
            {results.map((rec, idx) => {
              const aggregate = computeAggregateScore(rec.movie);
              const level = aggregate ? getScoreLevel(aggregate) : null;

              return (
                <Link
                  key={rec.movie.id || rec.movie.tmdb_id || idx}
                  href={`/movie/${rec.movie.tmdb_id}`}
                  className="group block bg-bg-elevated rounded-[var(--radius-lg)] border border-border-subtle hover:border-border hover:shadow-[var(--shadow-md)] transition-all overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* Poster */}
                    <div className="relative w-full sm:w-32 md:w-40 aspect-[2/3] sm:aspect-auto sm:h-auto shrink-0 bg-bg-tertiary">
                      <Image
                        src={getTmdbImageUrl(rec.movie.poster_path, "w500")}
                        alt={`${rec.movie.title} poster`}
                        fill
                        sizes="(max-width: 640px) 100vw, 160px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* Rank badge */}
                      <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-gold/90 backdrop-blur-sm flex items-center justify-center">
                        <span className="text-bg-primary text-sm font-bold">
                          {idx + 1}
                        </span>
                      </div>
                      {/* Match score */}
                      <div className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-black/70 backdrop-blur-sm flex items-center gap-1">
                        <TrendingUp size={12} className="text-green-400" />
                        <span className="text-white text-xs font-medium">
                          {rec.score}% match
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 sm:p-5 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-semibold text-text-primary group-hover:text-gold transition-colors">
                            {rec.movie.title}
                          </h2>
                          <div className="flex items-center gap-2 mt-0.5 text-sm text-text-secondary">
                            {rec.movie.release_date && (
                              <span>
                                {new Date(
                                  rec.movie.release_date
                                ).getFullYear()}
                              </span>
                            )}
                            {rec.movie.runtime_minutes && (
                              <>
                                <span className="text-text-tertiary">
                                  &#183;
                                </span>
                                <span>{rec.movie.runtime_minutes}m</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Aggregate Score */}
                        {aggregate && level && (
                          <div
                            className={`shrink-0 px-3 py-1.5 rounded-[var(--radius-sm)] text-sm font-bold ${SCORE_COLORS[level]}`}
                          >
                            {aggregate}%
                          </div>
                        )}
                      </div>

                      {/* Source Score Breakdown */}
                      <div className="flex flex-wrap gap-2">
                        {rec.movie.rotten_tomatoes_score != null && (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-sm)] text-xs font-semibold"
                            style={{
                              backgroundColor: `color-mix(in srgb, var(--brand-rt) 12%, transparent)`,
                              color: `var(--brand-rt)`,
                            }}
                          >
                            RT
                            <span className="font-bold">{rec.movie.rotten_tomatoes_score}%</span>
                          </span>
                        )}
                        {rec.movie.imdb_rating != null && (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-sm)] text-xs font-semibold"
                            style={{
                              backgroundColor: `color-mix(in srgb, var(--brand-imdb) 12%, transparent)`,
                              color: `var(--brand-imdb-text)`,
                            }}
                          >
                            IMDb
                            <span className="font-bold">{rec.movie.imdb_rating}</span>
                          </span>
                        )}
                        {rec.movie.metacritic_score != null && (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-sm)] text-xs font-semibold"
                            style={{
                              backgroundColor: `color-mix(in srgb, var(--brand-mc) 12%, transparent)`,
                              color: `var(--brand-mc)`,
                            }}
                          >
                            MC
                            <span className="font-bold">{rec.movie.metacritic_score}</span>
                          </span>
                        )}
                      </div>

                      {/* Explanation */}
                      <p className="text-sm text-text-secondary italic leading-relaxed border-t border-border-subtle pt-3">
                        &ldquo;{rec.explanation}&rdquo;
                      </p>

                      {/* Actions */}
                      <div className="flex gap-2 mt-auto pt-1">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-bg-tertiary text-text-secondary hover:text-gold hover:bg-gold-hover transition-colors"
                        >
                          <Bookmark size={14} />
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Rate more CTA for weak profiles */}
          {(profileStrength === "getting_started" ||
            profileStrength === "taking_shape") && (
            <div className="mt-8 text-center p-6 bg-bg-elevated rounded-[var(--radius-lg)] border border-border-subtle">
              <TrendingUp
                size={24}
                className="mx-auto mb-3 text-gold"
              />
              <h3 className="text-base font-semibold text-text-primary mb-1">
                Rate more movies to improve recommendations
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                {profileStrength === "getting_started"
                  ? `You've rated ${moviesRated} movie${moviesRated !== 1 ? "s" : ""}. Rate at least 5 to see real improvements.`
                  : `${moviesRated} movies rated. Getting to 15+ will make your recommendations much sharper.`}
              </p>
              <Link
                href="/search?q=popular"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-bg-primary rounded-full text-sm font-medium hover:bg-gold-hover transition-colors"
              >
                <Star size={16} />
                Rate Movies
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
