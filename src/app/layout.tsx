import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { Search } from "lucide-react";
import { AuthProvider } from "@/lib/auth-context";
import { HeaderAuth } from "./HeaderAuth";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Flickpick — Movie Ratings, Reviews & Recommendations",
  description:
    "Discover your next favorite movie. Flickpick aggregates ratings from Rotten Tomatoes, IMDb, and Metacritic, then uses AI to recommend films tailored to your taste.",
  manifest: "/manifest.json",
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
        className="w-48 lg:w-72 h-9 pl-9 pr-3 rounded-[var(--radius-md)] bg-bg-tertiary border border-border-subtle text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-border-accent transition-all"
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
    <html lang="en" className="dark">
      <body
        className={`${jakarta.variable} ${jetbrains.variable} antialiased`}
      >
        <AuthProvider>
        {/* Film grain overlay */}
        <div className="film-grain" aria-hidden="true" />

        <header className="sticky top-0 z-50 glass">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
            <div className="flex items-center gap-10">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-[6px] bg-gold flex items-center justify-center shrink-0 group-hover:shadow-[0_0_16px_rgba(212,168,67,0.4)] transition-shadow">
                  <span className="text-[13px] font-bold text-bg-primary tracking-tight">Fp</span>
                </div>
                <span className="text-[22px] font-bold tracking-tight">
                  <span className="text-text-primary">Flick</span>
                  <span className="text-gold">pick</span>
                </span>
              </Link>
              <nav className="hidden sm:flex items-center gap-8">
                <Link
                  href="/"
                  className="text-[13px] font-medium uppercase tracking-[0.06em] text-text-tertiary hover:text-text-primary transition-colors"
                >
                  Discover
                </Link>
                <Link
                  href="/top-rated"
                  className="text-[13px] font-medium uppercase tracking-[0.06em] text-text-tertiary hover:text-text-primary transition-colors"
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

        <main className="min-h-[calc(100vh-4.5rem)]">{children}</main>

        <footer className="border-t border-border-subtle bg-bg-secondary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-[3px] bg-gold flex items-center justify-center">
                <span className="text-[8px] font-bold text-bg-primary">Fp</span>
              </div>
              <p className="text-sm text-text-tertiary">
                Flickpick. Ratings powered by TMDB, OMDb, Rotten Tomatoes,
                Metacritic.
              </p>
            </div>
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
