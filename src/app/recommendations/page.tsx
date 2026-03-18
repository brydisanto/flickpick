"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, RefreshCw, Bookmark, ThumbsUp, ThumbsDown } from "lucide-react";
import { getTmdbImageUrl, computeAggregateScore, getScoreLevel } from "@/types";
import type { Movie } from "@/types";

interface RecResult {
  movie: Movie;
  score: number;
  explanation: string;
}

const SCORE_COLORS: Record<string, string> = {
  high: "bg-score-high text-white",
  good: "bg-score-good text-white",
  mixed: "bg-score-mixed text-black",
  low: "bg-score-low text-white",
};

export default function RecommendationsPage() {
  const router = useRouter();
  const [results, setResults] = useState<RecResult[]>([]);
  const [input, setInput] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    const stored = sessionStorage.getItem("flickpick_results");
    const storedInput = sessionStorage.getItem("flickpick_input");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as RecResult[];
        setResults(parsed);
        // Stagger reveal cards
        parsed.forEach((_, idx) => {
          setTimeout(() => {
            setRevealedCount((prev) => Math.max(prev, idx + 1));
          }, idx * 250);
        });
      } catch {
        // ignore
      }
    }
    if (storedInput) {
      try {
        setInput(JSON.parse(storedInput));
      } catch {
        // ignore
      }
    }
  }, []);

  const handleRefresh = async () => {
    if (!input) return;
    setIsLoading(true);
    setRevealedCount(0);
    try {
      const res = await fetch("/api/recommend/instant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const newResults = data.results as RecResult[];
      setResults(newResults);
      sessionStorage.setItem("flickpick_results", JSON.stringify(newResults));
      // Stagger reveal
      newResults.forEach((_, idx) => {
        setTimeout(() => {
          setRevealedCount((prev) => Math.max(prev, idx + 1));
        }, idx * 250);
      });
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  // Determine pre-reveal line based on input mode
  const getPreRevealLine = () => {
    if (!input) return null;
    if (input.seeds) return "Based on your picks, here\u2019s what you\u2019re missing...";
    if (input.mood) {
      const moodLabel = String(input.mood).replace(/-/g, " ");
      return `Your ${moodLabel} lineup is ready.`;
    }
    if (input.natural_language) return String(input.natural_language);
    return null;
  };

  if (results.length === 0 && !isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-4">
          We searched every reel. Nothing here yet.
        </h1>
        <p className="text-text-secondary mb-8">
          Head back and tell us what you&apos;re in the mood for.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-bg-primary rounded-[var(--radius-lg)] font-medium hover:bg-gold-hover transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Discover
        </Link>
      </div>
    );
  }

  const preRevealLine = getPreRevealLine();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-2"
          >
            <ArrowLeft size={16} />
            New search
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
            Your Recommendations
          </h1>
          {preRevealLine && (
            <p className="text-text-secondary mt-1 italic">
              {preRevealLine}
            </p>
          )}
          <p className="text-text-tertiary text-sm mt-1">
            {results.length} movies picked for you
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium text-text-secondary hover:text-text-primary hover:border-border-color transition-colors"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Results Grid */}
      <div className="space-y-4">
        {results.map((rec, idx) => {
          const aggregate = computeAggregateScore(rec.movie);
          const level = aggregate ? getScoreLevel(aggregate) : null;
          const isRevealed = idx < revealedCount;

          return (
            <Link
              key={rec.movie.tmdb_id || idx}
              href={`/movie/${rec.movie.tmdb_id}`}
              className={`group block bg-bg-elevated rounded-[var(--radius-lg)] border border-border-subtle hover:border-border hover:shadow-[var(--shadow-md)] transition-all overflow-hidden ${
                isRevealed
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
              style={{
                transition: "opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1), border-color 0.2s, box-shadow 0.2s",
              }}
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
                  <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {idx + 1}
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
                            {new Date(rec.movie.release_date).getFullYear()}
                          </span>
                        )}
                        {rec.movie.runtime_minutes && (
                          <>
                            <span className="text-text-tertiary">&#183;</span>
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-bg-tertiary text-text-secondary hover:text-gold hover:bg-gold-subtle transition-colors"
                    >
                      <Bookmark size={14} />
                      Save
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-bg-tertiary text-text-secondary hover:text-score-high transition-colors"
                    >
                      <ThumbsUp size={14} />
                      More like this
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-bg-tertiary text-text-secondary hover:text-red-400 transition-colors"
                    >
                      <ThumbsDown size={14} />
                      Not for me
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Soft CTA */}
      <div className="mt-12 text-center p-8 bg-bg-elevated rounded-[var(--radius-lg)] border border-border-subtle">
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          Like what you see?
        </h3>
        <p className="text-text-secondary mb-4">
          Create a free account to save your picks, rate movies, and get
          recommendations that improve over time.
        </p>
        <button className="inline-flex items-center gap-2 px-6 py-2.5 bg-gold text-bg-primary rounded-[var(--radius-lg)] font-medium hover:bg-gold-hover transition-colors">
          Create Free Account
        </button>
      </div>
    </div>
  );
}
