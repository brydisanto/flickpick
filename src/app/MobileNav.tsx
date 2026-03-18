"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Search } from "lucide-react";

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-bg-primary/70 hover:text-bg-primary transition-colors"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <>
        <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setOpen(false)} />
        <div className="absolute top-full left-0 right-0 bg-bg-primary border-b border-border z-50 animate-fade-in">
          <div className="px-4 py-4 space-y-4">
            <form action="/search" method="GET" className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
              />
              <input
                type="text"
                name="q"
                placeholder="Search films..."
                className="w-full h-10 pl-8 pr-3 bg-bg-elevated border border-border-subtle rounded-[var(--radius-md)] text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold transition-colors"
              />
            </form>
            <nav className="flex flex-col gap-3">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="t-meta text-text-secondary hover:text-gold transition-colors py-1"
              >
                Discover
              </Link>
              <Link
                href="/top-rated"
                onClick={() => setOpen(false)}
                className="t-meta text-text-secondary hover:text-gold transition-colors py-1"
              >
                Top 150
              </Link>
            </nav>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
