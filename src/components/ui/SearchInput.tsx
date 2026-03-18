"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
} from "react";
import { Search, X, Loader2 } from "lucide-react";

export interface SearchResult {
  id: string;
  label: string;
  subtitle?: string;
  imageUrl?: string;
}

interface SearchInputProps {
  placeholder?: string;
  onSearch: (query: string) => Promise<SearchResult[]> | SearchResult[];
  onSelect: (result: SearchResult) => void;
  debounceMs?: number;
  className?: string;
  variant?: "light" | "dark";
}

export default function SearchInput({
  placeholder = "Search movies...",
  onSearch,
  onSelect,
  debounceMs = 300,
  className = "",
  variant = "light",
}: SearchInputProps) {
  const isDark = variant === "dark";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.trim().length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }
      setIsLoading(true);
      try {
        const searchResults = await onSearch(searchQuery.trim());
        setResults(searchResults);
        setIsOpen(searchResults.length > 0);
        setActiveIndex(-1);
      } catch {
        setResults([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    },
    [onSearch],
  );

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => performSearch(value), debounceMs);
    },
    [performSearch, debounceMs],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const selectResult = useCallback(
    (result: SearchResult) => {
      setQuery(result.label);
      setIsOpen(false);
      setActiveIndex(-1);
      onSelect(result);
    },
    [onSelect],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < results.length) {
            selectResult(results[activeIndex]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setActiveIndex(-1);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, results, activeIndex, selectResult],
  );

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement | undefined;
      activeEl?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const clearInput = useCallback(() => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }, []);

  const listboxId = "search-results-listbox";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search
          size={18}
          className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? "text-bg-primary/40" : "text-text-tertiary"}`}
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `search-result-${activeIndex}` : undefined
          }
          aria-autocomplete="list"
          aria-label="Search movies"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            if (results.length > 0 && query.trim().length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={`
            w-full pl-10 pr-10 py-2.5 rounded-[var(--radius-md)]
            text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 transition-colors
            ${isDark
              ? "bg-white/8 border border-white/10 text-bg-primary placeholder:text-bg-primary/30 focus:border-gold"
              : "bg-bg-secondary border border-border-subtle text-text-primary placeholder:text-text-tertiary focus:border-border-accent"
            }
          `}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
          {isLoading && (
            <Loader2 size={16} className="animate-spin text-text-tertiary" />
          )}
          {!isLoading && query.length > 0 && (
            <button
              type="button"
              onClick={clearInput}
              className="p-0.5 text-text-tertiary hover:text-text-secondary transition-colors"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <ul
          id={listboxId}
          ref={listRef}
          role="listbox"
          className="
            absolute z-50 top-full left-0 right-0 mt-1.5
            max-h-72 overflow-y-auto
            bg-bg-elevated border border-border-subtle rounded-[var(--radius-md)]
            shadow-[var(--shadow-lg)]
          "
        >
          {results.map((result, idx) => (
            <li
              key={result.id}
              id={`search-result-${idx}`}
              role="option"
              aria-selected={idx === activeIndex}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => selectResult(result)}
              className={`
                flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors
                ${idx === activeIndex
                  ? "bg-bg-hover border-l-2 border-l-gold"
                  : "hover:bg-bg-hover border-l-2 border-l-transparent"
                }
              `}
            >
              {result.imageUrl && (
                <img
                  src={result.imageUrl}
                  alt=""
                  className="w-8 h-12 object-cover rounded-[var(--radius-md)] shrink-0 bg-bg-tertiary"
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {result.label}
                </p>
                {result.subtitle && (
                  <p className="text-xs text-text-secondary truncate">
                    {result.subtitle}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
