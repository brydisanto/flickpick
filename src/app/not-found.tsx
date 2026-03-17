"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const LOST_QUOTES = [
  { quote: "Toto, I\u2019ve a feeling we\u2019re not in Kansas anymore.", film: "The Wizard of Oz" },
  { quote: "Houston, we have a problem.", film: "Apollo 13" },
  { quote: "Here\u2019s looking at you, kid. But not at this page.", film: "Casablanca" },
  { quote: "You shall not pass! ...because this page doesn\u2019t exist.", film: "Lord of the Rings" },
  { quote: "I see dead pages.", film: "The Sixth Sense" },
];

export default function NotFound() {
  const [quoteIdx, setQuoteIdx] = useState(0);

  useEffect(() => {
    setQuoteIdx(Math.floor(Math.random() * LOST_QUOTES.length));
  }, []);

  const { quote, film } = LOST_QUOTES[quoteIdx];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-bg-primary">
      {/* Logo mark */}
      <div className="mb-8">
        <span className="text-gold-gradient text-2xl font-bold tracking-tight">
          flickpick
        </span>
      </div>

      {/* 404 */}
      <h1 className="text-[8rem] sm:text-[10rem] font-black leading-none text-text-tertiary/30 select-none">
        404
      </h1>

      {/* Quote */}
      <div className="max-w-md mt-4 animate-fade-in-up">
        <p className="text-xl sm:text-2xl font-medium text-text-primary leading-relaxed">
          &ldquo;{quote}&rdquo;
        </p>
        <p className="mt-3 text-sm text-text-secondary italic">
          &mdash; {film}
        </p>
      </div>

      {/* CTA */}
      <Link
        href="/"
        className="mt-10 inline-flex items-center gap-2 px-8 py-3.5 bg-gold text-bg-primary rounded-[var(--radius-md)] font-semibold shadow-[var(--shadow-md)] hover:bg-gold-hover hover:shadow-[var(--shadow-lg)] transition-all duration-200"
      >
        <ArrowLeft size={18} />
        Back to Home
      </Link>
    </div>
  );
}
