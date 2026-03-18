"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const USERNAME_REGEX = /^[a-zA-Z0-9]{3,30}$/;

export default function SignUpPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle, user, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  const validateUsername = (value: string): string | null => {
    if (value.length < 3) return "Username must be at least 3 characters";
    if (value.length > 30) return "Username must be 30 characters or less";
    if (/\s/.test(value)) return "Username cannot contain spaces";
    if (!USERNAME_REGEX.test(value))
      return "Username can only contain letters and numbers";
    return null;
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (value.length > 0) {
      setUsernameError(validateUsername(value));
    } else {
      setUsernameError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const uError = validateUsername(username);
    if (uError) {
      setUsernameError(uError);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);

    const { error: signUpError } = await signUp(email, password, username);

    if (signUpError) {
      setError(signUpError);
      setIsSubmitting(false);
    } else {
      router.replace("/onboarding");
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    const { error: googleError } = await signInWithGoogle();
    if (googleError) {
      setError(googleError);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] px-4">
      <div className="w-full max-w-md">
        <div className="bg-bg-elevated border border-border-subtle rounded-[var(--radius-lg)] p-8 shadow-[var(--shadow-lg)]">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              Create your account
            </h1>
            <p className="text-text-secondary text-sm">
              Join Flickpick and discover your next favorite movie
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-text-secondary mb-1.5"
              >
                Username
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
                />
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="yourname"
                  className={`w-full h-11 pl-10 pr-4 rounded-[var(--radius-md)] bg-bg-tertiary border text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:ring-2 transition-all ${
                    usernameError
                      ? "border-red-500/50 focus:ring-red-500/30 focus:border-red-500"
                      : "border-border-subtle focus:ring-gold/30 focus:border-gold"
                  }`}
                  autoComplete="username"
                />
              </div>
              {usernameError && (
                <p className="mt-1 text-xs text-red-500">{usernameError}</p>
              )}
              {!usernameError && username.length > 0 && (
                <p className="mt-1 text-xs text-score-high">
                  Username looks good
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-secondary mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
                />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-11 pl-10 pr-4 rounded-[var(--radius-md)] bg-bg-tertiary border border-border-subtle text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-secondary mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full h-11 pl-10 pr-11 rounded-[var(--radius-md)] bg-bg-tertiary border border-border-subtle text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !!usernameError}
              className="w-full h-11 rounded-[var(--radius-md)] bg-gold hover:bg-gold-hover text-bg-primary font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-subtle" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-bg-elevated text-text-tertiary">
                or continue with
              </span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full h-11 rounded-[var(--radius-md)] border border-border-subtle bg-bg-tertiary hover:bg-bg-primary text-text-primary font-medium text-sm transition-colors flex items-center justify-center gap-3"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                fill="#EA4335"
              />
            </svg>
            Google
          </button>

          <p className="mt-6 text-center text-sm text-text-secondary">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-gold hover:text-gold-hover font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
