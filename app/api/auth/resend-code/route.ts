import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
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
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  // Limit resend frequency (3 per minute per IP).
  const rl = rateLimit(`otp-resend:${getClientIp(req)}`, 3, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Please wait a moment before requesting another code.", retryAfter: rl.retryAfter },
      { status: 429 }
    );
  }

  const origin = new URL(req.url).origin;
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  // Always return success to avoid leaking which emails exist.
  if (error) {
    return NextResponse.json({ error: "Something went wrong. Try again later." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
