import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidEmail } from "@/lib/authMessages";

const COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60);

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

  // Rate-limit resend frequency (3 per minute per IP).
  const rl = rateLimit(`otp-resend:${getClientIp(req)}`, 3, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Please wait a moment before requesting another code.", retryAfter: rl.retryAfter },
      { status: 429 }
    );
  }

  const admin = createAdminClient();

  // DB-backed resend cooldown (per email).
  try {
    const { data: row } = await admin.from("email_otps").select("*").eq("email", email).maybeSingle();
    if (row?.last_sent_at) {
      const sent = new Date(row.last_sent_at).getTime();
      const remaining = sent + COOLDOWN_SECONDS * 1000 - Date.now();
      if (remaining > 0) {
        const s = Math.max(1, Math.ceil(remaining / 1000));
        return NextResponse.json(
          { error: `Please wait ${s}s before requesting another code.`, retryAfter: s },
          { status: 429 }
        );
      }
    }
  } catch {}

  const origin = new URL(req.url).origin;
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    return NextResponse.json({ error: "Something went wrong. Try again later." }, { status: 400 });
  }

  // Record the send (new code is now the active one; reset attempts).
  try {
    await admin.from("email_otps").upsert(
      {
        email,
        purpose: "signup",
        last_sent_at: new Date().toISOString(),
        attempts: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    );
  } catch {}

  return NextResponse.json({ ok: true });
}
