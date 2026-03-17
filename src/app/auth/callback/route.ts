import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_code`);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(`${origin}/auth/login?error=config`);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
  }

  const user = data.session.user;

  // Check if this user already has a profile (returning user)
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (existingProfile) {
    // Returning user — go to home
    return NextResponse.redirect(`${origin}/`);
  }

  // New user — create profile and send to onboarding
  const username =
    user.user_metadata?.preferred_username ||
    user.email?.split("@")[0]?.replace(/[^a-zA-Z0-9]/g, "") ||
    `user${Date.now()}`;

  await supabase.from("profiles").insert({
    id: user.id,
    username,
    display_name:
      user.user_metadata?.full_name || user.user_metadata?.name || null,
    avatar_url: user.user_metadata?.avatar_url || null,
  });

  return NextResponse.redirect(`${origin}/onboarding`);
}
