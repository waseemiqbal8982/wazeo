import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeKey } from "@/lib/keys/normalize";
import { validateRow, computeAccessExpiresAt, deviceCapOk } from "@/lib/keys/key";
import { hashIp, rateLimitKey } from "@/lib/keys/rateLimit";

const GENERIC = "This key is invalid, expired or not for this email";
const DEVICE_LIMIT_MSG = "This key is already used on 2 devices; ask support to reset devices";

export async function POST(req: Request) {
  if (!hasServiceRoleKey()) {
    return NextResponse.json({ error: "Server misconfigured." }, { status: 503 });
  }

  let body: { key?: string; email?: string; deviceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: GENERIC }, { status: 400 });
  }

  const bodyKey = normalizeKey(body.key);
  if (!bodyKey) return NextResponse.json({ error: GENERIC }, { status: 400 });

  const email = (body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: GENERIC }, { status: 400 });
  }

  const ipHash = hashIp(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown");
  const keyPrefix = bodyKey.slice(0, 4);
  const deviceId = String(body.deviceId || req.headers.get("user-agent") || "unknown").slice(0, 120);

  const admin = createAdminClient();

  const rl = rateLimitKey([`activate`, ipHash, keyPrefix], 30, 600000);
  if (!rl.ok) return NextResponse.json({ error: GENERIC }, { status: 429 });
  const rle = rateLimitKey([`activate-email`, email], 20, 600000);
  if (!rle.ok) return NextResponse.json({ error: GENERIC }, { status: 429 });

  interface WzKeyRow {
    id: string;
    code?: string;
    plan?: string;
    features?: unknown;
    access_days?: number | null;
    redeem_until?: string | null;
    bound_email?: string | null;
    status?: string;
    activated_at?: string | null;
    access_expires_at?: string | null;
    max_devices?: number;
    starting_balance?: number;
    label?: string | null;
    note?: string | null;
  }
  const { data: rowRaw } = await admin
    .from("wz_keys")
    .select("id,code,plan,features,access_days,redeem_until,bound_email,status,activated_at,access_expires_at,max_devices,starting_balance,label,note")
    .eq("code", bodyKey)
    .maybeSingle();
  const row = (rowRaw || null) as WzKeyRow | null;

  const verdict = validateRow(bodyKey, row, email);
  if (!verdict.ok) {
    return reject(admin, row?.id, verdict.reason);
  }
  if (!row) return reject(admin, undefined, "not-found");

  const { count: deviceCount } = await admin
    .from("wz_key_devices")
    .select("id", { count: "exact", head: true })
    .eq("key_id", row.id)
    .eq("revoked", false);

  const { data: existingDevice } = await admin
    .from("wz_key_devices")
    .select("id,device_id")
    .eq("key_id", row.id)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (verdict.status === "active") {
    if (!existingDevice?.id && !deviceCapOk(deviceCount ?? 0, row.max_devices)) {
      return NextResponse.json({ error: DEVICE_LIMIT_MSG }, { status: 409 });
    }
  }
  // ---- Create or find the user ----
  let uid: string | null = null;
  let isNewUser = false;
  const tempPassword = randomBytes(16).toString("base64url");

  const { data: existingProfile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existingProfile?.id) {
    uid = existingProfile.id;
  } else {
    const { data: created, error: ce } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { username: email.split("@")[0], source: "key-activate" },
    });
    if (ce || !created?.user?.id) {
      return NextResponse.json({ error: "Could not create the account. Try again." }, { status: 500 });
    }
    uid = created.user.id;
    isNewUser = true;
  }

  // ---- Apply access (renewal-aware) ----
  const accessExpiresAt = computeAccessExpiresAt(row.access_days, row.access_expires_at);
  const balance = Math.max(0, Number(row.starting_balance) || 0);

  const headerCountry = (req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || "").toUpperCase().slice(0, 2);
  const country = /^[A-Z]{2}$/.test(headerCountry) ? headerCountry : "unknown";
  const lang = country === "PK" ? "ur" : country === "IN" ? "hi" : country === "CN" ? "zh" : "en";

  await admin.from("profiles").upsert(
    {
      id: uid,
      email,
      username: email.split("@")[0],
      country,
      language: lang,
      signup_ip_hash: ipHash,
      access_key_id: row.id,
      access_expires_at: accessExpiresAt,
      plan: row.plan || "Standard",
      features: Array.isArray(row.features) ? row.features : [],
      ...(isNewUser ? { balance } : {}),
    },
    { onConflict: "id" }
  );

  if (isNewUser && balance > 0) {
    try {
      await admin.from("transactions").insert({ user_id: uid, type: "deposit", amount: balance, note: "Access key starting balance" });
    } catch {}
  }

  // ---- Mark key active (idempotent) ----
  const patch: Record<string, unknown> = {
    status: "active",
    activated_user_id: uid,
    activated_at: row.activated_at || new Date().toISOString(),
    access_expires_at: accessExpiresAt,
    last_used_at: new Date().toISOString(),
  };
  if (!row.bound_email) patch.bound_email = email;
  await admin.from("wz_keys").update(patch).eq("id", row.id);

  // ---- Register the device (create or touch) ----
  try {
    await admin.from("wz_key_devices").upsert(
      {
        key_id: row.id,
        device_id: deviceId,
        label: (req.headers.get("user-agent") || "").slice(0, 120),
        last_seen: new Date().toISOString(),
      },
      { onConflict: "key_id,device_id" }
    );
  } catch {}

  try {
    await admin.from("wz_key_events").insert({
      key_id: row.id,
      type: isNewUser ? "activated" : "signed_in",
      actor: email,
      details: { user_id: uid },
    });
  } catch {}

  // ---- Server-side password-less session ----
  let silentSession = false;
  try {
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash =
      (linkData?.properties as Record<string, string> | undefined)?.token_hash ||
      (linkData?.properties as Record<string, string> | undefined)?.email_otp ||
      "";
    if (!linkErr && tokenHash) {
      const sb = await createClient();
      const ver = await sb.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash, email });
      if (!ver.error && ver.data.user) silentSession = true;
    }
  } catch {}

  if (!silentSession) {
    try {
      const supabase = await createClient();
      const origin = new URL(req.url).origin;
      await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${origin}/auth/callback` } });
    } catch {}
  }

  const res = NextResponse.json({
    ok: true,
    session: silentSession,
    needsVerify: !silentSession,
    email,
    plan: row.plan || "Standard",
    access_days: row.access_days ?? null,
    permanent: row.access_days == null,
    access_expires_at: accessExpiresAt,
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

async function reject(admin: ReturnType<typeof createAdminClient>, keyId: string | undefined, reason?: string) {
  const r = reason || "unknown";
  try {
    if (keyId) {
      await admin.from("wz_key_events").insert({ key_id: keyId, type: "activate_failed", actor: "customer", details: { reason: r } });
    }
    await admin.from("error_logs").insert({ level: "info", source: "key/activate", message: `key rejected:${r} ${keyId ? `id:${keyId}` : ""}` });
  } catch {}
  return NextResponse.json({ error: GENERIC }, { status: 400 });
}

