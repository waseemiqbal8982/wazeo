import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitCheck, rateLimitHit, getClientIp } from "@/lib/rateLimit";
import { isValidEmail } from "@/lib/authMessages";

const MAX_ATTEMPTS = 5;
const LOCK_MS = 10 * 60 * 1000;
// Generous IP limit (60 per 10 minutes). Correct codes never count against it.
const IP_LIMIT = 60;
const IP_WINDOW_MS = 10 * 60 * 1000;

function otpLength(): number {
  const raw = Number(process.env.NEXT_PUBLIC_OTP_LENGTH || 6);
  if (Number.isFinite(raw)) return Math.max(4, Math.min(10, Math.floor(raw)));
  return 6;
}

export async function POST(req: Request) {
  const len = otpLength();
  const tokenRe = new RegExp(`^\\d{${len}}$`);

  let body: { email?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const token = (body.token || "").replace(/\D/g, "").slice(0, len);

  if (!isValidEmail(email) || !tokenRe.test(token)) {
    return NextResponse.json({ error: `Enter the ${len}-digit code from your email.` }, { status: 400 });
  }

  const admin = createAdminClient();

  // ╞ 1. Per-email DB-backed limit (5 wrong attempts per 10 minutes). The lock
  // state lives in the DB so a correct code is never rejected because of other
  // users or other server instances.
  try {
    const { data: row } = await admin.from("email_otps").select("locked_until").eq("email", email).maybeSingle();
    if (row?.locked_until) {
      const lock = new Date(row.locked_until).getTime();
      if (Date.now() < lock) {
        const s = Math.max(1, Math.ceil((lock - Date.now()) / 1000));
        return NextResponse.json({ error: `Too many wrong attempts. Please wait ${s}s.`, retryAfter: s }, { status: 429 });
      }
    }
  } catch {}

  // ╞ 2. Generous IP limit (60/10min) — check only; we never record here, so
  // correct codes never count toward it.
  const ipKey = `otp-verify-ip:${getClientIp(req)}`;
  const ipCheck = rateLimitCheck(ipKey, IP_LIMIT, IP_WINDOW_MS);
  if (!ipCheck.ok) {
    return NextResponse.json(
      { error: "Too many verification attempts from this device. Please wait and try again.", retryAfter: ipCheck.retryAfter },
      { status: 429 }
    );
  }

  const supabase = await createClient();

  const attempt = async (type: "signup" | "email") => {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type });
    return { user: data.user, error };
  };

  // ╞ 3. Verify. type "signup" first, fallback to "email".
  let { user, error } = await attempt("signup");
  if (error && !user) {
    const fallback = await attempt("email");
    user = fallback.user;
    error = fallback.error;
  }

  if (error || !user) {
    const msg = error?.message || "Invalid code.";

    // Map Supabase errors to clear messages.
    if (/expired/i.test(msg)) {
      return NextResponse.json({ error: "This code has expired. Please request a new one." }, { status: 400 });
    }
    if (/already|used/i.test(msg)) {
      return NextResponse.json({ error: "This code has already been used. Use the newest code." }, { status: 400 });
    }
    if (/invalid|incorrect|token/i.test(msg)) {
      // Record the wrong attempt for this email in the DB.
      let attempts = 1;
      let lockUntil: string | null = null;
      try {
        const { data: row } = await admin.from("email_otps").select("attempts").eq("email", email).maybeSingle();
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
      // Record the IP hit only for wrong attempts (never for correct codes).
      rateLimitHit(ipKey, IP_LIMIT, IP_WINDOW_MS);
      if (lockUntil) {
        return NextResponse.json(
          { error: "Too many wrong attempts. Please wait 10 minutes and try again.", retryAfter: 600 },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: "Incorrect code. Please check the latest email and try again." }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to verify this code. Please request a new one." }, { status: 400 });
  }

  // Success — reset attempt/lock state + IP is not touched.
  try {
    await admin.from("email_otps").upsert(
      { email, purpose: "signup", attempts: 0, locked_until: null, updated_at: new Date().toISOString() },
      { onConflict: "email" }
    );
  } catch {}

  // Ensure the profile row exists (carry over any metadata fields).
  try {
    const { data: existing } = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (!existing) {
      const meta = user.user_metadata || {};
      const username = String(meta.username || `user_${user.id.slice(0, 8)}`);
      await admin.from("profiles").upsert(
        {
          id: user.id,
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
