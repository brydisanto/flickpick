"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ThumbsUp, ChevronDown, AlertTriangle, MessageSquare, Pencil, Trash2 } from "lucide-react";
import StarRating from "@/components/ui/StarRating";
import { useAuth } from "@/lib/auth-context";
import type { Review } from "@/types";

type SortOption = "recent" | "rating" | "likes";

interface ReviewSectionProps {
  movieId: string;
  movieTitle: string;
}

interface ReviewsResponse {
  reviews: Review[];
  total: number;
  page: number;
}

const LIMIT = 10;

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ReviewCard({
  review,
  userId,
  onLike,
  onEdit,
  onDelete,
}: {
  review: Review;
  userId?: string;
  onLike: (reviewId: string) => void;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => void;
}) {
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hasSpoiler = review.contains_spoilers && !spoilerRevealed;
  const profile = review.profile;
  const isOwn = userId === review.user_id;

  return (
    <article className="p-5 bg-bg-elevated rounded-[var(--radius-lg)] border border-border-subtle">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-bg-tertiary">
          {profile?.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.display_name || profile.username}
              width={40}
              height={40}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-tertiary text-sm font-semibold">
              {(profile?.display_name || profile?.username || "?")
                .charAt(0)
                .toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-text-primary">
              {profile?.display_name || profile?.username || "Anonymous"}
            </span>
            <StarRating value={review.rating} readOnly size={14} />
            <span className="text-xs text-text-tertiary">
              {formatDate(review.created_at)}
            </span>
          </div>

          {review.review_text && (
            <div className="mt-2">
              {hasSpoiler ? (
                <div className="relative">
                  <p className="text-sm text-text-secondary leading-relaxed blur-sm select-none pointer-events-none">
                    {review.review_text}
                  </p>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={() => setSpoilerRevealed(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <AlertTriangle size={12} />
                      Show spoiler
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {review.review_text}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 mt-3">
            <button
              onClick={() => onLike(review.id)}
              disabled={!userId}
              className="inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-gold disabled:opacity-50 disabled:cursor-default transition-colors"
              aria-label={`Like review (${review.like_count} likes)`}
            >
              <ThumbsUp size={13} />
              <span>{review.like_count > 0 ? review.like_count : "Like"}</span>
            </button>
            {review.contains_spoilers && (
              <span className="inline-flex items-center gap-1 text-xs text-text-tertiary">
                <AlertTriangle size={12} />
                Contains spoilers
              </span>
            )}
            {isOwn && onEdit && (
              <button
                onClick={() => onEdit(review)}
                className="inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary transition-colors"
              >
                <Pencil size={12} />
                Edit
              </button>
            )}
            {isOwn && onDelete && (
              confirmDelete ? (
                <span className="inline-flex items-center gap-2 text-xs">
                  <button
                    onClick={() => { onDelete(review.id); setConfirmDelete(false); }}
                    className="text-red-500 hover:text-red-600 font-medium transition-colors"
                  >
                    Confirm delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-red-500 transition-colors"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ReviewSection({
  movieId,
  movieTitle,
}: ReviewSectionProps) {
  const { user, session } = useAuth();
  const userId = user?.id;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortOption>("recent");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchReviews = useCallback(
    async (pageNum: number, sortBy: SortOption, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const res = await fetch(
          `/api/reviews?movie_id=${encodeURIComponent(movieId)}&sort=${sortBy}&page=${pageNum}&limit=${LIMIT}`
        );
        if (!res.ok) throw new Error("Failed to fetch reviews");
        const data: ReviewsResponse = await res.json();

        if (append) {
          setReviews((prev) => [...prev, ...data.reviews]);
        } else {
          setReviews(data.reviews);
        }
        setTotal(data.total);
        setPage(data.page);
      } catch (err) {
        console.error("Error fetching reviews:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [movieId]
  );

  useEffect(() => {
    fetchReviews(1, sort, false);
  }, [sort, fetchReviews]);

  const handleSortChange = (newSort: SortOption) => {
    if (newSort === sort) return;
    setSort(newSort);
  };

  const handleLoadMore = () => {
    fetchReviews(page + 1, sort, true);
  };

  const handleLike = async (reviewId: string) => {
    if (!userId) return;

    // Optimistic update
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId ? { ...r, like_count: r.like_count + 1 } : r
      )
    );

    try {
      const res = await fetch(`/api/reviews/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({ review_id: reviewId }),
      });
      if (!res.ok) {
        // Revert on failure
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId ? { ...r, like_count: r.like_count - 1 } : r
          )
        );
      }
    } catch {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, like_count: r.like_count - 1 } : r
        )
      );
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!userId) return;

    const original = reviews;
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    setTotal((prev) => prev - 1);

    try {
      const res = await fetch("/api/reviews", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({ review_id: reviewId }),
      });
      if (!res.ok) {
        setReviews(original);
        setTotal((prev) => prev + 1);
      }
    } catch {
      setReviews(original);
      setTotal((prev) => prev + 1);
    }
  };

  const handleEdit = (review: Review) => {
    // Scroll to WriteReview section and trigger edit mode via custom event
    window.dispatchEvent(
      new CustomEvent("flickpick:edit-review", { detail: review })
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasMore = reviews.length < total;

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "recent", label: "Most recent" },
    { value: "rating", label: "Highest rated" },
    { value: "likes", label: "Most liked" },
  ];

  return (
    <section className="mt-16">
      <div className="flex items-center justify-between gap-4 mb-5">
        <h2 className="section-heading text-xl font-semibold text-text-primary">
          Reviews
          {total > 0 && (
            <span className="ml-2 text-sm font-normal text-text-tertiary">
              ({total})
            </span>
          )}
        </h2>

        {total > 0 && (
          <div className="flex items-center gap-1.5">
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSortChange(opt.value)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  sort === opt.value
                    ? "bg-gold text-bg-primary"
                    : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="p-5 bg-bg-elevated rounded-[var(--radius-lg)] border border-border-subtle animate-pulse"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-bg-tertiary" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-bg-tertiary rounded" />
                  <div className="h-3 w-full bg-bg-tertiary rounded" />
                  <div className="h-3 w-3/4 bg-bg-tertiary rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-8 bg-bg-elevated rounded-[var(--radius-lg)] border border-border-subtle text-center">
          <MessageSquare
            size={32}
            className="mx-auto text-text-tertiary mb-3"
          />
          <p className="text-text-secondary font-medium">
            Be the first to review {movieTitle}
          </p>
          <p className="text-sm text-text-tertiary mt-1">
            Share your thoughts and help others decide what to watch.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              userId={userId}
              onLike={handleLike}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}

          {hasMore && (
            <div className="text-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-full bg-bg-tertiary text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
              >
                {loadingMore ? (
                  "Loading..."
                ) : (
                  <>
                    Load more
                    <ChevronDown size={14} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
