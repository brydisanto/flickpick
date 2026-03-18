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
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 text-center bg-bg-primary">
      {/* Logo mark */}
      <div className="mb-8 flex items-center gap-2">
        <svg width="22" height="18" viewBox="0 0 28 20" fill="none" aria-hidden="true">
          <path d="M2 2C2 0.9 2.9 0 4 0H10V3C10 3.55 10.45 4 11 4C11.55 4 12 3.55 12 3V0H24C25.1 0 26 0.9 26 2V7C24.9 7 24 7.9 24 9V11C24 12.1 24.9 13 26 13V18C26 19.1 25.1 20 24 20H12V17C12 16.45 11.55 16 11 16C10.45 16 10 16.45 10 17V20H4C2.9 20 2 19.1 2 18V2Z" fill="var(--gold)"/>
          <line x1="11" y1="7" x2="11" y2="8.5" stroke="var(--bg-primary)" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="11" y1="11.5" x2="11" y2="13" stroke="var(--bg-primary)" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <span className="text-[22px] tracking-[0.04em] font-[family-name:var(--font-display)] uppercase">
          FLICKPICK
        </span>
      </div>

      {/* 404 */}
      <h1 className="text-[8rem] sm:text-[10rem] font-[family-name:var(--font-body)] font-extrabold leading-none text-text-tertiary/30 select-none">
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
