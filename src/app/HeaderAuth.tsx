"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { User, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function HeaderAuth() {
  const { user, profile, isLoading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-bg-tertiary animate-pulse" />
    );
  }

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="h-9 px-4 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors flex items-center gap-2"
      >
        Sign in
      </Link>
    );
  }

  const avatarUrl = profile?.avatar_url;
  const displayName =
    profile?.display_name || profile?.username || user.email?.split("@")[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-full hover:bg-bg-tertiary transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="User menu"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={28}
            height={28}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center">
            <User size={14} className="text-primary" />
          </div>
        )}
        <span className="hidden sm:block text-sm font-medium text-text-primary max-w-[120px] truncate">
          {displayName}
        </span>
        <ChevronDown
          size={14}
          className={`text-text-tertiary transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-bg-elevated border border-border-subtle rounded-xl shadow-[var(--shadow-lg)] py-1 z-50">
          <div className="px-4 py-3 border-b border-border-subtle">
            <p className="text-sm font-medium text-text-primary truncate">
              {displayName}
            </p>
            {user.email && (
              <p className="text-xs text-text-tertiary truncate">
                {user.email}
              </p>
            )}
          </div>

          <Link
            href={`/profile/${profile?.username || ""}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <User size={16} />
            Your Profile
          </Link>

          <button
            onClick={async () => {
              setOpen(false);
              await signOut();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
