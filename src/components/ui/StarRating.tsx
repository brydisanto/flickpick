"use client";

import { useState, useCallback } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: number;
  className?: string;
}

export default function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 24,
  className = "",
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue ?? value;
  const interactive = !readOnly && !!onChange;

  const getStarFill = useCallback(
    (starIndex: number): "full" | "half" | "empty" => {
      const starNumber = starIndex + 1;
      if (displayValue >= starNumber) return "full";
      if (displayValue >= starNumber - 0.5) return "half";
      return "empty";
    },
    [displayValue],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, starIndex: number) => {
      if (!interactive) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const isHalf = x < rect.width / 2;
      setHoverValue(starIndex + (isHalf ? 0.5 : 1));
    },
    [interactive],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, starIndex: number) => {
      if (!interactive) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const isHalf = x < rect.width / 2;
      const newRating = starIndex + (isHalf ? 0.5 : 1);
      onChange?.(newRating === value ? 0 : newRating);
    },
    [interactive, onChange, value],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!interactive) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onChange?.(Math.min(5, value + 0.5));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onChange?.(Math.max(0, value - 0.5));
      }
    },
    [interactive, onChange, value],
  );

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${className}`}
      role="radiogroup"
      aria-label={`Rating: ${value} out of 5 stars`}
      onKeyDown={handleKeyDown}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const fill = getStarFill(i);
        const clipId = `star-clip-${i}`;

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onMouseMove={(e) => handleMouseMove(e, i)}
            onMouseLeave={() => setHoverValue(null)}
            onClick={(e) => handleClick(e, i)}
            className={`relative p-0 border-0 bg-transparent ${
              interactive
                ? "cursor-pointer hover:scale-110 transition-transform"
                : "cursor-default"
            }`}
            tabIndex={interactive && i === 0 ? 0 : -1}
            role="radio"
            aria-checked={value >= i + 1}
            aria-label={`${i + 1} star${i === 0 ? "" : "s"}`}
          >
            {/* Empty star background */}
            <Star
              size={size}
              className="text-border"
              strokeWidth={1.5}
            />

            {/* Filled overlay */}
            {fill !== "empty" && (
              <div
                className="absolute inset-0"
                style={{
                  clipPath:
                    fill === "half"
                      ? "inset(0 50% 0 0)"
                      : undefined,
                }}
              >
                <Star
                  size={size}
                  className="text-accent fill-accent"
                  strokeWidth={1.5}
                />
              </div>
            )}
          </button>
        );
      })}
      {value > 0 && (
        <span className="ml-1.5 text-sm font-medium text-text-secondary">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
