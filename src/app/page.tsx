import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { getPopularMovies } from "@/lib/tmdb";
import { getTmdbImageUrl } from "@/types";
import HeroRecommender from "./HeroRecommender";

// Don't pre-render at build time — needs TMDB API at runtime
export const dynamic = "force-dynamic";


async function TrendingSection() {
  const trending = await getPopularMovies();

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">
            Trending This Week
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Popular movies everyone is watching right now
          </p>
        </div>
        <Link
          href="/search?q=popular"
          className="text-sm font-medium text-primary hover:text-primary-hover transition-colors hidden sm:inline"
        >
          See all
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
        {trending.results.slice(0, 12).map((m) => {
          const year = m.release_date
            ? new Date(m.release_date).getFullYear()
            : null;
          const scoreDisplay =
            m.vote_average > 0
              ? Math.round(m.vote_average * 10)
              : null;

          return (
            <Link
              key={m.id}
              href={`/movie/${m.id}`}
              className="group block"
              aria-label={`${m.title}${year ? ` (${year})` : ""}`}
            >
              <div className="relative aspect-[2/3] rounded-[var(--radius-md)] overflow-hidden bg-bg-tertiary shadow-[var(--shadow-card)] group-hover:shadow-[var(--shadow-md)] transition-shadow duration-200">
                <Image
                  src={getTmdbImageUrl(m.poster_path, "w500")}
                  alt={`${m.title} poster`}
                  fill
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 185px"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {scoreDisplay != null && (
                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {scoreDisplay}
                  </div>
                )}
              </div>
              <div className="mt-2.5 px-0.5">
                <p className="text-sm font-medium text-text-primary truncate group-hover:text-primary transition-colors">
                  {m.title}
                </p>
                {year && (
                  <p className="text-xs text-text-tertiary mt-0.5">{year}</p>
                )}
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
            <div className="mt-2.5 px-0.5">
              <div className="h-4 w-3/4 bg-bg-tertiary rounded animate-pulse" />
              <div className="h-3 w-1/3 bg-bg-tertiary rounded animate-pulse mt-1.5" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="bg-bg-primary">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Gradient background accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-12">
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-text-primary tracking-tight leading-[1.1]">
              What are you in the
              <br />
              <span className="text-primary">mood for?</span>
            </h1>
            <p className="mt-4 text-lg text-text-secondary max-w-xl mx-auto leading-relaxed">
              Get personalized movie recommendations powered by AI. Pick
              favorites, describe what you want, or choose a vibe.
            </p>
          </div>

          <HeroRecommender />
        </div>
      </section>

      {/* Trending */}
      <div className="border-t border-border-subtle">
        <Suspense fallback={<TrendingSkeleton />}>
          <TrendingSection />
        </Suspense>
      </div>
    </div>
  );
}
