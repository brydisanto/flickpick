import Image from "next/image";
import Link from "next/link";
import { getTopRatedMovies, getMovieDetails } from "@/lib/tmdb";
import { fetchRatings, type ParsedRatings } from "@/lib/omdb";
import { getTmdbImageUrl } from "@/types";

export const revalidate = 86400; // Rebuild once per day

interface RankedMovie {
  id: number;
  title: string;
  year: string;
  poster_path: string | null;
  imdb_id: string | null;
  vote_average: number;
  ratings: ParsedRatings | null;
  flickpickScore: number;
}

function computeFlickpickScore(
  ratings: ParsedRatings | null,
  tmdbVoteAverage: number
): number {
  const sources: { value: number; weight: number }[] = [];

  if (ratings?.rotten_tomatoes_score != null) {
    sources.push({ value: ratings.rotten_tomatoes_score, weight: 35 });
  }
  if (ratings?.imdb_rating != null) {
    sources.push({ value: ratings.imdb_rating * 10, weight: 35 });
  }
  if (ratings?.metacritic_score != null) {
    sources.push({ value: ratings.metacritic_score, weight: 30 });
  }

  // If we have at least one OMDB source, compute weighted average
  if (sources.length > 0) {
    const totalWeight = sources.reduce((sum, s) => sum + s.weight, 0);
    const weightedSum = sources.reduce(
      (sum, s) => sum + s.value * (s.weight / totalWeight),
      0
    );
    return Math.round(weightedSum);
  }

  // Fallback to TMDB score (already 0-10, scale to 0-100)
  return Math.round(tmdbVoteAverage * 10);
}

function scoreColor(score: number): string {
  if (score >= 75) return "#34D399";
  if (score >= 60) return "#60A5FA";
  if (score >= 40) return "#FBBF24";
  return "#6B7280";
}

async function fetchAllTopRated(): Promise<RankedMovie[]> {
  // Fetch 8 pages (160 movies) from TMDB
  const pages = await Promise.all(
    Array.from({ length: 8 }, (_, i) => getTopRatedMovies(i + 1))
  );
  const allMovies = pages.flatMap((p) => p.results).slice(0, 150);

  // Fetch movie details (for imdb_id) in batches of 20
  const detailBatches: typeof allMovies[] = [];
  for (let i = 0; i < allMovies.length; i += 20) {
    detailBatches.push(allMovies.slice(i, i + 20));
  }

  const movieDetails: Array<{
    id: number;
    title: string;
    release_date: string;
    poster_path: string | null;
    vote_average: number;
    imdb_id: string | null;
  }> = [];

  for (const batch of detailBatches) {
    const results = await Promise.allSettled(
      batch.map((m) => getMovieDetails(m.id))
    );
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled") {
        movieDetails.push({
          id: r.value.id,
          title: r.value.title,
          release_date: r.value.release_date,
          poster_path: r.value.poster_path,
          vote_average: r.value.vote_average,
          imdb_id: r.value.imdb_id,
        });
      } else {
        // Fallback to basic data
        movieDetails.push({
          id: batch[i].id,
          title: batch[i].title,
          release_date: batch[i].release_date,
          poster_path: batch[i].poster_path,
          vote_average: batch[i].vote_average,
          imdb_id: null,
        });
      }
    }
  }

  // Fetch OMDB ratings in batches of 15
  const ratingsMap = new Map<number, ParsedRatings | null>();
  const moviesWithImdb = movieDetails.filter((m) => m.imdb_id);

  const omdbBatches: typeof moviesWithImdb[] = [];
  for (let i = 0; i < moviesWithImdb.length; i += 15) {
    omdbBatches.push(moviesWithImdb.slice(i, i + 15));
  }

  for (const batch of omdbBatches) {
    const results = await Promise.allSettled(
      batch.map((m) => fetchRatings(m.imdb_id!))
    );
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      ratingsMap.set(batch[i].id, r.status === "fulfilled" ? r.value : null);
    }
  }

  // Build ranked list
  const ranked: RankedMovie[] = movieDetails.map((m) => {
    const ratings = ratingsMap.get(m.id) ?? null;
    return {
      id: m.id,
      title: m.title,
      year: m.release_date ? new Date(m.release_date).getFullYear().toString() : "",
      poster_path: m.poster_path,
      imdb_id: m.imdb_id,
      vote_average: m.vote_average,
      ratings,
      flickpickScore: computeFlickpickScore(ratings, m.vote_average),
    };
  });

  // Sort by Flickpick aggregate score descending
  ranked.sort((a, b) => b.flickpickScore - a.flickpickScore);

  return ranked;
}

export default async function TopRatedPage() {
  const movies = await fetchAllTopRated();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="section-heading text-3xl sm:text-4xl font-bold text-text-primary">
          Top 150 Films
        </h1>
        <p className="text-text-secondary mt-3 ml-4 max-w-2xl">
          Ranked by Flickpick Score — a weighted aggregate of Rotten Tomatoes,
          IMDb, and Metacritic ratings. Updated daily.
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

      {/* Table header (desktop) */}
      <div className="hidden md:grid grid-cols-[3.5rem_1fr_5rem_5rem_5rem_5.5rem] gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-text-tertiary border-b border-border-subtle mb-2">
        <span className="text-center">#</span>
        <span>Film</span>
        <span className="text-center">RT</span>
        <span className="text-center">IMDb</span>
        <span className="text-center">MC</span>
        <span className="text-center text-gold">Flickpick</span>
      </div>

      {/* Movie rows */}
      <div className="divide-y divide-border-subtle">
        {movies.map((movie, idx) => {
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
                  <p className="text-xs text-text-tertiary">{movie.year}</p>

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
                  <span className="text-xs text-text-tertiary">—</span>
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
                  <span className="text-xs text-text-tertiary">—</span>
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
                  <span className="text-xs text-text-tertiary">—</span>
                )}
              </span>

              <span className="hidden md:flex justify-center">
                <span
                  className="inline-flex items-center justify-center w-12 h-8 rounded-[8px] text-sm font-bold"
                  style={{
                    background: `${fpColor}18`,
                    color: fpColor,
                    boxShadow: movie.flickpickScore >= 75
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
        Flickpick Score = weighted aggregate of Rotten Tomatoes (35%), IMDb
        (35%), and Metacritic (30%). Falls back to TMDB rating when critic
        scores are unavailable.
      </p>
    </div>
  );
}
