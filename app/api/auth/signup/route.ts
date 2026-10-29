import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { authErrorMessage, isValidEmail } from "@/lib/authMessages";
import { createHash } from "node:crypto";
import { runHooks } from "@/lib/hooks";
import {
  requireEmailVerifyAtSignup,
  isDisposableEmail,
} from "@/lib/authPolicy";

/** Generate a unique username from the email prefix (base + digits if taken). */
async function makeUniqueUsername(base: string, admin: ReturnType<typeof createAdminClient>): Promise<string> {
  const clean = base.replace(/[^a-zA-Z0-9_.]/g, "").slice(0, 20) || "user";
  // check if exact exists
  const { data: exact } = await admin.from("profiles").select("id").eq("username", clean).limit(1);
  if (!exact || exact.length === 0) return clean;
  for (let i = 1; i <= 999; i++) {
    const candidate = `${clean.slice(0, 17)}${i}`;
    const { data: row } = await admin.from("profiles").select("id").eq("username", candidate).limit(1);
    if (!row || row.length === 0) return candidate;
  }
  return `${clean.slice(0, 12)}_${Date.now().toString(36)}`;
}

export async function POST(req: Request) {
  // Abuse protection (always applies): 5 sign-ups / hour per IP hash.
  const rl = rateLimit(`signup:${getClientIp(req)}`, 5, 3600_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  let body: { email?: string; password?: string; website?: string; phone?: string; form_start?: number; started_at?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: humans never see this field; bots auto-fill it.
  if (body.website) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Minimum form-fill time (a human takes >2s to fill the form).
  const fillStarted = Number(body.form_start ?? body.started_at ?? 0);
  const fillMs = fillStarted && Number.isFinite(fillStarted) ? Date.now() - fillStarted : NaN;
  if (!Number.isFinite(fillMs) || fillMs < 2000) {
    return NextResponse.json({ error: "Invalid request. Please fill the form again." }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  // Reject disposable-email domains (always applies).
  if (await isDisposableEmail(email)) {
    return NextResponse.json({ error: "Please use a permanent email address." }, { status: 400 });
  }

  // Invite-only gate: when ON, plain signup is blocked (access keys are used instead).
  try {
    const admin0 = createAdminClient();
    const { data: settingsRow } = await admin0.from("settings").select("value").eq("key", "invite_only").maybeSingle();
    if (settingsRow?.value === "true") {
      return NextResponse.json({ error: "Sign-up is invite only. A valid access key is required." }, { status: 400 });
    }
  } catch {}

  const ipHash = createHash("sha256").update(getClientIp(req)).digest("hex").slice(0, 24);

  // Country: server-side detection from request headers; "unknown" if it fails.
  const headerCountry = (req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || "").toUpperCase().slice(0, 2);
  const country = /^[A-Z]{2}$/.test(headerCountry) ? headerCountry : "unknown";

  const langByCountry: Record<string, string> = { PK: "ur", IN: "hi", CN: "zh" };
  const defaultLang = langByCountry[country] || "en";

  // Referral: read silently from the wazeo-referral cookie (set by /r/<code>).
  let referral = "";
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/(?:^|;\s*)wazeo-referral=([^;]*)/);
    if (match) referral = decodeURIComponent(match[1]).trim();
  } catch {}

  const admin = createAdminClient();
  const username = await makeUniqueUsername(email.split("@")[0], admin);

  const origin = new URL(req.url).origin;
  const supabase = await createClient();

  // Does the admin require email verification at sign-up? Default OFF.
  const requireVerify = await requireEmailVerifyAtSignup();

  if (!requireVerify) {
    // ---- Switch OFF: create a confirmed user via the admin API (no email
    // sent), sign the user in, and open the dashboard. ---------------------
    const { data: created, error: ce } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        referral: referral || undefined,
        ip_hash: ipHash,
        country,
        language: defaultLang,
      },
    });
    if (ce || !created?.user?.id) {
      return NextResponse.json({ error: authErrorMessage(ce || { message: "Could not create account." }) }, { status: 400 });
    }
    const uid = created.user.id;
    try {
      await runHooks("user.signup", { userId: uid, referralCode: referral || undefined });
    } catch {}
    try {
      await admin.from("profiles").upsert(
        { id: uid, username, signup_ip_hash: ipHash, country, language: defaultLang, referral_used: referral || null },
        { onConflict: "id" }
      );
    } catch {}
    // Establish a session so the user lands signed-in on the dashboard.
    try {
      await supabase.auth.signInWithPassword({ email, password });
    } catch {}
    return NextResponse.json({ ok: true, needsConfirm: false });
  }

  // ---- Switch ON: legacy signup flow (confirmation link/OTP). ------------
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: { username, referral: referral || undefined, ip_hash: ipHash, country, language: defaultLang },
    },
  });

  if (error) {
    return NextResponse.json({ error: authErrorMessage(error) }, { status: 400 });
  }

  if (data.user && data.user.id) {
    try {
      await runHooks("user.signup", { userId: data.user.id, referralCode: referral || undefined });
    } catch {}
    try {
      await admin.from("profiles").upsert(
        { id: data.user.id, username, signup_ip_hash: ipHash, country, language: defaultLang, referral_used: referral || null },
        { onConflict: "id" }
      );
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
  }

  const needsConfirm = !data.session || data.user?.identities?.length === 0;
  return NextResponse.json({ ok: true, needsConfirm });
}
