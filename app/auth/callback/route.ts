import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "node:crypto";

// Handles:
//  1. OAuth provider callbacks (Google/X/GitHub) → ?code=... (session exchange)
//  2. Email confirmation link → ?token_hash=...&type=signup
//  3. Magic-link sign-in (incl. admin impersonation) → ?token_hash=...&type=magiclink
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "signup" | "magiclink" | "recovery" | null;
  const next = searchParams.get("next") || "/dashboard";
  const impersonating = searchParams.get("impersonate") === "1";

  const supabase = await createClient();
  const origin = new URL(request.url).origin;

  async function recordLogin(userId: string, method: string) {
    try {
      const admin = createAdminClient();
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      const ua = request.headers.get("user-agent") || "";
      await admin.from("login_history").insert({
        user_id: userId,
        method,
        ip_hash: createHash("sha256").update(ip).digest("hex").slice(0, 24),
        user_agent: ua.slice(0, 300),
      });
    } catch {}
  }

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
    await recordLogin(data.user.id, "oauth");
    return NextResponse.redirect(new URL(next, request.url));
  }

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/sign-in?error=verification_failed", request.url));
  }

  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error || !data.user) {
    // For impersonation links, fall back to the admin sign-in page.
    const u = new URL(type === "magiclink" ? "/sign-in" : "/verify-email", request.url);
    u.searchParams.set("error", "link_used_or_expired");
    if (next && next !== "/dashboard") u.searchParams.set("next", next);
    return NextResponse.redirect(u);
  }

  // Best-effort: ensure a profile row exists.
  let username = `user_${data.user.id.slice(0, 8)}`;
  try {
    const meta = data.user.user_metadata || {};
    username = String(meta.username || meta.full_name?.split(" ")[0] || data.user.email?.split("@")[0] || `user_${data.user.id.slice(0, 8)}`);
    await supabase.from("profiles").upsert(
      { id: data.user.id, username, email: data.user.email || null },
      { onConflict: "id" }
    );
  } catch {}

  await recordLogin(data.user.id, type === "signup" ? "email_link" : type === "magiclink" ? "magiclink" : "recovery");

  if (impersonating && type === "magiclink") {
    const res = NextResponse.redirect(new URL(next, request.url));
    res.cookies.set("wazeo-impersonating", username, { path: "/" });
    return res;
  }

  return NextResponse.redirect(new URL(next, request.url));
}

