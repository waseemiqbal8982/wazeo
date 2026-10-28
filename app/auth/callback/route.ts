import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the email confirmation *link* (the second way users can verify).
// Supabase redirects here with ?token_hash=...&type=signup.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "signup" | null;
  const next = searchParams.get("next") || "/dashboard";

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/sign-in?error=verification_failed", request.url));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/sign-in?error=verification_failed", request.url));
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
