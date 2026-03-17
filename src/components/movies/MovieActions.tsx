"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Bookmark, BookmarkCheck, Star, Share2, Check, LogIn } from "lucide-react";
import StarRating from "@/components/ui/StarRating";

interface MovieActionsProps {
  movieId: string;
  movieTitle: string;
  userId?: string;
}

export default function MovieActions({
  movieId,
  movieTitle,
  userId,
}: MovieActionsProps) {
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [showRater, setShowRater] = useState(false);
  const [quickRating, setQuickRating] = useState(0);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const raterRef = useRef<HTMLDivElement>(null);

  // Close rater on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (raterRef.current && !raterRef.current.contains(e.target as Node)) {
        setShowRater(false);
      }
    }
    if (showRater) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showRater]);

  const toggleWatchlist = useCallback(async () => {
    if (!userId) return;
    setWatchlistLoading(true);

    const method = inWatchlist ? "DELETE" : "POST";
    try {
      const res = await fetch("/api/watchlist", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movie_id: movieId }),
      });
      if (res.ok) {
        setInWatchlist(!inWatchlist);
      }
    } catch {
      // Silently fail
    } finally {
      setWatchlistLoading(false);
    }
  }, [userId, movieId, inWatchlist]);

  const handleQuickRate = useCallback(
    async (value: number) => {
      if (!userId) return;
      setQuickRating(value);
      setRatingLoading(true);

      try {
        const res = await fetch("/api/ratings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ movie_id: movieId, rating: value }),
        });
        if (res.ok) {
          setTimeout(() => setShowRater(false), 600);
        }
      } catch {
        setQuickRating(0);
      } finally {
        setRatingLoading(false);
      }
    },
    [userId, movieId]
  );

  const handleShare = useCallback(async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: movieTitle, url });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select + copy
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [movieTitle]);

  const buttonBase =
    "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-colors";

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 relative">
      {/* Watchlist toggle */}
      {userId ? (
        <button
          onClick={toggleWatchlist}
          disabled={watchlistLoading}
          className={`${buttonBase} ${
            inWatchlist
              ? "bg-primary text-white hover:bg-primary-hover"
              : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
          } disabled:opacity-50`}
          aria-label={
            inWatchlist ? "Remove from watchlist" : "Add to watchlist"
          }
        >
          {inWatchlist ? (
            <>
              <BookmarkCheck size={16} />
              In Watchlist
            </>
          ) : (
            <>
              <Bookmark size={16} />
              Watchlist
            </>
          )}
        </button>
      ) : (
        <button
          disabled
          className={`${buttonBase} bg-bg-tertiary text-text-tertiary cursor-not-allowed`}
          title="Sign in to add to watchlist"
        >
          <Bookmark size={16} />
          Watchlist
        </button>
      )}

      {/* Quick rate button */}
      <div className="relative" ref={raterRef}>
        {userId ? (
          <button
            onClick={() => setShowRater(!showRater)}
            className={`${buttonBase} ${
              quickRating > 0
                ? "bg-accent/15 text-accent"
                : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
            }`}
            aria-label="Rate this movie"
          >
            <Star
              size={16}
              className={quickRating > 0 ? "fill-accent" : ""}
            />
            {quickRating > 0 ? `${quickRating}` : "Rate"}
          </button>
        ) : (
          <button
            disabled
            className={`${buttonBase} bg-bg-tertiary text-text-tertiary cursor-not-allowed`}
            title="Sign in to rate"
          >
            <Star size={16} />
            Rate
          </button>
        )}

        {showRater && userId && (
          <div className="absolute top-full left-0 mt-2 p-3 bg-bg-elevated rounded-[var(--radius-md)] border border-border shadow-[var(--shadow-md)] z-20">
            <StarRating
              value={quickRating}
              onChange={handleQuickRate}
              size={28}
            />
            {ratingLoading && (
              <p className="text-xs text-text-tertiary mt-1">Saving...</p>
            )}
          </div>
        )}
      </div>

      {/* Share button */}
      <button
        onClick={handleShare}
        className={`${buttonBase} bg-bg-tertiary text-text-secondary hover:text-text-primary`}
        aria-label="Share this movie"
      >
        {copied ? (
          <>
            <Check size={16} className="text-score-high" />
            Copied
          </>
        ) : (
          <>
            <Share2 size={16} />
            Share
          </>
        )}
      </button>
    </div>
  );
}
