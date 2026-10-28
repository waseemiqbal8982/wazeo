import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidEmail } from "@/lib/authMessages";

const MAX_ATTEMPTS = 5;
const LOCK_MS = 10 * 60 * 1000;
const EXPIRY_SECONDS = Number(process.env.OTP_EXPIRY_SECONDS || 300);

export async function POST(req: Request) {
  let body: { email?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const token = (body.token || "").trim();

  if (!isValidEmail(email) || !/^\d{6}$/.test(token)) {
    return NextResponse.json({ error: "Enter the 6-digit code from your email." }, { status: 400 });
  }

  // Limit to 5 wrong attempts per 10 minutes (per email + IP).
  const rl = rateLimit(`otp-verify:${getClientIp(req)}:${email}`, 5, 600_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many wrong attempts. Please wait 10 minutes and try again.", retryAfter: rl.retryAfter },
      { status: 429 }
    );
  }

  const admin = createAdminClient();

  // Policy checks (DB-backed): locked + expired.
  try {
    const { data: row } = await admin.from("email_otps").select("*").eq("email", email).maybeSingle();
    if (row?.locked_until) {
      const lock = new Date(row.locked_until).getTime();
      if (Date.now() < lock) {
        const s = Math.max(1, Math.ceil((lock - Date.now()) / 1000));
        return NextResponse.json({ error: `Too many wrong attempts. Try again in ${s}s.`, retryAfter: s }, { status: 429 });
      }
    }
    if (row?.last_sent_at) {
      const sent = new Date(row.last_sent_at).getTime();
      if (Date.now() - sent > EXPIRY_SECONDS * 1000) {
        return NextResponse.json({ error: "This code has expired. Please request a new one." }, { status: 400 });
      }
    }
  } catch {}

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });

  if (error || !data.user) {
    const msg = error?.message || "Invalid code.";
    let attempts = 1;
    let lockUntil: string | null = null;
    try {
      const { data: row } = await admin.from("email_otps").select("*").eq("email", email).maybeSingle();
      if (row) attempts = (Number(row.attempts) || 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        lockUntil = new Date(Date.now() + LOCK_MS).toISOString();
        await admin.from("email_otps").upsert(
          { email, purpose: "signup", attempts, locked_until: lockUntil, updated_at: new Date().toISOString() },
          { onConflict: "email" }
        );
      } else {
        await admin.from("email_otps").upsert(
          { email, purpose: "signup", attempts, updated_at: new Date().toISOString() },
          { onConflict: "email" }
        );
      }
    } catch {}
    if (/expired/i.test(msg)) {
      return NextResponse.json({ error: "This code has expired. Please request a new one." }, { status: 400 });
    }
    if (lockUntil) {
      return NextResponse.json(
        { error: "Too many wrong attempts. Please wait 10 minutes and try again.", retryAfter: 600 },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "Incorrect code. Please check the latest email and try again." }, { status: 400 });
  }

  // Success — reset attempt/lock state.
  try {
    await admin.from("email_otps").upsert(
      { email, purpose: "signup", attempts: 0, locked_until: null, updated_at: new Date().toISOString() },
      { onConflict: "email" }
    );
  } catch {}

  // Ensure the profile row exists (carry over any metadata fields).
  try {
    const { data: existing } = await admin.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
    if (!existing) {
      const meta = data.user.user_metadata || {};
      const username = String(meta.username || `user_${data.user.id.slice(0, 8)}`);
      await admin.from("profiles").upsert(
        {
          id: data.user.id,
          username,
          phone: meta.phone ? String(meta.phone) : null,
          country: meta.country ? String(meta.country).toUpperCase().slice(0, 2) : null,
          language: ["en", "ur", "hi", "fr", "zh"].includes(meta.language) ? meta.language : "en",
          signup_ip_hash: meta.ip_hash ? String(meta.ip_hash) : null,
          referral_used: meta.referral ? String(meta.referral) : null,
        },
        { onConflict: "id" }
      );
    }
  } catch {}

  return NextResponse.json({ ok: true });
}
