"use client";

import { useState, useCallback } from "react";
import StarRating from "@/components/ui/StarRating";

interface RateMovieSectionProps {
  tmdbId: number;
  movieTitle: string;
}

export default function RateMovieSection({
  tmdbId,
  movieTitle,
}: RateMovieSectionProps) {
  const [rating, setRating] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  const handleRate = useCallback(
    (value: number) => {
      setRating(value);
      setIsSaved(false);
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (rating === 0) return;
    // In the future this will POST to an API endpoint
    // For now, just show confirmation
    setIsSaved(true);
  }, [rating]);

  return (
    <div className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated p-5">
      <p className="text-sm text-text-secondary mb-3">
        What did you think of{" "}
        <span className="font-medium text-text-primary">{movieTitle}</span>?
      </p>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <StarRating value={rating} onChange={handleRate} size={28} />
        {rating > 0 && (
          <button
            type="button"
            onClick={handleSave}
            className={`px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-all ${
              isSaved
                ? "bg-score-high/10 text-score-high cursor-default"
                : "bg-primary text-white hover:bg-primary-hover active:scale-[0.98]"
            }`}
          >
            {isSaved ? "Saved!" : "Save Rating"}
          </button>
        )}
      </div>
    </div>
  );
}
