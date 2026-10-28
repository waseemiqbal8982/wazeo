import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles:
//  1. OAuth provider callbacks (Google/X/GitHub) → ?code=... (session exchange)
//  2. Email confirmation link → ?token_hash=...&type=signup
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "signup" | null;
  const next = searchParams.get("next") || "/dashboard";

  const supabase = await createClient();

  // (1) OAuth callback — exchange the authorization code for a session.
  const code = searchParams.get("code");
  if (code && !tokenHash) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      const u = new URL("/sign-in", request.url);
      u.searchParams.set("error", "oauth_failed");
      return NextResponse.redirect(u);
    }
    // Best-effort: ensure a profile row exists (OAuth users may not have one yet).
    try {
      const meta = data.user.user_metadata || {};
      const username = String(
        meta.username ||
          meta.full_name?.split(" ")[0] ||
          meta.name?.split(" ")[0] ||
          data.user.email?.split("@")[0] ||
          `user_${data.user.id.slice(0, 8)}`
      );
      await supabase.from("profiles").upsert(
        { id: data.user.id, username, email: data.user.email || null },
        { onConflict: "id" }
      );
    } catch {}
    return NextResponse.redirect(new URL(next, request.url));
  }

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/sign-in?error=verification_failed", request.url));
  }

  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error || !data.user) {
    const u = new URL("/verify-email", request.url);
    u.searchParams.set("error", "link_used_or_expired");
    if (next && next !== "/dashboard") u.searchParams.set("next", next);
    return NextResponse.redirect(u);
  }

  // Best-effort: ensure a profile row exists.
  try {
    const meta = data.user.user_metadata || {};
    const username = String(meta.username || `user_${data.user.id.slice(0, 8)}`);
    await supabase.from("profiles").upsert(
      { id: data.user.id, username },
      { onConflict: "id" }
    );
  } catch {}

  return NextResponse.redirect(new URL(next, request.url));
}
