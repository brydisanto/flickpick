import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-bg-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold tracking-tight text-text-primary">
              flick<span className="text-primary">pick</span>
            </span>
          </div>

          {/* Nav links */}
          <nav aria-label="Footer navigation" className="flex items-center gap-6">
            <Link
              href="/about"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              About
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Terms
            </Link>
          </nav>

          {/* Copyright */}
          <p className="text-xs text-text-tertiary">
            &copy; {currentYear} Flickpick. Data from TMDB.
          </p>
        </div>
      </div>
    </footer>
  );
}
