import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rateLimit";
import { isValidEmail } from "@/lib/authMessages";

export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  // Rate limit: 3 requests per hour per email (generic message, no leaks).
  const rl = rateLimit(`forgot:${email}`, 3, 3600_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: true });
  }

  const origin = new URL(req.url).origin;
  const supabase = await createClient();
  // Route through /auth/callback so the recovery session is established, then open
  // /reset-password.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Always return success to avoid leaking which emails exist.
  return NextResponse.json({ ok: true });
}
