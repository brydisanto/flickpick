import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { User, Star, Bookmark, Calendar, Film } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { getTmdbImageUrl, computeAggregateScore } from "@/types";
import type { Movie } from "@/types";
import EditProfileButton from "./EditProfileButton";

export const dynamic = "force-dynamic";

function getScoreColor(score: number): string {
  if (score >= 75) return "bg-score-high/90";
  if (score >= 60) return "bg-score-good/90";
  if (score >= 40) return "bg-score-mixed/90";
  return "bg-score-low/90";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function tasteLabel(count: number): string {
  if (count >= 50) return "Cinephile";
  if (count >= 15) return "Strong Taste";
  if (count >= 5) return "Taking Shape";
  return "Getting Started";
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return notFound();

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) return notFound();

  // Run all data queries in parallel
  const [
    { data: reviews },
    { data: watchlist },
    { count: reviewCount },
    { count: watchlistCount },
  ] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, rating, review_text, created_at, movie_id, movies(id, tmdb_id, title, poster_path, rotten_tomatoes_score, imdb_rating, metacritic_score)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("watchlist")
      .select("added_at, movies(id, tmdb_id, title, poster_path, rotten_tomatoes_score, imdb_rating, metacritic_score)")
      .eq("user_id", profile.id)
      .order("added_at", { ascending: false })
      .limit(12),
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id),
    supabase
      .from("watchlist")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", profile.id),
  ]);

  const ratingCount = reviewCount ?? 0;
  const memberSince = formatDate(profile.created_at);
  const taste = tasteLabel(ratingCount);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.display_name || profile.username}
            width={96}
            height={96}
            className="rounded-full object-cover w-24 h-24 border-2 border-border-subtle"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gold-subtle flex items-center justify-center border-2 border-border-subtle">
            <User size={36} className="text-gold" />
          </div>
        )}
        <div className="text-center sm:text-left flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
            {profile.display_name || profile.username}
          </h1>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-text-tertiary text-sm">@{profile.username}</p>
            <EditProfileButton profileUserId={profile.id} />
          </div>
          {profile.bio && (
            <p className="text-text-secondary text-sm mt-2 max-w-md">{profile.bio}</p>
          )}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4 text-sm text-text-secondary">
            <span className="flex items-center gap-1.5">
              <Star size={14} className="text-gold" />
              <strong className="text-text-primary">{ratingCount}</strong> ratings
            </span>
            <span className="flex items-center gap-1.5">
              <Bookmark size={14} className="text-gold" />
              <strong className="text-text-primary">{watchlistCount ?? 0}</strong> watchlist
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-text-tertiary" />
              Joined {memberSince}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold-subtle text-gold text-xs font-semibold">
              <Film size={12} />
              {taste}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Ratings */}
      {reviews && reviews.length > 0 && (
        <section className="mb-12">
          <h2 className="section-heading text-xl font-normal text-text-primary mb-6">
            Recent Ratings
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {reviews.map((review) => {
              const movie = review.movies as unknown as Movie | null;
              if (!movie) return null;
              const aggregate = computeAggregateScore(movie);
              return (
                <Link
                  key={review.id}
                  href={`/movie/${movie.tmdb_id}`}
                  className="group block"
                >
                  <div className="poster-card relative aspect-[2/3] rounded-[var(--radius-md)] overflow-hidden bg-bg-tertiary">
                    <Image
                      src={getTmdbImageUrl(movie.poster_path, "w500")}
                      alt={movie.title}
                      fill
                      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 185px"
                      className="object-cover"
                    />
                    {aggregate != null && (
                      <div
                        className={`absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] text-white text-xs font-bold ${getScoreColor(aggregate)}`}
                      >
                        {aggregate}
                      </div>
                    )}
                    {/* User's rating badge */}
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-0.5 bg-black/70 rounded-[var(--radius-sm)] px-1.5 py-0.5">
                      <Star size={10} className="text-gold fill-gold" />
                      <span className="text-white text-[10px] font-bold">{review.rating}</span>
                    </div>
                    <div className="poster-title-overlay">
                      <p className="text-sm font-semibold text-white leading-snug">
                        {movie.title}
                      </p>
                    </div>
                  </div>
                  {review.review_text && (
                    <p className="mt-1.5 text-xs text-text-secondary line-clamp-2">
                      {review.review_text}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Watchlist */}
      {watchlist && watchlist.length > 0 && (
        <section className="mb-12">
          <h2 className="section-heading text-xl font-normal text-text-primary mb-6">
            Watchlist
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {watchlist.map((item) => {
              const movie = item.movies as unknown as Movie | null;
              if (!movie) return null;
              const aggregate = computeAggregateScore(movie);
              return (
                <Link
                  key={movie.tmdb_id}
                  href={`/movie/${movie.tmdb_id}`}
                  className="group block"
                >
                  <div className="poster-card relative aspect-[2/3] rounded-[var(--radius-md)] overflow-hidden bg-bg-tertiary">
                    <Image
                      src={getTmdbImageUrl(movie.poster_path, "w500")}
                      alt={movie.title}
                      fill
                      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 185px"
                      className="object-cover"
                    />
                    {aggregate != null && (
                      <div
                        className={`absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] text-white text-xs font-bold ${getScoreColor(aggregate)}`}
                      >
                        {aggregate}
                      </div>
                    )}
                    <div className="poster-title-overlay">
                      <p className="text-sm font-semibold text-white leading-snug">
                        {movie.title}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Empty state */}
      {(!reviews || reviews.length === 0) && (!watchlist || watchlist.length === 0) && (
        <div className="text-center py-16">
          <Film size={48} className="mx-auto text-text-tertiary mb-4" />
          <h2 className="text-lg font-medium text-text-primary mb-1">No activity yet</h2>
          <p className="text-text-secondary text-sm">
            Start rating movies to build your taste profile.
          </p>
        </div>
      )}
    </div>
  );
}
