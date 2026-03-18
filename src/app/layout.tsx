import type { Metadata } from "next";
import { Instrument_Serif, Sora } from "next/font/google";
import Link from "next/link";
import { Search, Menu, X } from "lucide-react";
import { AuthProvider } from "@/lib/auth-context";
import { HeaderAuth } from "./HeaderAuth";
import MobileNav from "./MobileNav";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const sora = Sora({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
        className="absolute left-3 top-1/2 -translate-y-1/2 text-bg-primary/40 pointer-events-none"
      />
      <input
        type="text"
        name="q"
        placeholder="Search films..."
        className="w-44 lg:w-64 h-9 pl-8 pr-3 bg-white/8 border border-white/10 rounded-[var(--radius-md)] text-xs font-medium text-bg-primary placeholder:text-bg-primary/40 focus:outline-none focus:border-gold transition-colors uppercase tracking-wide"
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
      <body className={`${instrumentSerif.variable} ${sora.variable} antialiased`}>
        <AuthProvider>
        {/* Film grain */}
        <div className="film-grain" aria-hidden="true" />

        <header className="sticky top-0 z-50 header-dark">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2 group">
                <svg width="22" height="18" viewBox="0 0 28 20" fill="none" aria-hidden="true">
                  <path d="M2 2C2 0.9 2.9 0 4 0H10V3C10 3.55 10.45 4 11 4C11.55 4 12 3.55 12 3V0H24C25.1 0 26 0.9 26 2V7C24.9 7 24 7.9 24 9V11C24 12.1 24.9 13 26 13V18C26 19.1 25.1 20 24 20H12V17C12 16.45 11.55 16 11 16C10.45 16 10 16.45 10 17V20H4C2.9 20 2 19.1 2 18V2Z" fill="var(--gold)"/>
                  <line x1="11" y1="7" x2="11" y2="8.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                  <line x1="11" y1="11.5" x2="11" y2="13" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                <span className="text-[22px] tracking-[0.04em] font-[family-name:var(--font-display)] text-bg-primary uppercase">
                  FLICKPICK
                </span>
              </Link>
              <nav className="hidden sm:flex items-center gap-6">
                <Link
                  href="/"
                  className="t-meta text-bg-primary/60 hover:text-gold transition-colors"
                >
                  Discover
                </Link>
                <Link
                  href="/top-rated"
                  className="t-meta text-bg-primary/60 hover:text-gold transition-colors"
                >
                  Top 150
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
              <svg width="14" height="12" viewBox="0 0 28 20" fill="none" aria-hidden="true">
                <path d="M2 2C2 0.9 2.9 0 4 0H10V3C10 3.55 10.45 4 11 4C11.55 4 12 3.55 12 3V0H24C25.1 0 26 0.9 26 2V7C24.9 7 24 7.9 24 9V11C24 12.1 24.9 13 26 13V18C26 19.1 25.1 20 24 20H12V17C12 16.45 11.55 16 11 16C10.45 16 10 16.45 10 17V20H4C2.9 20 2 19.1 2 18V2Z" fill="var(--gold)"/>
                <line x1="11" y1="7" x2="11" y2="8.5" stroke="var(--bg-primary)" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="11" y1="11.5" x2="11" y2="13" stroke="var(--bg-primary)" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <span className="text-sm tracking-[0.04em] font-[family-name:var(--font-display)] uppercase">
                FLICKPICK
              </span>
              <p className="t-meta text-text-tertiary">
                Ratings via TMDB, OMDb, RT, Metacritic
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/" className="t-meta text-text-tertiary hover:text-text-secondary transition-colors">
                Home
              </Link>
              <Link href="/top-rated" className="t-meta text-text-tertiary hover:text-text-secondary transition-colors">
                Top 150
              </Link>
            </div>
          </div>
        </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
