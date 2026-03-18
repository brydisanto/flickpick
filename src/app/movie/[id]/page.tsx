import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Calendar } from "lucide-react";
import { getMovieDetails, getMovieCredits, getSimilarMovies } from "@/lib/tmdb";
import { fetchRatings } from "@/lib/omdb";
import { getTmdbImageUrl, computeAggregateScore, getScoreLevel, getScoreLabel } from "@/types";
import MovieActions from "@/components/movies/MovieActions";
import ReviewSection from "@/components/movies/ReviewSection";
import WriteReview from "@/components/movies/WriteReview";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const movie = await getMovieDetails(Number(id));
    return {
      title: `${movie.title} — Flickpick`,
      description: movie.overview || `Ratings and reviews for ${movie.title}`,
      openGraph: {
        title: `${movie.title} — Flickpick`,
        description: movie.overview || undefined,
        images: movie.backdrop_path
          ? [{ url: getTmdbImageUrl(movie.backdrop_path, "original") }]
          : [],
      },
    };
  } catch {
    return { title: "Movie — Flickpick" };
  }
}

/* -- Score color helpers -- */

const SCORE_COLOR: Record<string, string> = {
  high: "var(--score-high)",
  good: "var(--score-good)",
  mixed: "var(--score-mixed)",
  low: "var(--score-low)",
};

function scoreColor(level: string): string {
  return SCORE_COLOR[level] ?? "var(--score-low)";
}

/* -- SVG circular gauge -- */

function ScoreGauge({ score, size = 72 }: { score: number; size?: number }) {
  const level = getScoreLevel(score);
  const color = scoreColor(level);
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="score-ring-animate"
          style={
            {
              "--circumference": circumference,
              "--target-offset": offset,
            } as React.CSSProperties
          }
        />
        {/* Score number */}
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          fill={color}
          fontSize="20"
          fontWeight="700"
          className="score-count-animate"
        >
          {score}
        </text>
      </svg>
      <span className="text-text-tertiary text-xs tracking-wide">
        Flickpick Score
      </span>
    </div>
  );
}

/* -- Consensus badge -- */

function ConsensusBadge({
  rt,
  imdb,
  mc,
}: {
  rt: number | null;
  imdb: number | null;
  mc: number | null;
}) {
  const normalized: number[] = [];
  if (rt != null) normalized.push(rt);
  if (imdb != null) normalized.push(imdb * 10);
  if (mc != null) normalized.push(mc);
  if (normalized.length < 2) return null;

  const max = Math.max(...normalized);
  const min = Math.min(...normalized);
  const spread = max - min;

  if (spread <= 10) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-[var(--radius-pill)] text-xs font-semibold uppercase tracking-wider bg-score-high/10 text-score-high border border-score-high/20">
        Critics Agree
      </span>
    );
  }

  if (spread >= 30) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-[var(--radius-pill)] text-xs font-semibold uppercase tracking-wider bg-score-mixed/10 text-score-mixed border border-score-mixed/20">
        Divisive
      </span>
    );
  }

  return null;
}

/* -- Source score column -- */

function SourceScore({
  label,
  color,
  value,
  scale,
}: {
  label: string;
  color: string;
  value: string;
  scale: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-4 sm:px-6">
      <span
        className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-[var(--radius-sm)]"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
      >
        {label}
      </span>
      <span className="text-xl font-bold text-text-primary leading-none">
        {value}
      </span>
      <span className="text-xs text-text-tertiary">{scale}</span>
    </div>
  );
}

/* -- Main page -- */

