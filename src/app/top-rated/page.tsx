import { getTopRatedMovies, getMovieDetails } from "@/lib/tmdb";
import { fetchRatings, type ParsedRatings } from "@/lib/omdb";
import TopRatedList from "./TopRatedList";

export const revalidate = 86400; // Rebuild once per day

export interface RankedMovie {
  id: number;
  title: string;
  year: string;
  poster_path: string | null;
  imdb_id: string | null;
  vote_average: number;
  genres: string[];
  ratings: ParsedRatings | null;
  flickpickScore: number;
}

function computeFlickpickScore(
  ratings: ParsedRatings | null,
  tmdbVoteAverage: number
): number {
  const PLACEHOLDER = 75;
  const imdbNorm =
    ratings?.imdb_rating != null
      ? ratings.imdb_rating * 10
      : tmdbVoteAverage > 0
        ? Math.round(tmdbVoteAverage * 10)
        : PLACEHOLDER;
  const rt = ratings?.rotten_tomatoes_score ?? PLACEHOLDER;
  const mc = ratings?.metacritic_score ?? PLACEHOLDER;
  return Math.round(imdbNorm * 0.5 + rt * 0.3 + mc * 0.2);
}

// Genre ID → name mapping (TMDB standard)
const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
  878: "Sci-Fi", 10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
};

async function fetchAllTopRated(): Promise<{ movies: RankedMovie[]; allGenres: string[] }> {
  // Fetch 10 pages (200 movies) to have buffer after dedup
  const pages = await Promise.all(
    Array.from({ length: 10 }, (_, i) => getTopRatedMovies(i + 1))
  );

  // Deduplicate by movie ID
  const seen = new Set<number>();
  const uniqueMovies = pages.flatMap((p) => p.results).filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });

  // Take first 150 unique
  const allMovies = uniqueMovies.slice(0, 150);

  // Fetch movie details (for imdb_id + genres) in batches of 20
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
    genres: string[];
  }> = [];

  for (const batch of detailBatches) {
    const results = await Promise.allSettled(
      batch.map((m) => getMovieDetails(m.id))
    );
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled") {
        const genres = r.value.genres?.map((g) => g.name) ??
          (r.value.genre_ids?.map((id) => GENRE_MAP[id]).filter(Boolean) as string[]) ?? [];
        movieDetails.push({
          id: r.value.id,
          title: r.value.title,
          release_date: r.value.release_date,
          poster_path: r.value.poster_path,
          vote_average: r.value.vote_average,
          imdb_id: r.value.imdb_id,
          genres,
        });
      } else {
        const genres = batch[i].genre_ids?.map((id) => GENRE_MAP[id]).filter(Boolean) as string[] ?? [];
        movieDetails.push({
          id: batch[i].id,
          title: batch[i].title,
          release_date: batch[i].release_date,
          poster_path: batch[i].poster_path,
          vote_average: batch[i].vote_average,
          imdb_id: null,
          genres,
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
      genres: m.genres,
      ratings,
      flickpickScore: computeFlickpickScore(ratings, m.vote_average),
    };
  });

  // Sort by Flickpick score (IMDb-primary), then by IMDb rating as tiebreaker
  ranked.sort((a, b) => {
    const scoreDiff = b.flickpickScore - a.flickpickScore;
    if (scoreDiff !== 0) return scoreDiff;
    const aImdb = a.ratings?.imdb_rating ?? 0;
    const bImdb = b.ratings?.imdb_rating ?? 0;
    return bImdb - aImdb;
  });

  // Collect all genres that appear
  const genreSet = new Set<string>();
  ranked.forEach((m) => m.genres.forEach((g) => genreSet.add(g)));
  const allGenres = Array.from(genreSet).sort();

  return { movies: ranked, allGenres };
}

export default async function TopRatedPage() {
  const { movies, allGenres } = await fetchAllTopRated();

  return <TopRatedList movies={movies} allGenres={allGenres} />;
}
