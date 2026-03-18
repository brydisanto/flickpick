"use client";

import { useState } from "react";
import Image from "next/image";
import { Bookmark, BookmarkCheck, Film } from "lucide-react";
import type { Movie, Genre } from "@/types";
import { getTmdbImageUrl } from "@/types";
import ScoreBar from "./ScoreBar";
import GenreChip from "./GenreChip";

interface MovieCardProps {
  movie: Movie;
  explanation?: string;
  isBookmarked?: boolean;
  onBookmarkToggle?: (movieId: string) => void;
  onGenreClick?: (genre: Genre) => void;
  onClick?: (movie: Movie) => void;
  className?: string;
}

function PosterFallback() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-tertiary text-text-tertiary">
      <Film size={40} strokeWidth={1} />
      <span className="text-xs mt-2">No poster</span>
    </div>
  );
}

export default function MovieCard({
  movie,
  explanation,
  isBookmarked = false,
  onBookmarkToggle,
  onGenreClick,
  onClick,
  className = "",
}: MovieCardProps) {
  const [imgError, setImgError] = useState(false);
  const posterUrl = getTmdbImageUrl(movie.poster_path, "w500");
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
  const genres = movie.genres ?? [];

  return (
    <article
      className={`
        group relative bg-bg-elevated border border-border rounded-[var(--radius-md)] overflow-hidden
        shadow-[var(--shadow-card)]
        hover:shadow-[var(--shadow-lg)]
        transition-shadow duration-200
        flex flex-col sm:flex-row
        ${onClick ? "cursor-pointer" : ""}
        ${className}
      `}
      onClick={() => onClick?.(movie)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick(movie);
        }
      }}
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] w-full sm:w-36 md:w-44 shrink-0 bg-bg-tertiary overflow-hidden">
        {!imgError && movie.poster_path ? (
          <Image
            src={posterUrl}
            alt={`${movie.title} poster`}
            fill
            sizes="(max-width: 640px) 100vw, 176px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <PosterFallback />
        )}
        {/* Poster vignette overlay */}
        <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.3)] pointer-events-none rounded-[inherit]" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 p-4 flex flex-col gap-2">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-text-primary truncate text-base leading-tight group-hover:text-gold transition-colors">
              {movie.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-text-secondary">
              {year && <span>{year}</span>}
              {movie.runtime_minutes && (
                <>
                  <span className="text-text-tertiary">&#183;</span>
                  <span>{movie.runtime_minutes}m</span>
                </>
              )}
            </div>
          </div>

          {onBookmarkToggle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBookmarkToggle(movie.id);
              }}
              className={`
                shrink-0 p-1.5 rounded-md transition-colors
                ${isBookmarked
                  ? "text-gold hover:text-gold-hover"
                  : "text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary"
                }
              `}
              aria-label={isBookmarked ? "Remove from watchlist" : "Add to watchlist"}
            >
              {isBookmarked ? (
                <BookmarkCheck size={20} className="fill-current" />
              ) : (
                <Bookmark size={20} />
              )}
            </button>
          )}
        </div>

        {/* Genre chips */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {genres.slice(0, 3).map((genre) => (
              <GenreChip
                key={genre.id}
                genre={genre}
                onClick={onGenreClick}
              />
            ))}
          </div>
        )}

        {/* Score */}
        <ScoreBar movie={movie} compact className="mt-auto pt-1" />

        {/* AI explanation */}
        {explanation && (
          <p className="text-xs text-text-secondary leading-relaxed line-clamp-2 mt-1">
            {explanation}
          </p>
        )}
      </div>
    </article>
  );
}
