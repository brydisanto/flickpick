"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  Brain,
  Sparkles,
  Gem,
  Trophy,
  Star,
  Sofa,
  Landmark,
  MessageSquareText,
  Loader2,
  X,
  ArrowRight,
} from "lucide-react";
import SearchInput, { type SearchResult } from "@/components/ui/SearchInput";
import MoodCard from "@/components/ui/MoodCard";
import { getTmdbImageUrl } from "@/types";

type InputMode = "seeds" | "natural" | "moods";

const MOOD_OPTIONS = [
  { icon: Heart, label: "Date Night", mood: "date-night" },
  { icon: Brain, label: "Mind-Bending", mood: "mind-bending" },
  { icon: Sparkles, label: "Feel-Good", mood: "feel-good" },
  { icon: Gem, label: "Hidden Gems", mood: "hidden-gems" },
  { icon: Trophy, label: "Award Winners", mood: "award-winners" },
  { icon: Star, label: "Underrated", mood: "underrated" },
  { icon: Sofa, label: "Comfort Rewatch", mood: "comfort-rewatch" },
  { icon: Landmark, label: "Based on True Events", mood: "true-events" },
] as const;

const NL_PLACEHOLDERS = [
  "something like Interstellar but more emotional...",
  "a fun heist movie I haven't heard of...",
  "Korean thriller that will keep me up at night...",
  "cozy rainy day movie with great dialogue...",
  "visually stunning sci-fi from the last decade...",
];

interface SeedMovie {
  id: string;
  title: string;
  year?: string;
  poster_path?: string;
}

export default function HeroRecommender() {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode>("seeds");
  const [seeds, setSeeds] = useState<SeedMovie[]>([]);
  const [nlQuery, setNlQuery] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [placeholderIdx] = useState(() =>
    Math.floor(Math.random() * NL_PLACEHOLDERS.length)
  );

  const searchMovies = useCallback(
    async (query: string): Promise<SearchResult[]> => {
      try {
        const res = await fetch(
          `/api/movies/search?q=${encodeURIComponent(query)}`
        );
        if (!res.ok) return [];
        const data = await res.json();
        return (data.results || []).map(
          (m: { tmdb_id: number; title: string; year?: string; poster_path?: string }) => ({
            id: String(m.tmdb_id),
            label: m.title,
            subtitle: m.year || "",
            imageUrl: m.poster_path
              ? getTmdbImageUrl(m.poster_path, "w200")
              : undefined,
          })
        );
      } catch {
        return [];
      }
    },
    []
  );

  const handleSelectSeed = useCallback(
    (result: SearchResult) => {
      if (seeds.find((s) => s.id === result.id)) return;
      setSeeds((prev) => [
        ...prev,
        {
          id: result.id,
          title: result.label,
          year: result.subtitle,
          poster_path: undefined,
        },
      ]);
    },
    [seeds]
  );

  const removeSeed = useCallback((id: string) => {
    setSeeds((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsLoading(true);
    try {
      const body: Record<string, unknown> = {};
      if (mode === "seeds" && seeds.length >= 1) {
        body.seeds = seeds.map((s) => s.id);
      } else if (mode === "natural" && nlQuery.trim()) {
        body.natural_language = nlQuery.trim();
      } else if (mode === "moods" && selectedMood) {
        body.mood = selectedMood;
      } else {
        setIsLoading(false);
        return;
      }

      const res = await fetch("/api/recommend/instant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to get recommendations");
      const data = await res.json();

      // Store results in sessionStorage and navigate to results
      sessionStorage.setItem("flickpick_results", JSON.stringify(data.results));
      sessionStorage.setItem("flickpick_input", JSON.stringify(body));
      router.push("/recommendations");
    } catch (err) {
      console.error("Recommendation error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [mode, seeds, nlQuery, selectedMood, router]);

  const canSubmit =
    (mode === "seeds" && seeds.length >= 1) ||
    (mode === "natural" && nlQuery.trim().length > 5) ||
    (mode === "moods" && selectedMood !== null);

  return (
    <div className="space-y-6">
      {/* Mode Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex bg-bg-tertiary rounded-full p-1 gap-1">
          {([
            { key: "seeds", label: "Pick Favorites" },
            { key: "natural", label: "Describe It" },
            { key: "moods", label: "Choose a Vibe" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMode(tab.key)}
              className={`
                px-4 sm:px-6 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${
                  mode === tab.key
                    ? "bg-bg-secondary text-text-primary shadow-[var(--shadow-sm)]"
                    : "text-text-secondary hover:text-text-primary"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode Content */}
      <div className="min-h-[200px]">
        {/* Seeds Mode */}
        {mode === "seeds" && (
          <div className="space-y-4">
            <SearchInput
              placeholder="Search for a movie to add..."
              onSearch={searchMovies}
              onSelect={handleSelectSeed}
              className="max-w-lg mx-auto"
            />

            {seeds.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {seeds.map((seed) => (
                  <span
                    key={seed.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-light text-primary rounded-full text-sm font-medium"
                  >
                    {seed.title}
                    {seed.year && (
                      <span className="text-primary/60">({seed.year})</span>
                    )}
                    <button
                      onClick={() => removeSeed(seed.id)}
                      className="ml-0.5 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                      aria-label={`Remove ${seed.title}`}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <p className="text-center text-sm text-text-tertiary">
              {seeds.length === 0
                ? "Add at least 1 movie to get started"
                : seeds.length < 3
                  ? `${seeds.length} selected — add more for better results`
                  : `${seeds.length} selected — looking good!`}
            </p>
          </div>
        )}

        {/* Natural Language Mode */}
        {mode === "natural" && (
          <div className="max-w-lg mx-auto space-y-3">
            <div className="relative">
              <MessageSquareText
                size={18}
                className="absolute left-3 top-3.5 text-text-tertiary pointer-events-none"
              />
              <textarea
                value={nlQuery}
                onChange={(e) => setNlQuery(e.target.value)}
                placeholder={NL_PLACEHOLDERS[placeholderIdx]}
                rows={3}
                className="
                  w-full pl-10 pr-4 py-3 rounded-[var(--radius-md)]
                  bg-bg-secondary border border-border
                  text-text-primary text-sm placeholder:text-text-tertiary
                  focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                  transition-colors resize-none
                "
              />
            </div>
            <p className="text-center text-sm text-text-tertiary">
              Describe the vibe, genre, mood, or anything about the movie you
              want to watch
            </p>
          </div>
        )}

        {/* Moods Mode */}
        {mode === "moods" && (
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {MOOD_OPTIONS.map((opt) => (
                <MoodCard
                  key={opt.mood}
                  icon={opt.icon}
                  label={opt.label}
                  mood={opt.mood}
                  selected={selectedMood === opt.mood}
                  onClick={(mood) =>
                    setSelectedMood(mood === selectedMood ? null : mood)
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isLoading}
          className={`
            inline-flex items-center gap-2 px-8 py-3 rounded-full
            text-base font-semibold transition-all duration-200
            ${
              canSubmit && !isLoading
                ? "bg-primary text-white hover:bg-primary-hover shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] active:scale-[0.98]"
                : "bg-bg-tertiary text-text-tertiary cursor-not-allowed"
            }
          `}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Finding movies...
            </>
          ) : (
            <>
              Get Recommendations
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
