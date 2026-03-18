"use client";

import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface MoodCardProps {
  icon: LucideIcon;
  label: string;
  mood: string;
  selected?: boolean;
  onClick?: (mood: string) => void;
  className?: string;
}

export default function MoodCard({
  icon: Icon,
  label,
  mood,
  selected = false,
  onClick,
  className = "",
}: MoodCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(mood)}
      className={`
        group relative flex flex-col items-center justify-center gap-3
        px-4 py-6 rounded-[var(--radius-lg)]
        border transition-all duration-200 ease-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2
        active:scale-[0.98] btn-press
        ${
          selected
            ? "border-gold bg-gold/10 shadow-[0_0_0_1px_var(--gold)]"
            : "border-white/10 bg-white/6 text-bg-primary/60 hover:text-gold hover:border-gold/30"
        }
        ${className}
      `}
      aria-pressed={selected}
      aria-label={`Mood: ${label}`}
    >
      {/* Checkmark badge when selected */}
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gold flex items-center justify-center">
          <Check size={12} strokeWidth={2.5} className="text-bg-primary" />
        </div>
      )}

      <Icon
        size={28}
        strokeWidth={1.5}
        className={`transition-colors duration-200 ${
          selected ? "text-gold" : ""
        }`}
      />
      <span
        className={`text-sm font-medium whitespace-nowrap ${
          selected ? "text-gold" : ""
        }`}
      >
        {label}
      </span>
    </button>
  );
}
