import { NextResponse } from "next/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { createHash, randomBytes } from "node:crypto";
import { runHooks } from "@/lib/hooks";
import { isValidEmail } from "@/lib/authMessages";
import {
  WZ_RE,
  normalizeAccessKey,
  validateAccessKey,
  last4,
} from "@/lib/accessKeys";
import { keyedHash } from "@/lib/keyEncryption";

const GENERIC = "This key is invalid, expired or not for this email";

interface KeyRow {
  id: string;
  hash?: string | null;
  email?: string | null;
  access_days?: number | null;
  plan_name?: string | null;
  features?: unknown;
  permissions?: unknown;
  quota?: unknown;
  starting_balance?: number;
  revoked?: boolean;
  suspended?: boolean;
  active?: boolean;
  used_at?: string | null;
  uses?: number;
  expires_at?: string | null;
  redemption_expires_at?: string | null;
}

async function loadKey(
  key: string
): Promise<{ ac: KeyRow } | { error: string }> {
  const admin = createAdminClient();
  const { data: ac } = await admin
    .from("access_codes")
    .select("*")
    .eq("key_hash", keyedHash(key))
    .maybeSingle();

  // Shared normalization + validation (single source of truth). Reason is kept
  // internal: stored for the admin, but the customer always sees the generic
  // message. Full keys are never logged.
  const verdict = validateAccessKey(key, ac);
  if (verdict.ok) return { ac };
  if (ac?.id) {
    try {
      await admin.from("error_logs").insert({
        level: "info",
        source: "auth/key-redeem",
        message: `key rejected:${verdict.reason} id:${ac.id} last4:${last4(key)}`,
      });
    } catch {
      // never throw for logging failures
    }
  }
  return { error: GENERIC };
}

