"use client";

import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface MoodCardProps {
  icon: LucideIcon;
  label: string;
  mood: string;
  emoji?: string;
  gradient?: string;
  gradientBorder?: string;
  selected?: boolean;
  onClick?: (mood: string) => void;
  className?: string;
}

export default function MoodCard({
  icon: Icon,
  label,
  mood,
  emoji,
  gradient = "linear-gradient(135deg, rgba(212,168,67,0.08), rgba(212,168,67,0.02))",
  gradientBorder = "rgba(212,168,67,0.15)",
  selected = false,
  onClick,
  className = "",
}: MoodCardProps) {
  const selectedGradient = gradient.replace(/0\.08/g, "0.16").replace(/0\.02/g, "0.06");

  return (
    <button
      type="button"
      onClick={() => onClick?.(mood)}
      className={`
        group relative flex flex-col items-center justify-center gap-2
        px-5 py-7 rounded-[var(--radius-lg)]
        border-2 transition-all duration-200 ease-out
        min-w-[120px] aspect-[3/4]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2
        active:scale-[0.98] btn-press
        ${
          selected
            ? "border-gold scale-[1.03]"
            : "border-border-subtle bg-bg-elevated text-text-secondary hover:text-gold hover:shadow-[var(--shadow-sm)] hover:scale-[1.02]"
        }
        ${className}
      `}
      style={{
        background: selected ? selectedGradient : gradient,
        borderColor: selected ? "var(--gold)" : undefined,
        boxShadow: selected
          ? "0 0 0 3px var(--gold-glow), 0 4px 16px rgba(0,0,0,0.2)"
          : undefined,
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = "rgba(212,168,67,0.3)";
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = "";
        }
      }}
      aria-pressed={selected}
      aria-label={`Mood: ${label}`}
    >
      {/* Gold checkmark badge when selected */}
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gold flex items-center justify-center">
          <Check size={12} strokeWidth={2.5} className="text-bg-primary" />
        </div>
      )}

      {/* Emoji */}
      {emoji && (
        <span className="text-2xl leading-none mb-1">{emoji}</span>
      )}

      <Icon
        size={28}
        strokeWidth={1.5}
        className={`transition-transform duration-200 ${
          selected ? "text-gold" : "group-hover:-translate-y-0.5"
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
