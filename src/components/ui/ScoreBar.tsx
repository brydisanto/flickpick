"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Movie, ScoreLevel } from "@/types";
import { computeAggregateScore, getScoreLevel, getScoreLabel } from "@/types";

interface ScoreBarProps {
  movie: Movie;
  compact?: boolean;
  className?: string;
}

const scoreColorMap: Record<ScoreLevel, string> = {
  high: "var(--score-high)",
  good: "var(--score-good)",
  mixed: "var(--score-mixed)",
  low: "var(--score-low)",
};

const scoreTailwindMap: Record<ScoreLevel, string> = {
  high: "text-score-high",
  good: "text-score-good",
  mixed: "text-score-mixed",
  low: "text-score-low",
};

function CircularGauge({
  score,
  level,
  size = 64,
}: {
  score: number;
  level: ScoreLevel;
  size?: number;
}) {
  const strokeWidth = size >= 64 ? 5 : 3.5;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = scoreColorMap[level];

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Aggregate score: ${score}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span
        className="absolute font-bold"
        style={{
          fontSize: size >= 64 ? "1.125rem" : "0.75rem",
          color,
        }}
      >
        {score}
      </span>
    </div>
  );
}

function IndividualScore({
  label,
  score,
  maxDisplay,
}: {
  label: string;
  score: number | null;
  maxDisplay: string;
}) {
  if (score == null) return null;

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-medium text-text-primary">
        {score}
        <span className="text-text-tertiary">/{maxDisplay}</span>
      </span>
    </div>
  );
}

export default function ScoreBar({ movie, compact = false, className = "" }: ScoreBarProps) {
  const [expanded, setExpanded] = useState(false);
  const aggregate = computeAggregateScore(movie);

  if (aggregate == null) {
    return (
      <div className={`text-sm text-text-tertiary ${className}`}>
        No scores available
      </div>
    );
  }

  const level = getScoreLevel(aggregate);
  const label = getScoreLabel(level);

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <CircularGauge score={aggregate} level={level} size={36} />
        <span className={`text-xs font-medium ${scoreTailwindMap[level]}`}>
          {aggregate}
        </span>
      </div>
    );
  }

  const hasBreakdown =
    movie.rotten_tomatoes_score != null ||
    movie.metacritic_score != null ||
    movie.imdb_rating != null;

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-3">
        <CircularGauge score={aggregate} level={level} size={64} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${scoreTailwindMap[level]}`}>
            {label}
          </p>
          <p className="text-xs text-text-tertiary mt-0.5">
            Aggregate score from critic &amp; audience ratings
          </p>
        </div>
        {hasBreakdown && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-md hover:bg-bg-tertiary transition-colors text-text-secondary"
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse score breakdown" : "Expand score breakdown"}
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        )}
      </div>

      {expanded && hasBreakdown && (
        <div className="mt-3 pt-3 border-t border-border-subtle divide-y divide-border-subtle">
          <IndividualScore
            label="Rotten Tomatoes"
            score={movie.rotten_tomatoes_score}
            maxDisplay="100"
          />
          <IndividualScore
            label="Metacritic"
            score={movie.metacritic_score}
            maxDisplay="100"
          />
          <IndividualScore
            label="IMDb"
            score={movie.imdb_rating}
            maxDisplay="10"
          />
        </div>
      )}
    </div>
  );
}