export default async function MoviePage({ params }: PageProps) {
  const { id } = await params;
  const tmdbId = Number(id);
  if (isNaN(tmdbId)) notFound();

  let movie;
  try {
    movie = await getMovieDetails(tmdbId);
  } catch {
    notFound();
  }

  const [credits, ratings, similar] = await Promise.all([
    getMovieCredits(tmdbId).catch(() => null),
    movie.imdb_id ? fetchRatings(movie.imdb_id) : Promise.resolve(null),
    getSimilarMovies(tmdbId).catch(() => null),
  ]);

  const directors =
    credits?.crew.filter((c) => c.job === "Director").slice(0, 3) || [];
  const cast = credits?.cast.slice(0, 10) || [];

  const movieForScore = {
    imdb_rating: ratings?.imdb_rating ?? null,
    rotten_tomatoes_score: ratings?.rotten_tomatoes_score ?? null,
    metacritic_score: ratings?.metacritic_score ?? null,
    imdb_id: null, imdb_votes: null, platform_avg_rating: null,
    platform_rating_count: 0, id: "", tmdb_id: tmdbId, title: movie.title,
    original_title: null, release_date: null, runtime_minutes: null,
    overview: null, tagline: null, poster_path: null, backdrop_path: null,
    original_language: null, popularity: null, external_ratings_updated_at: null,
    created_at: "", updated_at: "",
  };

  const aggregate = computeAggregateScore(movieForScore);
  const level = aggregate ? getScoreLevel(aggregate) : null;

  // Fallback: if no OMDB data, use TMDB vote_average
  const useTmdbFallback = !ratings && movie.vote_average != null && movie.vote_average > 0;
  const tmdbScore = useTmdbFallback ? Math.round(movie.vote_average * 10) : null;
  const displayAggregate = aggregate ?? tmdbScore;
  const displayLevel = displayAggregate ? getScoreLevel(displayAggregate) : null;

  // Consensus check
  const hasMultipleSources =
    (ratings?.rotten_tomatoes_score != null ? 1 : 0) +
    (ratings?.imdb_rating != null ? 1 : 0) +
    (ratings?.metacritic_score != null ? 1 : 0) >= 2;

  return (
    <div className="bg-bg-primary">
      {/* -- Backdrop -- */}
      {movie.backdrop_path && (
        <div className="relative w-full h-[350px] sm:h-[450px] lg:h-[520px]">
          <Image
            src={getTmdbImageUrl(movie.backdrop_path, "original")}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, var(--bg-primary) 0%, rgba(239,236,213,0.85) 50%, rgba(239,236,213,0.4) 100%)",
            }}
          />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* -- Hero: Poster + Title/Meta -- */}
        <div
          className={`flex flex-col sm:flex-row gap-6 sm:gap-8 ${movie.backdrop_path ? "-mt-32 relative z-10" : "pt-8"}`}
        >
          {/* Poster */}
          <div className="shrink-0 w-48 sm:w-56 mx-auto sm:mx-0">
            <div className="relative aspect-[2/3] overflow-hidden bg-bg-tertiary border border-border-subtle shadow-[var(--shadow-lg)]">
              <Image
                src={getTmdbImageUrl(movie.poster_path, "w500")}
                alt={`${movie.title} poster`}
                fill
                priority
                sizes="224px"
                className="object-cover"
              />
            </div>
          </div>

          {/* Title + Meta */}
          <div className="flex-1 min-w-0 pt-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
              {movie.title}
            </h1>

            {movie.tagline && (
              <p className="text-text-tertiary text-sm italic uppercase tracking-[0.04em] mt-1">
                {movie.tagline}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-text-secondary">
              {movie.release_date && (
                <span className="inline-flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(movie.release_date).getFullYear()}
                </span>
              )}
              {movie.runtime != null && movie.runtime > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Clock size={14} />
                  {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                </span>
              )}
              {directors.length > 0 && (
                <span>
                  Directed by{" "}
                  <span className="text-text-primary font-medium">
                    {directors.map((d) => d.name).join(", ")}
                  </span>
                </span>
              )}
            </div>

            {/* Genre chips */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {movie.genres.map((g) => (
                  <span
                    key={g.id}
                    className="bg-gold-subtle text-gold border border-border-accent text-xs uppercase tracking-[0.05em] font-semibold rounded-[var(--radius-sm)] px-3 py-1"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            <MovieActions
              movieId={String(tmdbId)}
              movieTitle={movie.title}
            />
          </div>
        </div>

        {/* -- Score Card Bar -- */}
        {displayAggregate && displayLevel && (
          <div className="mt-8 bg-bg-elevated border border-border-subtle rounded-[var(--radius-md)] p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Left: Flickpick aggregate gauge */}
              <div className="shrink-0">
                <ScoreGauge score={displayAggregate} size={72} />
              </div>

              {/* Vertical divider (desktop) */}
              <div className="hidden sm:block w-px self-stretch bg-border-subtle" />
              {/* Horizontal divider (mobile) */}
              <div className="block sm:hidden h-px w-full bg-border-subtle" />

              {/* Right: Individual source scores */}
              <div className="flex items-center justify-center flex-1">
                {ratings ? (
                  <div className="flex items-center">
                    {ratings.rotten_tomatoes_score != null && (
                      <SourceScore
                        label="RT"
                        color="var(--brand-rt)"
                        value={`${ratings.rotten_tomatoes_score}`}
                        scale="/100"
                      />
                    )}
                    {ratings.rotten_tomatoes_score != null && ratings.imdb_rating != null && (
                      <div className="w-px h-10 bg-border-subtle" />
                    )}
                    {ratings.imdb_rating != null && (
                      <SourceScore
                        label="IMDb"
                        color="var(--brand-imdb-text)"
                        value={`${ratings.imdb_rating}`}
                        scale="/10"
                      />
                    )}
                    {ratings.imdb_rating != null && ratings.metacritic_score != null && (
                      <div className="w-px h-10 bg-border-subtle" />
                    )}
                    {ratings.metacritic_score != null && (
                      <SourceScore
                        label="MC"
                        color="var(--brand-mc)"
                        value={`${ratings.metacritic_score}`}
                        scale="/100"
                      />
                    )}
                  </div>
                ) : useTmdbFallback ? (
                  <SourceScore
                    label="TMDB"
                    color="var(--brand-tmdb)"
                    value={`${movie.vote_average?.toFixed(1)}`}
                    scale="/10"
                  />
                ) : null}
              </div>

              {/* Consensus badge */}
              {hasMultipleSources && (
                <>
                  <div className="hidden sm:block w-px self-stretch bg-border-subtle" />
                  <div className="shrink-0">
                    <ConsensusBadge
                      rt={ratings?.rotten_tomatoes_score ?? null}
                      imdb={ratings?.imdb_rating ?? null}
                      mc={ratings?.metacritic_score ?? null}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Score label */}
            <div className="mt-3 text-center sm:text-left">
              <p className="text-sm font-medium text-text-primary">
                {getScoreLabel(displayLevel)}
              </p>
            </div>
          </div>
        )}

        {/* -- Overview -- */}
        {movie.overview && (
          <section className="mt-16">
            <h2 className="section-heading text-xl font-semibold text-text-primary mb-3">
              Overview
            </h2>
            <p className="text-text-secondary leading-relaxed max-w-3xl">
              {movie.overview}
            </p>
          </section>
        )}

        {/* -- Cast -- */}
        {cast.length > 0 && (
          <section className="mt-16">
            <h2 className="section-heading text-xl font-semibold text-text-primary mb-4">
              Cast
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {cast.map((person) => (
                <div
                  key={person.id}
                  className="text-center group"
                >
                  <div className="relative w-20 h-20 mx-auto rounded-full overflow-hidden bg-bg-tertiary">
                    {person.profile_path ? (
                      <Image
                        src={getTmdbImageUrl(person.profile_path, "w200")}
                        alt={person.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-bg-hover text-text-secondary text-2xl font-semibold">
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-text-primary mt-2 truncate">
                    {person.name}
                  </p>
                  <p className="text-xs text-text-tertiary truncate">
                    {person.character}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* -- Write Review -- */}
        <WriteReview
          movieId={String(tmdbId)}
          movieTitle={movie.title}
        />

        {/* -- Review Section -- */}
        <ReviewSection
          movieId={String(tmdbId)}
          movieTitle={movie.title}
        />

        {/* -- Similar Movies -- */}
        {similar && similar.results.length > 0 && (
          <section className="mt-16 pb-16">
            <h2 className="section-heading text-xl font-semibold text-text-primary mb-4">
              Similar Movies
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {similar.results.slice(0, 6).map((m) => (
                <Link key={m.id} href={`/movie/${m.id}`} className="group block">
                  <div className="poster-card relative aspect-[2/3] rounded-[var(--radius-md)] overflow-hidden bg-bg-tertiary">
                    <Image
                      src={getTmdbImageUrl(m.poster_path, "w500")}
                      alt={`${m.title} poster`}
                      fill
                      sizes="(max-width: 640px) 45vw, 160px"
                      className="object-cover"
                    />
                  </div>
                  <p className="mt-2 text-sm font-medium text-text-primary truncate group-hover:text-gold transition-colors">
                    {m.title}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
