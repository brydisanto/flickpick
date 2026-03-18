// Quick check: which trending movies have ratings in DB?
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("@next/env").loadEnvConfig(process.cwd());

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
  const res = await fetch(
    `https://api.themoviedb.org/3/trending/movie/week?api_key=${process.env.TMDB_API_KEY}`
  );
  const data = await res.json();
  const movies = data.results.slice(0, 12);
  const ids = movies.map((m: { id: number }) => m.id);

  console.log("TMDB trending:");
  for (const m of movies) {
    console.log(`  ${m.id} — ${m.title} (TMDB: ${Math.round(m.vote_average * 10)})`);
  }

  const { data: dbMovies } = await sb
    .from("movies")
    .select("tmdb_id, title, imdb_rating, rotten_tomatoes_score, metacritic_score")
    .in("tmdb_id", ids);

  console.log(`\nIn DB: ${(dbMovies || []).length} of ${ids.length}`);
  const dbMap = new Map((dbMovies || []).map((m) => [m.tmdb_id, m]));

  for (const m of movies) {
    const db = dbMap.get(m.id);
    if (db) {
      console.log(`  ✓ ${m.title} — RT:${db.rotten_tomatoes_score ?? "-"} IMDb:${db.imdb_rating ?? "-"} MC:${db.metacritic_score ?? "-"}`);
    } else {
      console.log(`  ✗ ${m.title} — NOT IN DB`);
    }
  }
}

main();
