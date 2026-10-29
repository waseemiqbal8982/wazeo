import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { createHash, timingSafeEqual } from "node:crypto";
import { runHooks } from "@/lib/hooks";

const GENERIC = "This key is invalid, expired or not for this email";
const hashKey = (k: string) => createHash("sha256").update(k).digest("hex");

const WZ_RE = /^WZ-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

interface KeyRow {
  id: string;
  hash?: string | null;
  email?: string | null;
  access_days?: number | null;
  plan_name?: string | null;
  features?: unknown;
  starting_balance?: number;
  revoked?: boolean;
  active?: boolean;
  used_at?: string | null;
  uses?: number;
  expires_at?: string | null;
  redemption_expires_at?: string | null;
}

async function loadKey(key: string): Promise<{ ac: KeyRow } | { error: string }> {
  const admin = createAdminClient();
  const { data: ac } = await admin.from("access_codes").select("*").eq("hash", hashKey(key)).maybeSingle();
  if (!ac) return { error: GENERIC };

  const a = Buffer.from(hashKey(key));
  const b = Buffer.from(ac.hash || "");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { error: GENERIC };

  if (ac.revoked || !ac.active) return { error: GENERIC };
  if (ac.used_at || (ac.uses ?? 0) > 0) return { error: GENERIC };
  if (ac.expires_at && new Date(ac.expires_at).getTime() < Date.now()) return { error: GENERIC };
  if (ac.redemption_expires_at && new Date(ac.redemption_expires_at).getTime() < Date.now()) {
    return { error: GENERIC };
  }
  return { ac };
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
  let body: { action?: string; key?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: GENERIC }, { status: 400 });
  }

  const key = (body.key || "").trim().toUpperCase();
  const email = (body.email || "").trim().toLowerCase();
  const action = body.action === "validate" ? "validate" : "redeem";

  if (!WZ_RE.test(key)) {
    return NextResponse.json({ error: GENERIC }, { status: 400 });
  }

  const ipHash = createHash("sha256").update(getClientIp(req)).digest("hex").slice(0, 24);

  const rl = rateLimit(`key-redeem:${ipHash}:${email}`, 5, 600_000);
  if (!rl.ok) {
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

