import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateApiKey, deriveStatus, maskFromKey, type ApiKeyRow } from "@/lib/apiKeys";
import { requireEmailVerifyAtSignup } from "@/lib/authPolicy";

export const dynamic = "force-dynamic";

async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("api_keys")
    .select("id, name, label, prefix, created_at, last_used_at, expires_at, uses, usage_cap, rate_limit, permissions, features, revoked_at, revoked_reason, suspended_at, banned_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const rows = (data || []) as ApiKeyRow[];
  const keys = rows.map((r) => ({ ...r, status: deriveStatus(r) }));
  return NextResponse.json({ keys });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!user.email_confirmed_at && (await requireEmailVerifyAtSignup())) {
    return NextResponse.json({ error: "Please verify your email first." }, { status: 403 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const label = String(body.label || "").trim().slice(0, 80) || "API Key";
  const expiryDaysRaw = body.expiryDays;
  const expiryDays =
    expiryDaysRaw == null || expiryDaysRaw === "" ? null : Number(expiryDaysRaw);
  const usageCap = body.usageCap == null || body.usageCap === "" ? null : Number(body.usageCap);
  const rateLimit = body.rateLimit == null || body.rateLimit === "" ? null : Number(body.rateLimit);
  const features = Array.isArray(body.features) ? body.features.map(String).slice(0, 50) : [];
  const permissions = Array.isArray(body.permissions) ? body.permissions.map(String).slice(0, 50) : [];

  if (expiryDays != null && (!Number.isFinite(expiryDays) || expiryDays <= 0))
    return NextResponse.json({ error: "Expiry must be a positive number of days." }, { status: 400 });
  if (usageCap != null && (!Number.isFinite(usageCap) || usageCap < 0))
    return NextResponse.json({ error: "Usage cap must be >= 0." }, { status: 400 });
  if (rateLimit != null && (!Number.isFinite(rateLimit) || rateLimit < 0))
    return NextResponse.json({ error: "Rate limit must be >= 0." }, { status: 400 });

  const { key, prefix, hash } = generateApiKey();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("api_keys")
    .insert({
      user_id: user.id,
      name: label,
      label,
      prefix,
      key_hash: hash,
      status: "active",
      expires_at: expiryDays ? new Date(Date.now() + expiryDays * 86400000).toISOString() : null,
      uses: 0,
      usage_cap: usageCap,
      rate_limit: rateLimit,
      features,
      permissions,
    })
    .select("id, name, label, prefix, created_at, last_used_at, expires_at, uses, usage_cap, rate_limit, permissions, features")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await admin.from("audit_logs").insert({
      user_id: user.id,
      action: "customer_api_key_generate",
      details: { key_id: data.id, prefix },
    });
  } catch {
    /* audit must never break the flow */
  }

  // The plaintext key is returned exactly once.
  return NextResponse.json({ ok: true, key, last4: maskFromKey(key).slice(-4), record: data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const action = body.action;
  const id = body.id;
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("api_keys")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Key not found." }, { status: 404 });

  if (action === "revoke") {
    const { error } = await admin
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString(), status: "revoked", revoked_reason: "customer_revoked" })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    try {
      await admin.from("audit_logs").insert({
        user_id: user.id,
        action: "customer_api_key_revoke",
        details: { key_id: id, prefix: existing.prefix },
      });
    } catch {}
    return NextResponse.json({ ok: true });
  }

  if (action === "regenerate") {
    const { key, prefix, hash } = generateApiKey();
    const { data: updated, error } = await admin
      .from("api_keys")
      .update({
        key_hash: hash,
        prefix,
        revoked_at: null,
        revoked_reason: null,
        status: "active",
        uses: 0,
        last_used_at: null,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, name, label, prefix, created_at, last_used_at, expires_at, uses, usage_cap, rate_limit, permissions, features")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    try {
      await admin.from("audit_logs").insert({
        user_id: user.id,
        action: "customer_api_key_regenerate",
        details: { key_id: id, prefix },
      });
    } catch {}
    return NextResponse.json({ ok: true, key, last4: maskFromKey(key).slice(-4), record: updated });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
