"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getTmdbImageUrl } from "@/types";
import type { RankedMovie } from "./page";

function scoreColor(score: number): string {
  if (score >= 75) return "#059669";
  if (score >= 60) return "#2563EB";
  if (score >= 40) return "#D97706";
  return "#6B7280";
}

interface TopRatedListProps {
  movies: RankedMovie[];
  allGenres: string[];
}

type SortColumn = "flickpick" | "rt" | "imdb" | "mc";
type SortDirection = "asc" | "desc";

function getSortValue(movie: RankedMovie, col: SortColumn): number {
  switch (col) {
    case "rt":
      return movie.ratings?.rotten_tomatoes_score ?? -1;
    case "imdb":
      return movie.ratings?.imdb_rating ?? -1;
    case "mc":
      return movie.ratings?.metacritic_score ?? -1;
    case "flickpick":
      return movie.flickpickScore;
  }
}

export default function TopRatedList({ movies, allGenres }: TopRatedListProps) {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("flickpick");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = useCallback(
    (col: SortColumn) => {
      if (sortColumn === col) {
        setSortDirection((d) => (d === "desc" ? "asc" : "desc"));
      } else {
        setSortColumn(col);
        setSortDirection("desc");
      }
    },
    [sortColumn]
  );

  const filtered = useMemo(() => {
    let list = selectedGenre
      ? movies.filter((m) => m.genres.includes(selectedGenre))
      : [...movies];

    list.sort((a, b) => {
      const aVal = getSortValue(a, sortColumn);
      const bVal = getSortValue(b, sortColumn);
      const diff = sortDirection === "desc" ? bVal - aVal : aVal - bVal;
      if (diff !== 0) return diff;
      return b.flickpickScore - a.flickpickScore;
    });

    return list;
  }, [movies, selectedGenre, sortColumn, sortDirection]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="section-heading text-3xl sm:text-4xl font-bold text-text-primary">
          Top 150 Films
        </h1>
        <p className="text-text-secondary mt-3 ml-4 max-w-2xl">
          Ranked by Flickpick Score — anchored by IMDb rating, adjusted with
          Rotten Tomatoes and Metacritic. Updated daily.
        </p>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-5 ml-4 text-xs text-text-tertiary">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: "#FA320A" }}
            />
            RT
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: "#F5C518" }}
            />
            IMDb
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: "#60A5FA" }}
            />
            Metacritic
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-gold" />
            Flickpick
          </span>
        </div>
      </div>

      {/* Genre filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedGenre(null)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
            selectedGenre === null
              ? "bg-gold text-bg-primary border-gold"
              : "bg-bg-tertiary text-text-secondary border-border-subtle hover:text-text-primary hover:border-border-accent"
          }`}
        >
          All Genres
        </button>
        {allGenres.map((genre) => (
          <button
            key={genre}
            onClick={() =>
              setSelectedGenre(selectedGenre === genre ? null : genre)
            }
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
              selectedGenre === genre
                ? "bg-gold text-bg-primary border-gold"
                : "bg-bg-tertiary text-text-secondary border-border-subtle hover:text-text-primary hover:border-border-accent"
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Result count when filtered */}
      {selectedGenre && (
        <p className="text-sm text-text-tertiary mb-4">
          {filtered.length} film{filtered.length !== 1 ? "s" : ""} in{" "}
          <span className="text-gold">{selectedGenre}</span>
        </p>
      )}

      {/* Table header (desktop) */}
      <div className="hidden md:grid grid-cols-[3.5rem_1fr_5rem_5rem_5rem_5.5rem] gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-text-tertiary border-b border-border-subtle mb-2">
        <span className="text-center">#</span>
        <span>Film</span>
        {(
          [
            { key: "rt", label: "RT" },
            { key: "imdb", label: "IMDb" },
            { key: "mc", label: "MC" },
            { key: "flickpick", label: "Flickpick" },
          ] as const
        ).map((col) => (
          <button
            key={col.key}
            onClick={() => handleSort(col.key)}
            className={`flex items-center justify-center gap-0.5 cursor-pointer hover:text-text-primary transition-colors ${
              col.key === "flickpick" ? "text-gold" : ""
            } ${sortColumn === col.key ? "text-text-primary" : ""}`}
          >
            {col.label}
            {sortColumn === col.key && (
              sortDirection === "desc" ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronUp size={12} />
              )
            )}
          </button>
        ))}
      </div>

      {/* Movie rows */}
      <div className="divide-y divide-border-subtle">
        {filtered.map((movie, idx) => {
          const rank = idx + 1;
          const rt = movie.ratings?.rotten_tomatoes_score;
          const imdb = movie.ratings?.imdb_rating;
          const mc = movie.ratings?.metacritic_score;
          const fpColor = scoreColor(movie.flickpickScore);

          return (
            <Link
              key={movie.id}
              href={`/movie/${movie.id}`}
              className="group grid grid-cols-[3rem_1fr] md:grid-cols-[3.5rem_1fr_5rem_5rem_5rem_5.5rem] gap-3 md:gap-4 items-center px-3 md:px-4 py-3 md:py-2.5 hover:bg-bg-hover/50 transition-colors rounded-[var(--radius-sm)]"
            >
              {/* Rank */}
              <span
                className={`text-center font-bold tabular-nums ${
                  rank <= 3
                    ? "text-gold text-xl"
                    : rank <= 10
                      ? "text-text-primary text-lg"
                      : "text-text-tertiary text-base"
                }`}
              >
                {rank}
              </span>

              {/* Movie info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative w-10 h-[60px] md:w-11 md:h-[66px] shrink-0 rounded-[6px] overflow-hidden bg-bg-tertiary">
                  {movie.poster_path && (
                    <Image
                      src={getTmdbImageUrl(movie.poster_path, "w200")}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate group-hover:text-gold transition-colors">
                    {movie.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-tertiary">
                      {movie.year}
                    </span>
                    {movie.genres.length > 0 && (
                      <span className="hidden sm:inline text-xs text-text-tertiary">
                        {movie.genres.slice(0, 2).join(", ")}
                      </span>
                    )}
                  </div>

                  {/* Mobile scores row */}
                  <div className="flex items-center gap-2 mt-1.5 md:hidden">
                    {rt != null && (
                      <span className="flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-sm"
                          style={{ background: "#FA320A" }}
                        />
                        <span className="text-xs font-semibold text-text-secondary">
                          {rt}%
                        </span>
                      </span>
                    )}
                    {imdb != null && (
                      <span className="flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-sm"
                          style={{ background: "#F5C518" }}
                        />
                        <span className="text-xs font-semibold text-text-secondary">
                          {imdb}
                        </span>
                      </span>
                    )}
                    {mc != null && (
                      <span className="flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-sm"
                          style={{ background: "#60A5FA" }}
                        />
                        <span className="text-xs font-semibold text-text-secondary">
                          {mc}
                        </span>
                      </span>
                    )}
                    <span
                      className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-[4px]"
                      style={{
                        background: `${fpColor}15`,
                        color: fpColor,
                      }}
                    >
                      {movie.flickpickScore}
                    </span>
                  </div>
                </div>
              </div>

              {/* Desktop score columns */}
              <span className="hidden md:flex justify-center">
                {rt != null ? (
                  <span
                    className="inline-flex items-center justify-center w-11 h-7 rounded-[6px] text-xs font-bold"
                    style={{
                      background: "rgba(250,50,10,0.12)",
                      color: "#FA320A",
                    }}
                  >
                    {rt}%
                  </span>
                ) : (
                  <span className="text-xs text-text-tertiary">&mdash;</span>
                )}
              </span>

              <span className="hidden md:flex justify-center">
                {imdb != null ? (
                  <span
                    className="inline-flex items-center justify-center w-11 h-7 rounded-[6px] text-xs font-bold"
                    style={{
                      background: "rgba(245,197,24,0.12)",
                      color: "#F5C518",
                    }}
                  >
                    {imdb}
                  </span>
                ) : (
                  <span className="text-xs text-text-tertiary">&mdash;</span>
                )}
              </span>

              <span className="hidden md:flex justify-center">
                {mc != null ? (
                  <span
                    className="inline-flex items-center justify-center w-11 h-7 rounded-[6px] text-xs font-bold"
                    style={{
                      background: "rgba(96,165,250,0.12)",
                      color: "#60A5FA",
                    }}
                  >
                    {mc}
                  </span>
                ) : (
                  <span className="text-xs text-text-tertiary">&mdash;</span>
                )}
              </span>

              <span className="hidden md:flex justify-center">
                <span
                  className="inline-flex items-center justify-center w-12 h-8 rounded-[8px] text-sm font-bold"
                  style={{
                    background: `${fpColor}18`,
                    color: fpColor,
                    boxShadow:
                      movie.flickpickScore >= 75
                        ? `0 0 12px ${fpColor}20`
                        : undefined,
                  }}
                >
                  {movie.flickpickScore}
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-text-tertiary mt-10">
        Flickpick Score = IMDb (50%) + Rotten Tomatoes (30%) + Metacritic (20%).
        Missing scores default to 75%. Click column headers to sort.
      </p>
    </div>
  );
}
