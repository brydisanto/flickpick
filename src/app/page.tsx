import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { getPopularMovies } from "@/lib/tmdb";
import { getTmdbImageUrl, computeAggregateScore, getScoreLevel } from "@/types";
import type { Movie } from "@/types";
import { createServerClient } from "@/lib/supabase";
import HeroRecommender from "./HeroRecommender";

// Don't pre-render at build time — needs TMDB API at runtime
export const dynamic = "force-dynamic";

function getScoreColor(score: number): string {
  if (score >= 75) return "bg-score-high/90";
  if (score >= 60) return "bg-score-good/90";
  if (score >= 40) return "bg-score-mixed/90";
  return "bg-score-low/90";
}

async function TrendingSection() {
  const trending = await getPopularMovies();
  const tmdbIds = trending.results.slice(0, 12).map((m) => m.id);

  // Fetch FlickPick aggregate scores from DB
  let dbScores: Record<number, Movie> = {};
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("movies")
      .select("tmdb_id, rotten_tomatoes_score, imdb_rating, metacritic_score")
      .in("tmdb_id", tmdbIds);
    if (data) {
      for (const row of data) {
        dbScores[row.tmdb_id] = row as unknown as Movie;
      }
    }
  } catch {
    // Fall back to TMDB scores if DB unavailable
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <h2 className="section-heading text-2xl font-normal text-text-primary">
            Trending This Week
          </h2>
          <p className="text-sm text-text-secondary mt-1 pl-4">
            Popular movies everyone is watching right now
          </p>
        </div>
        <Link
          href="/top-rated"
          className="text-sm font-medium text-gold hover:text-gold-hover transition-colors hidden sm:inline"
        >
          See all
        </Link>
      </div>
      <div className="stagger-children grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
        {trending.results.slice(0, 12).map((m) => {
          const year = m.release_date
            ? new Date(m.release_date).getFullYear()
            : null;

          // Use FlickPick aggregate if available, fall back to TMDB score
          const dbMovie = dbScores[m.id];
          const aggregate = dbMovie ? computeAggregateScore(dbMovie) : null;
          const scoreDisplay = aggregate ?? (m.vote_average > 0 ? Math.round(m.vote_average * 10) : null);

          return (
            <Link
              key={m.id}
              href={`/movie/${m.id}`}
              className="group block"
              aria-label={`${m.title}${year ? ` (${year})` : ""}`}
            >
              <div className="poster-card relative aspect-[2/3] rounded-[var(--radius-md)] overflow-hidden bg-bg-tertiary">
                <Image
                  src={getTmdbImageUrl(m.poster_path, "w500")}
                  alt={`${m.title} poster`}
                  fill
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 185px"
                  className="object-cover"
                />
                {scoreDisplay != null && (
                  <div
                    className={`absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] text-white text-xs font-bold ${getScoreColor(scoreDisplay)}`}
                  >
                    {scoreDisplay}
                  </div>
                )}
                <div className="poster-title-overlay">
                  <p className="text-sm font-semibold text-white leading-snug">
                    {m.title}
                  </p>
                  {year && (
                    <p className="text-xs text-white/70 mt-0.5">
                      {year}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function TrendingSkeleton() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-8">
        <div className="h-7 w-52 bg-bg-tertiary rounded-[var(--radius-sm)] animate-pulse" />
        <div className="h-4 w-72 bg-bg-tertiary rounded-[var(--radius-sm)] animate-pulse mt-2" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i}>
            <div className="aspect-[2/3] rounded-[var(--radius-md)] bg-bg-tertiary animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="bg-bg-primary">
      {/* Hero Section — Spotlight / Stage Lighting */}
      <section className="hero-spotlight">
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-14">
          <div className="text-center mb-10">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-normal text-bg-primary tracking-[-0.03em] leading-[1.1]">
              What are you in the<br />
              <em className="text-gold-gradient italic pr-2">mood to watch?</em>
            </h1>
            <p className="mt-5 text-bg-primary/60 max-w-xl mx-auto text-base leading-relaxed">
              Tell us what you love. We&rsquo;ll find your next obsession.
            </p>
          </div>

          <HeroRecommender />
        </div>
      </section>
      <div className="hero-spotlight-fade" />

      {/* Trending */}
      <div className="border-t border-border-subtle">
        <Suspense fallback={<TrendingSkeleton />}>
          <TrendingSection />
        </Suspense>
      </div>
    </div>
  );
}
