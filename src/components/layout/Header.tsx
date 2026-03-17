"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, X, User, Menu } from "lucide-react";
import SearchInput, { type SearchResult } from "@/components/ui/SearchInput";

interface HeaderProps {
  user?: {
    displayName: string;
    avatarUrl?: string;
  } | null;
  onSearch?: (query: string) => Promise<SearchResult[]> | SearchResult[];
  onSearchSelect?: (result: SearchResult) => void;
  onSignInClick?: () => void;
}

export default function Header({
  user,
  onSearch,
  onSearchSelect,
  onSignInClick,
}: HeaderProps) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const defaultSearch = async () => [] as SearchResult[];
  const searchHandler = onSearch ?? defaultSearch;
  const selectHandler = onSearchSelect ?? (() => {});

  return (
    <header className="sticky top-0 z-40 bg-bg-secondary/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="shrink-0 flex items-center gap-1.5 text-text-primary hover:opacity-80 transition-opacity"
          aria-label="Flickpick home"
        >
          <span className="text-xl font-bold tracking-tight">
            flick<span className="text-primary">pick</span>
          </span>
        </Link>

        {/* Desktop search */}
        <div className="hidden sm:block flex-1 max-w-md mx-auto">
          <SearchInput
            onSearch={searchHandler}
            onSelect={selectHandler}
            placeholder="Search movies..."
          />
        </div>

        {/* Mobile search toggle */}
        <button
          type="button"
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          className="sm:hidden ml-auto p-2 text-text-secondary hover:text-text-primary transition-colors"
          aria-label={mobileSearchOpen ? "Close search" : "Open search"}
        >
          {mobileSearchOpen ? <X size={20} /> : <Search size={20} />}
        </button>

        {/* Auth area */}
        <div className="shrink-0 flex items-center">
          {user ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center">
                  <User size={16} className="text-primary" />
                </div>
              )}
              <span className="hidden md:inline font-medium">
                {user.displayName}
              </span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={onSignInClick}
              className="
                px-4 py-2 text-sm font-medium rounded-[var(--radius-md)]
                bg-primary text-white hover:bg-primary-hover
                transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2
              "
            >
              Sign in
            </button>
          )}
        </div>
      </div>

      {/* Mobile search bar */}
      {mobileSearchOpen && (
        <div className="sm:hidden px-4 pb-3">
          <SearchInput
            onSearch={searchHandler}
            onSelect={(result) => {
              selectHandler(result);
              setMobileSearchOpen(false);
            }}
            placeholder="Search movies..."
          />
        </div>
      )}
    </header>
  );
}
