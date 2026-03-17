// ==================
// Movie Types
// ==================

export interface Movie {
  id: string;
  tmdb_id: number;
  imdb_id: string | null;
  title: string;
  original_title: string | null;
  release_date: string | null;
  runtime_minutes: number | null;
  overview: string | null;
  tagline: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  original_language: string | null;
  popularity: number | null;

  // External ratings
  imdb_rating: number | null;
  imdb_votes: number | null;
  rotten_tomatoes_score: number | null;
  metacritic_score: number | null;

  // Platform ratings
  platform_avg_rating: number | null;
  platform_rating_count: number;

  // Timestamps
  external_ratings_updated_at: string | null;
  created_at: string;
  updated_at: string;

  // Relations (optional, loaded on demand)
  genres?: Genre[];
  credits?: MovieCredit[];
}

export interface Genre {
  id: number;
  tmdb_id: number;
  name: string;
}

export interface Person {
  id: string;
  tmdb_id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string | null;
}

export interface MovieCredit {
  id: string;
  movie_id: string;
  person_id: string;
  role_type: "cast" | "crew";
  character_name: string | null;
  job: string | null;
  display_order: number | null;
  person?: Person;
}

// ==================
// User Types
// ==================

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_public: boolean;
  taste_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  movie_id: string;
  rating: number;
  review_text: string | null;
  contains_spoilers: boolean;
  like_count: number;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  movie?: Movie;
}

export interface WatchlistItem {
  user_id: string;
  movie_id: string;
  added_at: string;
  movie?: Movie;
}

// ==================
// Recommendation Types
// ==================

export interface RecommendationInput {
  seeds?: string[]; // movie IDs or titles
  natural_language?: string;
  mood?: string;
}

export interface RecommendationResult {
  movie: Movie;
  score: number;
  explanation: string;
  match_type: "seed" | "taste" | "mood" | "discovery";
}

// ==================
// Score Helpers
// ==================

export type ScoreLevel = "high" | "good" | "mixed" | "low";

export function getScoreLevel(score: number): ScoreLevel {
  if (score >= 90) return "high";
  if (score >= 75) return "good";
  if (score >= 60) return "mixed";
  return "low";
}

export function getScoreLabel(level: ScoreLevel): string {
  switch (level) {
    case "high": return "Universally acclaimed";
    case "good": return "Highly rated";
    case "mixed": return "Mixed reviews";
    case "low": return "Divisive";
  }
}

export function computeAggregateScore(movie: Movie): number | null {
  const scores: number[] = [];

  if (movie.rotten_tomatoes_score != null) scores.push(movie.rotten_tomatoes_score);
  if (movie.metacritic_score != null) scores.push(movie.metacritic_score);
  if (movie.imdb_rating != null) scores.push(movie.imdb_rating * 10); // normalize to 0-100

  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

// ==================
// TMDB Helpers
// ==================

export function getTmdbImageUrl(path: string | null, size: "w200" | "w500" | "original" = "w500"): string {
  if (!path) return "/placeholder-poster.svg";
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
