import type { Metadata } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import Link from "next/link";
import { Search, Menu, X } from "lucide-react";
import { AuthProvider } from "@/lib/auth-context";
import { HeaderAuth } from "./HeaderAuth";
import MobileNav from "./MobileNav";
import "./globals.css";

const bebas = Bebas_Neue({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
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
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
      />
      <input
        type="text"
        name="q"
        placeholder="Search films..."
        className="w-44 lg:w-64 h-9 pl-8 pr-3 bg-bg-elevated border border-border-subtle rounded-[var(--radius-md)] text-xs font-medium text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold transition-colors uppercase tracking-wide"
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
      <body className={`${bebas.variable} ${inter.variable} antialiased`}>
        <AuthProvider>
        {/* Film grain */}
        <div className="film-grain" aria-hidden="true" />

        <header className="sticky top-0 z-50 glass">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2 group">
                <span className="text-[28px] tracking-[2px] font-[family-name:var(--font-display)]">
                  FLICKPICK
                </span>
                <span className="text-gold text-lg leading-none">•</span>
              </Link>
              <nav className="hidden sm:flex items-center gap-6">
                <Link
                  href="/"
                  className="t-meta text-text-secondary hover:text-gold transition-colors"
                >
                  Discover
                </Link>
                <Link
                  href="/top-rated"
                  className="t-meta text-text-secondary hover:text-gold transition-colors"
                >
                  Top Rated
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <HeaderSearchForm />
              </div>
              <HeaderAuth />
              <MobileNav />
            </div>
          </div>
        </header>

        <main className="relative z-[2] min-h-[calc(100vh-3.5rem)]">{children}</main>

        <footer className="relative z-[2] border-t-[1.5px] border-border bg-bg-primary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm tracking-[1px] font-[family-name:var(--font-display)]">
                FLICKPICK
              </span>
              <span className="text-gold text-xs">•</span>
              <p className="t-meta text-text-tertiary">
                Ratings via TMDB, OMDb, RT, Metacritic
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/" className="t-meta text-text-tertiary hover:text-text-secondary transition-colors">
                Home
              </Link>
              <Link href="/top-rated" className="t-meta text-text-tertiary hover:text-text-secondary transition-colors">
                Top Rated
              </Link>
            </div>
          </div>
        </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
