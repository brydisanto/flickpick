import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Search, Film } from "lucide-react";
import { AuthProvider } from "@/lib/auth-context";
import { HeaderAuth } from "./HeaderAuth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flickpick — Movie Ratings, Reviews & Recommendations",
  description:
    "Discover your next favorite movie. Flickpick aggregates ratings from Rotten Tomatoes, IMDb, and Metacritic, then uses AI to recommend films tailored to your taste.",
  manifest: "/manifest.json",
  themeColor: "#6366F1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Flickpick",
  },
  openGraph: {
    title: "Flickpick — Movie Ratings, Reviews & Recommendations",
    description:
      "Discover your next favorite movie with AI-powered recommendations and aggregated critic scores.",
    siteName: "Flickpick",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Flickpick — Movie Ratings, Reviews & Recommendations",
    description:
      "Discover your next favorite movie with AI-powered recommendations and aggregated critic scores.",
  },
};

function HeaderSearchForm() {
  return (
    <form action="/search" method="GET" className="relative">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
      />
      <input
        type="text"
        name="q"
        placeholder="Search movies..."
        className="w-48 lg:w-64 h-9 pl-9 pr-3 rounded-full bg-bg-tertiary border border-border-subtle text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
      />
    </form>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
        <header className="sticky top-0 z-50 bg-bg-secondary/80 backdrop-blur-xl border-b border-border-subtle">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2 group">
                <Film
                  size={24}
                  className="text-primary group-hover:text-primary-hover transition-colors"
                />
                <span className="text-xl font-bold text-text-primary tracking-tight">
                  Flickpick
                </span>
              </Link>
              <nav className="hidden sm:flex items-center gap-6">
                <Link
                  href="/"
                  className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Discover
                </Link>
                <Link
                  href="/search?q=top+rated"
                  className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Top Rated
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <HeaderSearchForm />
              <HeaderAuth />
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)]">{children}</main>

        <footer className="border-t border-border-subtle bg-bg-secondary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-text-tertiary">
              Flickpick. Ratings powered by TMDB, OMDb, Rotten Tomatoes,
              Metacritic.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Home
              </Link>
              <Link
                href="/search?q=popular"
                className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Browse
              </Link>
            </div>
          </div>
        </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
