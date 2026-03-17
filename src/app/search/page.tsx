import Image from "next/image";
import Link from "next/link";
import { searchMovies, getPopularMovies, getTopRatedMovies } from "@/lib/tmdb";
import { getTmdbImageUrl } from "@/types";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() || "";

  let results;
  let heading: string;

  if (query === "popular" || query === "") {
    results = await getPopularMovies();
    heading = "Popular Movies";
  } else if (query === "top rated" || query === "top+rated") {
    results = await getTopRatedMovies();
    heading = "Top Rated Movies";
  } else {
    results = await searchMovies(query);
    heading = `Results for "${query}"`;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{heading}</h1>
        {results.total_results > 0 && (
          <p className="text-sm text-text-secondary mt-1">
            {results.total_results.toLocaleString()} movies found
          </p>
        )}
      </div>

      {results.results.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-lg text-text-secondary">No movies found for &ldquo;{query}&rdquo;</p>
          <p className="text-sm text-text-tertiary mt-2">Try a different search term</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {results.results.map((movie) => (
            <Link key={movie.id} href={`/movie/${movie.id}`} className="group block">
              <div className="relative aspect-[2/3] rounded-[var(--radius-md)] overflow-hidden bg-bg-tertiary shadow-[var(--shadow-card)] group-hover:shadow-[var(--shadow-md)] transition-shadow">
                <Image
                  src={getTmdbImageUrl(movie.poster_path, "w500")}
                  alt={`${movie.title} poster`}
                  fill
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 185px"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {movie.vote_average != null && movie.vote_average > 0 && (
                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {(movie.vote_average * 10).toFixed(0)}
                  </div>
                )}
              </div>
              <div className="mt-2 px-0.5">
                <p className="text-sm font-medium text-text-primary truncate group-hover:text-primary transition-colors">
                  {movie.title}
                </p>
                {movie.release_date && (
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {new Date(movie.release_date).getFullYear()}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
