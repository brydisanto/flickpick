"use client";

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
        group flex flex-col items-center justify-center gap-2.5
        px-5 py-5 rounded-[var(--radius-lg)]
        border-2 transition-all duration-200 ease-out
        min-w-[120px]
        ${
          selected
            ? "border-primary bg-primary-light text-primary shadow-[var(--shadow-md)] scale-[1.03]"
            : "border-border-subtle bg-bg-elevated text-text-secondary hover:border-primary/40 hover:text-primary hover:shadow-[var(--shadow-sm)] hover:scale-[1.02]"
        }
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2
        active:scale-[0.98]
        ${className}
      `}
      aria-pressed={selected}
      aria-label={`Mood: ${label}`}
    >
      <Icon
        size={28}
        strokeWidth={1.5}
        className={`transition-transform duration-200 ${
          selected ? "" : "group-hover:scale-110"
        }`}
      />
      <span className="text-sm font-medium whitespace-nowrap">{label}</span>
    </button>
  );
}
