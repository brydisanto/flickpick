"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Bookmark, BookmarkCheck, Star, Share2, Check } from "lucide-react";
import StarRating from "@/components/ui/StarRating";
import { useAuth } from "@/lib/auth-context";

const RATING_REACTIONS: Record<number, string> = {
  0.5: "Ouch. Noted.",
  1: "Ouch. Noted.",
  1.5: "Fair enough.",
  2: "Not every movie can be The Godfather.",
  2.5: "Right down the middle.",
  3: "Right down the middle.",
  3.5: "Solid pick.",
  4: "Solid pick. We see you.",
  4.5: "A near-masterpiece.",
  5: "A perfect 5. This one really got you.",
};

interface MovieActionsProps {
  movieId: string;
  movieTitle: string;
}

export default function MovieActions({
  movieId,
  movieTitle,
}: MovieActionsProps) {
  const { user, session } = useAuth();
  const userId = user?.id;
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [showRater, setShowRater] = useState(false);
  const [quickRating, setQuickRating] = useState(0);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showReaction, setShowReaction] = useState(false);
  const [reactionText, setReactionText] = useState("");
  const raterRef = useRef<HTMLDivElement>(null);
  const reactionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch initial watchlist and rating state
  useEffect(() => {
    if (!userId || !session?.access_token) return;
    const headers = { Authorization: `Bearer ${session.access_token}` };
    // Check watchlist (lightweight single-movie check)
    fetch(`/api/watchlist?movie_id=${encodeURIComponent(movieId)}`, { headers })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.in_watchlist) {
          setInWatchlist(true);
        }
      })
      .catch(() => {});
    // Check existing rating
    fetch(`/api/ratings?movie_id=${encodeURIComponent(movieId)}`, { headers })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.rating?.rating) {
          setQuickRating(data.rating.rating);
        }
      })
      .catch(() => {});
  }, [userId, movieId, session?.access_token]);

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

  // Cleanup reaction timeout on unmount
  useEffect(() => {
    return () => {
      if (reactionTimeout.current) clearTimeout(reactionTimeout.current);
    };
  }, []);

  const toggleWatchlist = useCallback(async () => {
    if (!userId) return;
    setWatchlistLoading(true);

    const method = inWatchlist ? "DELETE" : "POST";
    try {
      const res = await fetch("/api/watchlist", {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
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

      // Show reaction text
      const reaction = RATING_REACTIONS[value] || "";
      if (reaction) {
        setReactionText(reaction);
        setShowReaction(true);
        if (reactionTimeout.current) clearTimeout(reactionTimeout.current);
        reactionTimeout.current = setTimeout(() => {
          setShowReaction(false);
        }, 2500);
      }

      try {
        const res = await fetch("/api/ratings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
          },
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
              ? "bg-gold text-bg-primary hover:bg-gold-hover"
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
                ? "bg-gold/15 text-gold"
                : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
            }`}
            aria-label="Rate this movie"
          >
            <Star
              size={16}
              className={quickRating > 0 ? "fill-gold" : ""}
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
            {showReaction && reactionText && (
              <p className="text-xs text-gold mt-2 animate-fade-in-up">
                {reactionText}
              </p>
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
