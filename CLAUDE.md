# Flickpick

Movie aggregator + social network + AI recommendation engine.

## Stack
- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL + pgvector + Auth + RLS)
- **APIs:** TMDB (metadata), OMDB (RT/IMDb/MC scores), OpenAI (embeddings + NL recommendations)
- **Hosting:** Vercel + Supabase

## Project Structure
```
src/
  app/              # Next.js App Router pages and API routes
    api/            # API routes (movies, recommend, ratings, watchlist, reviews, auth)
    auth/           # Auth pages (login, signup, callback)
    movie/[id]/     # Movie detail page (SSR)
    search/         # Search results
    recommendations/ # Recommendation results
    onboarding/     # New user onboarding
    foryou/         # Personalized recommendations (auth required)
  components/
    ui/             # Reusable UI (ScoreBar, StarRating, MovieCard, SearchInput, etc.)
    movies/         # Movie-specific components (ReviewSection, WriteReview, MovieActions)
    layout/         # Header, Footer
    auth/           # Auth components
  lib/              # Utilities (supabase, tmdb, omdb, embeddings, auth-context)
  types/            # TypeScript types
scripts/            # Seed and batch scripts (seed-movies.ts, generate-embeddings.ts)
supabase/           # Schema SQL and RPC functions
```

## Key Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npx tsx scripts/seed-movies.ts` — Seed database with popular movies
- `npx tsx scripts/generate-embeddings.ts` — Generate embeddings for movies

## Environment Variables
See `.env.local` for required keys (TMDB, OMDB, Supabase, OpenAI).

## Design System
CSS variables defined in `src/app/globals.css`. Key tokens:
- Colors: primary (indigo #6366F1), accent (amber), score-high/good/mixed/low
- Dark mode: automatic via prefers-color-scheme
- Tailwind tokens mapped via `@theme inline` block