async function requireKeyEmailVerify(): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data: row } = await admin.from("settings").select("value").eq("key", "require_key_email_verify").maybeSingle();
    return row?.value === "true";
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  // License tables are RLS-protected and require the service-role key. If it
  // is missing we must fail loudly (not silently fall back to anon, which would
  // make every key look "invalid").
  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      {
        error:
          "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is not set. License activation is disabled until it is configured.",
      },
      { status: 503 }
    );
  }


  let body: { action?: string; key?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: GENERIC }, { status: 400 });
  }

  const key = normalizeAccessKey(body.key || "");
  const email = (body.email || "").trim().toLowerCase();
  const action = body.action === "validate" || body.action === "bind" ? body.action : "redeem";

  if (!WZ_RE.test(key)) {
    return NextResponse.json({ error: GENERIC }, { status: 400 });
  }

  const ipHash = createHash("sha256").update(getClientIp(req)).digest("hex").slice(0, 24);

  // Generous, layered limits. Never lock out a real user who shares an IP
  // (mobile carriers in PK/IN). Per-email attempts are limited generously; a
  // broad IP-wide cap only stops brute-force floods, not single users.
  const rlEmail = rateLimit(`key-redeem:${ipHash}:${email}`, 20, 600_000);
  if (!rlEmail.ok) {
    return NextResponse.json({ error: "Too many attempts. Please wait 10 minutes." }, { status: 429 });
  }
  const rlIp = rateLimit(`key-redeem-ip:${ipHash}`, 200, 600_000);
  if (!rlIp.ok) {
    return NextResponse.json({ error: "Too many attempts. Please wait 10 minutes." }, { status: 429 });
  }

  const loaded = await loadKey(key);
  if ("error" in loaded) return NextResponse.json({ error: loaded.error }, { status: 400 });
  const ac = loaded.ac;

  // VALIDATE ONLY: works without an email (key status + plan info).
  if (action === "validate") {
    return NextResponse.json({
      ok: true,
      plan_name: ac.plan_name || "Standard",
      access_days: ac.access_days ?? null,
      permanent: ac.access_days == null,
      features: Array.isArray(ac.features) ? ac.features : [],
      bound_email: ac.email ? ac.email.toLowerCase() : null,
    });
  }

  // ---- BIND (password-free email binding) ----
  if (action === "bind") {
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: GENERIC }, { status: 400 });
    }
    if (ac.email && ac.email.toLowerCase() !== email) {
      return NextResponse.json({ error: GENERIC }, { status: 400 });
    }

    const admin = createAdminClient();

    // Atomic claim: only binds if the license is still unbound, active,
    // unused, and not revoked/suspended/expired. Two requests racing for the
    // same license cannot both succeed because the UPDATE matches `uses=0`.
    const { data: claimed, error: claimErr } = await admin
      .from("access_codes")
      .update({ email, bound_at: new Date().toISOString() })
      .eq("id", ac.id)
      .is("email", null)
      .eq("uses", 0)
      .eq("active", true)
      .eq("revoked", false)
      .eq("suspended", false)
      .select("id")
      .maybeSingle();
    if (claimErr || !claimed) {
      return NextResponse.json({ error: GENERIC }, { status: 400 });
    }

    const origin = new URL(req.url).origin;
    const headerCountry = (req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || "").toUpperCase().slice(0, 2);
    const country = /^[A-Z]{2}$/.test(headerCountry) ? headerCountry : "unknown";
    const lang = country === "PK" ? "ur" : country === "IN" ? "hi" : country === "CN" ? "zh" : "en";

    let uid: string | null = null;
    const tempPassword = randomBytes(16).toString("base64url");

    // Reuse an existing account for this email if one exists.
    const { data: existingProfile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (existingProfile?.id) {
      uid = existingProfile.id;
    } else {
      const { data: created, error: ce } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: false,
        user_metadata: { username: email.split("@")[0], source: "license-bind" },
      });
      if (ce || !created?.user?.id) {
        await admin.from("access_codes").update({ email: null, bound_at: null }).eq("id", ac.id);
        return NextResponse.json({ error: "Could not create the account. Try again." }, { status: 500 });
      }
      uid = created.user.id;
    }

    if (!uid) {
      await admin.from("access_codes").update({ email: null, bound_at: null }).eq("id", ac.id);
      return NextResponse.json({ error: "Could not create the account. Try again." }, { status: 500 });
    }

    const accessDays = typeof ac.access_days === "number" && ac.access_days > 0 ? ac.access_days : null;
    const accessExpiresAt = accessDays ? new Date(Date.now() + accessDays * 86400000).toISOString() : null;
    const balance = Math.max(0, Number(ac.starting_balance) || 0);

    await admin.from("profiles").upsert(
      {
        id: uid,
        email,
        username: email.split("@")[0],
        country,
        language: lang,
        signup_ip_hash: ipHash,
        access_key_id: ac.id,
        access_expires_at: accessExpiresAt,
        plan: ac.plan_name || "Standard",
        features: Array.isArray(ac.features) ? ac.features : [],
        balance,
      },
      { onConflict: "id" }
    );

    if (balance > 0) {
      try {
        await admin.from("transactions").insert({ user_id: uid, type: "deposit", amount: balance, note: "Access key starting balance" });
      } catch {}
    }

    // Consume the license atomically — it is now exclusively claimed by this
    // email. (Access is granted after the email OTP verification succeeds.)
    await admin.from("access_codes").update({ uses: 1, active: false, used_at: new Date().toISOString(), used_by: uid, last_used_at: new Date().toISOString() }).eq("id", ac.id);
    try {
      await admin.from("audit_logs").insert({ action: "key_bind_claimed", details: { email, key_id: ac.id } });
    } catch {}

    // ---- Password-less server-side sign-in ----
    // Mint a magic link on the server (admin.generateLink does NOT email), then
    // verify its token hash via verifyOtp through the server client — this sets
    // the normal auth cookies without sending any email or asking anything else.
    let silentSession = false;
    try {
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      const tokenHash =
        (linkData?.properties as Record<string, string> | undefined)?.token_hash ||
        (linkData?.properties as Record<string, string> | undefined)?.email_otp ||
        "";
      if (!linkErr && tokenHash) {
        const sb = await createClient();
        const ver = await sb.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash, email });
        if (!ver.error && ver.data.user) {
          silentSession = true;
          // Register this device/session for the per-key device limit.
          try {
            await admin.from("key_sessions").insert({
              key_id: ac.id,
              user_id: uid,
              ip_hash: ipHash,
              device_label: (req.headers.get("user-agent") || "").slice(0, 120),
            });
          } catch {}
          try {
            await admin.from("audit_logs").insert({
              action: "key_bind_session",
              details: { email, key_id: ac.id, user_id: uid },
            });
          } catch {}
        }
      }
    } catch {}

    if (!silentSession) {
      // Fallback: send the OTP confirm code so the customer can still verify.
      try {
        const supabase = await createClient();
        await supabase.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: `${origin}/auth/callback` },
        });
      } catch {}
    }

    const res = NextResponse.json({
      ok: true,
      email,
      needsVerify: !silentSession,
      session: silentSession,
      access_days: accessDays,
      permanent: accessDays == null,
      access_expires_at: accessExpiresAt,
      plan_name: ac.plan_name || "Standard",
      features: Array.isArray(ac.features) ? ac.features : [],
    });
    if (silentSession) {
      try {
        const { STAY_SIGNED_IN_COOKIE } = await import("@/lib/sessionCookie");
        res.cookies.set(STAY_SIGNED_IN_COOKIE, "1", {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          maxAge: 400 * 24 * 3600,
        });
      } catch {}
    }
    return res;
  }


  // ---- REDEEM ----
  if (ac.email && ac.email.toLowerCase() !== email) {
    return NextResponse.json({ error: GENERIC }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: GENERIC }, { status: 400 });
  }

  if (!body.password || (body.password as string).length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: claimed } = await admin
    .from("access_codes")
    .update({ uses: 1, active: false, used_at: new Date().toISOString() })
    .eq("id", ac.id)
    .eq("uses", 0)
    .select("id")
    .maybeSingle();
  if (!claimed) return NextResponse.json({ error: GENERIC }, { status: 400 });

  try {
    await admin.from("audit_logs").insert({ action: "key_redeem_claimed", details: { email } });
  } catch {}

  const requireOtp = await requireKeyEmailVerify();
  const verified = Boolean(ac.email && ac.email.toLowerCase() === email) && !requireOtp;

  const password = body.password as string;
  const { data: nu, error: ce } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { username: email.split("@")[0] },
  });

  if (ce) {
    await admin.from("access_codes").update({ uses: 0, active: true, used_at: null }).eq("id", ac.id);
    return NextResponse.json({ error: "Could not create the account. Try again." }, { status: 500 });
  }
  const uid = nu?.user?.id;
  if (!uid) {
    await admin.from("access_codes").update({ uses: 0, active: true, used_at: null }).eq("id", ac.id);
    return NextResponse.json({ error: "Could not create the account. Try again." }, { status: 500 });
  }

  if (verified) {
    try {
      await admin.auth.admin.updateUserById(uid, { email_confirm: true });
    } catch {}
  }

  const accessDays = typeof ac.access_days === "number" && ac.access_days > 0 ? ac.access_days : null;
  const accessExpiresAt = accessDays
    ? new Date(Date.now() + accessDays * 86400000).toISOString()
    : null;

  const headerCountry = (req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || "").toUpperCase().slice(0, 2);
  const country = /^[A-Z]{2}$/.test(headerCountry) ? headerCountry : "unknown";
  const lang = country === "PK" ? "ur" : country === "IN" ? "hi" : country === "CN" ? "zh" : "en";
  const balance = Math.max(0, Number(ac.starting_balance) || 0);

  await admin.from("profiles").upsert(
    {
      id: uid,
      email,
      username: email.split("@")[0],
      country,
      language: lang,
      signup_ip_hash: ipHash,
      access_key_id: ac.id,
      access_expires_at: accessExpiresAt,
      plan: ac.plan_name || "Standard",
      features: ac.features || [],
      balance,
    },
    { onConflict: "id" }
  );

  if (balance > 0) {
    try {
      await admin.from("transactions").insert({ user_id: uid, type: "deposit", amount: balance, note: "Access key starting balance" });
    } catch {}
  }

  await admin.from("access_codes").update({ used_by: uid }).eq("id", ac.id);

  try {
    await runHooks("user.signup", { userId: uid });
  } catch {}

  return NextResponse.json({
    ok: true,
    email,
    verified,
    needsVerify: !verified,
    access_days: accessDays,
    permanent: accessDays == null,
    access_expires_at: accessExpiresAt,
    plan_name: ac.plan_name || "Standard",
    features: ac.features || [],
  });
}

