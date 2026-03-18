"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { Profile } from "@/types";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    username: string
  ) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (
    updates: Partial<Pick<Profile, "username" | "display_name" | "avatar_url" | "bio" | "is_public">>
  ) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}

function writeCache(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function clearCache(...keys: string[]) {
  try { keys.forEach((k) => localStorage.removeItem(k)); } catch {}
}

const CACHE_USER = "fp_user";
const CACHE_PROFILE = "fp_profile";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readCache(CACHE_USER));
  const [profile, setProfile] = useState<Profile | null>(() => readCache(CACHE_PROFILE));
  const [session, setSession] = useState<Session | null>(null);
  // If we have a cached user, skip the loading state — header renders instantly
  const [isLoading, setIsLoading] = useState(() => !readCache(CACHE_USER));

  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching profile:", error);
    }
    const p = data as Profile | null;
    setProfile(p);
    if (p) writeCache(CACHE_PROFILE, p);
    return p;
  }, []);

  const ensureProfile = useCallback(
    async (user: User, username?: string) => {
      const supabase = getSupabase();
      // Check if profile exists
      const { data: existing } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (existing) {
        setProfile(existing as Profile);
        writeCache(CACHE_PROFILE, existing);
        return existing as Profile;
      }

      // Create profile for new user
      const derivedUsername =
        username ||
        user.user_metadata?.preferred_username ||
        user.email?.split("@")[0]?.replace(/[^a-zA-Z0-9]/g, "") ||
        `user${Date.now()}`;

      const { data: newProfile, error } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          username: derivedUsername,
          display_name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            null,
          avatar_url: user.user_metadata?.avatar_url || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating profile:", error);
        return null;
      }

      setProfile(newProfile as Profile);
      writeCache(CACHE_PROFILE, newProfile);
      return newProfile as Profile;
    },
    []
  );

  // Initialize: get current session and listen for changes
  useEffect(() => {
    const supabase = getSupabase();

    const init = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        setSession(currentSession);
        const u = currentSession?.user ?? null;
        setUser(u);
        if (u) writeCache(CACHE_USER, u);
        else clearCache(CACHE_USER, CACHE_PROFILE);
        setIsLoading(false);

        if (currentSession?.user) {
          fetchProfile(currentSession.user.id);
        }
      } catch (err) {
        console.error("Auth init error:", err);
        setIsLoading(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      const u = newSession?.user ?? null;
      setUser(u);
      if (u) writeCache(CACHE_USER, u);

      if (event === "SIGNED_IN" && newSession?.user) {
        const p = await fetchProfile(newSession.user.id);
        // If no profile exists yet (e.g. after signup or first OAuth), create one
        if (!p) {
          await ensureProfile(newSession.user);
        }
      }

      if (event === "SIGNED_OUT") {
        setProfile(null);
        clearCache(CACHE_USER, CACHE_PROFILE);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile, ensureProfile]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error: error.message };
      return { error: null };
    },
    []
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      username: string
    ): Promise<{ error: string | null }> => {
      const supabase = getSupabase();

      // Check username uniqueness
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .single();

      if (existingUser) {
        return { error: "Username is already taken" };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { preferred_username: username },
        },
      });

      if (error) return { error: error.message };

      // Auto-create profile
      if (data.user) {
        await ensureProfile(data.user, username);
      }

      return { error: null };
    },
    [ensureProfile]
  );

  const signInWithGoogle = useCallback(async (): Promise<{ error: string | null }> => {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    // Clear UI and cache immediately — don't wait for network
    setUser(null);
    setProfile(null);
    setSession(null);
    clearCache(CACHE_USER, CACHE_PROFILE);
    // Revoke server-side in background
    const supabase = getSupabase();
    supabase.auth.signOut().catch(() => {});
  }, []);

  const updateProfile = useCallback(
    async (
      updates: Partial<
        Pick<Profile, "username" | "display_name" | "avatar_url" | "bio" | "is_public">
      >
    ): Promise<{ error: string | null }> => {
      if (!user) return { error: "Not authenticated" };

      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

      if (error) return { error: error.message };
      setProfile(data as Profile);
      writeCache(CACHE_PROFILE, data);
      return { error: null };
    },
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      session,
      isLoading,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      updateProfile,
    }),
    [user, profile, session, isLoading, signIn, signUp, signInWithGoogle, signOut, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
