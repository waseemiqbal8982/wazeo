import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidEmail } from "@/lib/authMessages";

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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });

  if (error || !data.user) {
    const msg = error?.message || "Invalid code.";
    // Supabase returns the same message for expired and wrong codes.
    if (/expired|invalid/i.test(msg)) {
      return NextResponse.json(
        { error: "This code is incorrect or has expired. Please request a new one." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Could not verify the code. Try again." }, { status: 400 });
  }

  // Ensure the profile row exists (carry over any metadata fields).
  try {
    const admin = createAdminClient();
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
