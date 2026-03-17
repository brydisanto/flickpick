import Link from "next/link";
import { Film } from "lucide-react";

export default function MovieNotFound() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
      <Film
        size={56}
        className="mx-auto text-text-tertiary mb-4"
        strokeWidth={1.5}
      />
      <h1 className="text-2xl font-bold text-text-primary mb-2">
        Movie Not Found
      </h1>
      <p className="text-text-secondary max-w-md mx-auto mb-6">
        We couldn&apos;t find the movie you&apos;re looking for. It may have
        been removed or the link might be incorrect.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[var(--radius-md)] bg-primary text-white font-medium text-sm hover:bg-primary-hover transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}
