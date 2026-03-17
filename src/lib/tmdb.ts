const TMDB_API_KEY = process.env.TMDB_API_KEY!;
const TMDB_BASE = "https://api.themoviedb.org/3";

interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  runtime: number | null;
  overview: string;
  tagline: string;
  poster_path: string | null;
  backdrop_path: string | null;
  original_language: string;
  popularity: number;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  vote_average: number;
  vote_count: number;
  imdb_id: string | null;
  budget: number;
  revenue: number;
}

interface TMDBCredits {
  cast: {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    known_for_department: string;
    order: number;
  }[];
  crew: {
    id: number;
    name: string;
    job: string;
    department: string;
    profile_path: string | null;
    known_for_department: string;
  }[];
}

interface TMDBSearchResult {
  page: number;
  total_results: number;
  total_pages: number;
  results: TMDBMovie[];
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`TMDB error: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function searchMovies(query: string, page = 1): Promise<TMDBSearchResult> {
  return tmdbFetch<TMDBSearchResult>("/search/movie", {
    query,
    page: String(page),
    include_adult: "false",
  });
}

export async function getMovieDetails(tmdbId: number): Promise<TMDBMovie> {
  return tmdbFetch<TMDBMovie>(`/movie/${tmdbId}`);
}

export async function getMovieCredits(tmdbId: number): Promise<TMDBCredits> {
  return tmdbFetch<TMDBCredits>(`/movie/${tmdbId}/credits`);
}

export async function getPopularMovies(page = 1): Promise<TMDBSearchResult> {
  return tmdbFetch<TMDBSearchResult>("/movie/popular", { page: String(page) });
}

export async function getTopRatedMovies(page = 1): Promise<TMDBSearchResult> {
  return tmdbFetch<TMDBSearchResult>("/movie/top_rated", { page: String(page) });
}

export async function getGenreList(): Promise<{ genres: { id: number; name: string }[] }> {
  return tmdbFetch("/genre/movie/list");
}

export async function getSimilarMovies(tmdbId: number): Promise<TMDBSearchResult> {
  return tmdbFetch<TMDBSearchResult>(`/movie/${tmdbId}/similar`);
}

export async function discoverMovies(params: Record<string, string>): Promise<TMDBSearchResult> {
  return tmdbFetch<TMDBSearchResult>("/discover/movie", {
    include_adult: "false",
    sort_by: "popularity.desc",
    ...params,
  });
}

export type { TMDBMovie, TMDBCredits, TMDBSearchResult };
