const OMDB_API_KEY = process.env.OMDB_API_KEY || "";
const OMDB_BASE = "http://www.omdbapi.com";

interface OMDBRating {
  Source: string;
  Value: string;
}

interface OMDBResponse {
  Title: string;
  Year: string;
  imdbRating: string;
  imdbVotes: string;
  Metascore: string;
  Ratings: OMDBRating[];
  Response: "True" | "False";
  Error?: string;
}

export interface ParsedRatings {
  imdb_rating: number | null;
  imdb_votes: number | null;
  rotten_tomatoes_score: number | null;
  metacritic_score: number | null;
}

function parseRatings(data: OMDBResponse): ParsedRatings {
  const result: ParsedRatings = {
    imdb_rating: null,
    imdb_votes: null,
    rotten_tomatoes_score: null,
    metacritic_score: null,
  };

  // IMDb rating
  if (data.imdbRating && data.imdbRating !== "N/A") {
    result.imdb_rating = parseFloat(data.imdbRating);
  }
  if (data.imdbVotes && data.imdbVotes !== "N/A") {
    result.imdb_votes = parseInt(data.imdbVotes.replace(/,/g, ""), 10);
  }

  // Metacritic
  if (data.Metascore && data.Metascore !== "N/A") {
    result.metacritic_score = parseInt(data.Metascore, 10);
  }

  // Rotten Tomatoes (from Ratings array)
  const rtRating = data.Ratings?.find((r) => r.Source === "Rotten Tomatoes");
  if (rtRating) {
    result.rotten_tomatoes_score = parseInt(rtRating.Value.replace("%", ""), 10);
  }

  return result;
}

export async function fetchRatings(imdbId: string): Promise<ParsedRatings | null> {
  try {
    const url = `${OMDB_BASE}/?i=${encodeURIComponent(imdbId)}&apikey=${OMDB_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data: OMDBResponse = await res.json();
    if (data.Response === "False") return null;

    return parseRatings(data);
  } catch {
    return null;
  }
}

export async function fetchRatingsByTitle(title: string, year?: string): Promise<ParsedRatings | null> {
  try {
    let url = `${OMDB_BASE}/?t=${encodeURIComponent(title)}&apikey=${OMDB_API_KEY}`;
    if (year) url += `&y=${year}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data: OMDBResponse = await res.json();
    if (data.Response === "False") return null;

    return parseRatings(data);
  } catch {
    return null;
  }
}
