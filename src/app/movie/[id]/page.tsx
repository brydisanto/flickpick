import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Calendar, Star } from "lucide-react";
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

const SCORE_BG: Record<string, string> = {
  high: "bg-score-high",
  good: "bg-score-good",
  mixed: "bg-score-mixed",
  low: "bg-score-low",
};

const SCORE_TEXT: Record<string, string> = {
  high: "text-white",
  good: "text-white",
  mixed: "text-black",
  low: "text-white",
};

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

  return (
    <div className="bg-bg-primary">
      {movie.backdrop_path && (
        <div className="relative w-full h-[300px] sm:h-[400px] lg:h-[450px]">
          <Image
            src={getTmdbImageUrl(movie.backdrop_path, "original")}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/60 to-transparent" />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`flex flex-col sm:flex-row gap-6 sm:gap-8 ${movie.backdrop_path ? "-mt-32 relative z-10" : "pt-8"}`}
        >
          <div className="shrink-0 w-48 sm:w-56 mx-auto sm:mx-0">
            <div className="relative aspect-[2/3] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-lg)] bg-bg-tertiary">
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

          <div className="flex-1 min-w-0 pt-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
              {movie.title}
            </h1>

            {movie.tagline && (
              <p className="text-text-secondary italic mt-1">{movie.tagline}</p>
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

            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {movie.genres.map((g) => (
                  <span
                    key={g.id}
                    className="px-3 py-1 text-xs font-medium rounded-full bg-primary-light text-primary"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-4">
              {aggregate && level && (
                <div className="flex items-center gap-3">
                  <div
                    className={`w-16 h-16 rounded-[var(--radius-md)] ${SCORE_BG[level]} ${SCORE_TEXT[level]} flex flex-col items-center justify-center`}
                  >
                    <span className="text-2xl font-bold leading-none">
                      {aggregate}
                    </span>
                    <span className="text-[10px] opacity-80">/ 100</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {getScoreLabel(level)}
                    </p>
                    <p className="text-xs text-text-tertiary">Aggregate score</p>
                  </div>
                </div>
              )}

              <div className="flex gap-6 text-sm">
                {ratings?.rotten_tomatoes_score != null && (
                  <div className="text-center">
                    <p className="text-lg font-bold text-text-primary">
                      {ratings.rotten_tomatoes_score}%
                    </p>
                    <p className="text-xs text-text-tertiary">Rotten Tomatoes</p>
                  </div>
                )}
                {ratings?.imdb_rating != null && (
                  <div className="text-center">
                    <p className="text-lg font-bold text-text-primary">
                      {ratings.imdb_rating}
                      <span className="text-xs text-text-tertiary font-normal">/10</span>
                    </p>
                    <p className="text-xs text-text-tertiary">IMDb</p>
                  </div>
                )}
                {ratings?.metacritic_score != null && (
                  <div className="text-center">
                    <p className="text-lg font-bold text-text-primary">
                      {ratings.metacritic_score}
                    </p>
                    <p className="text-xs text-text-tertiary">Metacritic</p>
                  </div>
                )}
              </div>
            </div>

            <MovieActions
              movieId={String(tmdbId)}
              movieTitle={movie.title}
            />
          </div>
        </div>

        {movie.overview && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold text-text-primary mb-3">Overview</h2>
            <p className="text-text-secondary leading-relaxed max-w-3xl">{movie.overview}</p>
          </section>
        )}

        {cast.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Cast</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {cast.map((person) => (
                <div key={person.id} className="text-center">
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
                      <div className="w-full h-full flex items-center justify-center text-text-tertiary">
                        <Star size={24} />
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-text-primary mt-2 truncate">{person.name}</p>
                  <p className="text-xs text-text-tertiary truncate">{person.character}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <WriteReview
          movieId={String(tmdbId)}
          movieTitle={movie.title}
        />

        <ReviewSection
          movieId={String(tmdbId)}
          movieTitle={movie.title}
        />

        {similar && similar.results.length > 0 && (
          <section className="mt-10 pb-16">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Similar Movies</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {similar.results.slice(0, 6).map((m) => (
                <Link key={m.id} href={`/movie/${m.id}`} className="group block">
                  <div className="relative aspect-[2/3] rounded-[var(--radius-md)] overflow-hidden bg-bg-tertiary shadow-[var(--shadow-card)] group-hover:shadow-[var(--shadow-md)] transition-shadow">
                    <Image
                      src={getTmdbImageUrl(m.poster_path, "w500")}
                      alt={`${m.title} poster`}
                      fill
                      sizes="(max-width: 640px) 45vw, 160px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <p className="mt-2 text-sm font-medium text-text-primary truncate group-hover:text-primary transition-colors">
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
