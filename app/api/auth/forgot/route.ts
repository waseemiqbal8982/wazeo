import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidEmail } from "@/lib/authMessages";

export async function POST(req: Request) {
  const rl = rateLimit(`forgot:${getClientIp(req)}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 });
  }

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

  const origin = new URL(req.url).origin;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  // Always return success to avoid leaking which emails exist.
  if (error) {
    return NextResponse.json({ error: "Something went wrong. Try again later." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
