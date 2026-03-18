"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, Pencil, LogIn, AlertTriangle } from "lucide-react";
import StarRating from "@/components/ui/StarRating";
import { useAuth } from "@/lib/auth-context";
import type { Review } from "@/types";

interface WriteReviewProps {
  movieId: string;
  movieTitle: string;
  onReviewSubmitted?: () => void;
}

export default function WriteReview({
  movieId,
  movieTitle,
  onReviewSubmitted,
}: WriteReviewProps) {
  const { user, session, getAccessToken } = useAuth();
  const userId = user?.id;
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const fetchExistingReview = useCallback(async () => {
    if (!userId) return;
    setLoadingExisting(true);
    try {
      const res = await fetch(
        `/api/reviews?movie_id=${encodeURIComponent(movieId)}&user_id=${encodeURIComponent(userId)}&limit=1`
      );
      if (!res.ok) return;
      const data = await res.json();
      const userReview = data.reviews?.find(
        (r: Review) => r.user_id === userId
      );
      if (userReview) {
        setExistingReview(userReview);
      }
    } catch {
      // Silently fail - user can still write a new review
    } finally {
      setLoadingExisting(false);
    }
  }, [movieId, userId]);

  useEffect(() => {
    fetchExistingReview();
  }, [fetchExistingReview]);

  // Listen for edit-review event from ReviewSection
  useEffect(() => {
    function handleEditEvent(e: Event) {
      const review = (e as CustomEvent).detail as Review;
      if (review) {
        setExistingReview(review);
        setRating(review.rating);
        setReviewText(review.review_text || "");
        setContainsSpoilers(review.contains_spoilers);
        setIsEditing(true);
        setSuccess(false);
        setError(null);
      }
    }
    window.addEventListener("flickpick:edit-review", handleEditEvent);
    return () => window.removeEventListener("flickpick:edit-review", handleEditEvent);
  }, []);

  const startEditing = () => {
    if (existingReview) {
      setRating(existingReview.rating);
      setReviewText(existingReview.review_text || "");
      setContainsSpoilers(existingReview.contains_spoilers);
    }
    setIsEditing(true);
    setSuccess(false);
    setError(null);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setRating(0);
    setReviewText("");
    setContainsSpoilers(false);
    setError(null);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a rating.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          movie_id: movieId,
          rating,
          review_text: reviewText.trim() || null,
          contains_spoilers: containsSpoilers,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit review");
      }

      const data = await res.json();
      setExistingReview(data.review);
      setIsEditing(false);
      setSuccess(true);
      setRating(0);
      setReviewText("");
      setContainsSpoilers(false);
      onReviewSubmitted?.();

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // Not signed in
  if (!userId) {
    return (
      <section className="mt-16">
        <div className="p-6 bg-bg-elevated rounded-[var(--radius-lg)] border border-border-subtle text-center">
          <LogIn size={28} className="mx-auto text-text-tertiary mb-3" />
          <p className="text-text-primary font-medium">
            Sign in to rate and review
          </p>
          <p className="text-sm text-text-tertiary mt-1">
            Share your thoughts on {movieTitle} with the community.
          </p>
        </div>
      </section>
    );
  }

  if (loadingExisting) {
    return (
      <section className="mt-16">
        <div className="p-6 bg-bg-elevated rounded-[var(--radius-lg)] border border-border-subtle animate-pulse">
          <div className="h-5 w-40 bg-bg-tertiary rounded mb-3" />
          <div className="h-8 w-48 bg-bg-tertiary rounded" />
        </div>
      </section>
    );
  }

  // Show existing review (not editing)
  if (existingReview && !isEditing) {
    return (
      <section className="mt-16">
        <div className="p-5 bg-bg-elevated rounded-[var(--radius-lg)] border border-border-subtle">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary">
              Your review
            </h3>
            <button
              onClick={startEditing}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
            >
              <Pencil size={12} />
              Edit
            </button>
          </div>
          <StarRating value={existingReview.rating} readOnly size={18} />
          {existingReview.review_text && (
            <p className="mt-2 text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
              {existingReview.review_text}
            </p>
          )}
          {success && (
            <p className="mt-2 text-xs text-score-high font-medium">
              Review updated successfully.
            </p>
          )}
        </div>
      </section>
    );
  }

  // Write / Edit form
  return (
    <section className="mt-16">
      <div className="p-5 bg-bg-elevated rounded-[var(--radius-lg)] border border-border-subtle">
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          {existingReview ? "Edit your review" : "Rate this movie"}
        </h3>

        <div className="mb-4">
          <StarRating value={rating} onChange={setRating} size={28} />
          {rating > 0 && (
            <p className="text-xs text-text-tertiary mt-1">
              {rating} out of 5 stars
            </p>
          )}
        </div>

        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Write your review (optional)"
          rows={4}
          maxLength={5000}
          className="w-full px-3 py-2.5 text-sm bg-bg-primary text-text-primary placeholder:text-text-tertiary border border-border-subtle rounded-[var(--radius-md)] resize-y focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-colors"
        />

        <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
          <label className="inline-flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={containsSpoilers}
              onChange={(e) => setContainsSpoilers(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-gold"
            />
            <AlertTriangle size={12} />
            Contains spoilers
          </label>

          <div className="flex items-center gap-2">
            {existingReview && (
              <button
                onClick={cancelEditing}
                className="px-4 py-1.5 text-xs font-medium rounded-full bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-[var(--radius-pill)] bg-gold text-bg-primary hover:bg-gold-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                "Submitting..."
              ) : (
                <>
                  <Send size={12} />
                  {existingReview ? "Update" : "Submit"}
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-2 text-xs text-red-500 font-medium">{error}</p>
        )}

        {reviewText.length > 0 && (
          <p className="mt-1 text-xs text-text-tertiary text-right">
            {reviewText.length} / 5,000
          </p>
        )}
      </div>
    </section>
  );
}
