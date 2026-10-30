import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/adminAuth";
import { generateApiKey, deriveStatus, maskFromKey, type ApiKeyRow } from "@/lib/apiKeys";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const MAX_FETCH = 5000;

export async function GET(req: Request) {
  const ok = await isAdminUser();
  if (ok !== true) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const admin = createAdminClient();
  const { searchParams } = new URL(req.url);

  // Sanitize search input. `q` is interpolated into a PostgREST `or()`
  // boolean filter (e.g. `name.ilike.%q%,...`). A crafted value could inject
  // extra predicate tokens or turn the wildcard into a match-everything query.
  // Strip filter-metacharacters and bound the length before use.
  const sanitizeSearch = (s: string) =>
    String(s)
      .toLowerCase()
      .slice(0, 80)
      .replace(/[(),%;'"\\*]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const q = sanitizeSearch(searchParams.get("q") || "");
  const status = (searchParams.get("status") || "").slice(0, 20);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  let query = admin
    .from("api_keys")
    .select("*, profiles(id, email, username)")
    .order("created_at", { ascending: false });
  if (q) query = query.or(`name.ilike.%${q}%,label.ilike.%${q}%,prefix.ilike.%${q}%`);

  const { data } = await query.limit(MAX_FETCH);
  let rows = ((data || []) as any[]).map((r) => ({
    ...r,
    status: deriveStatus(r as ApiKeyRow),
  }));

  if (status) rows = rows.filter((r) => r.status === status);

  const total = rows.length;
  const start = (page - 1) * PAGE_SIZE;
  const paged = rows.slice(start, start + PAGE_SIZE);

  return NextResponse.json({ keys: paged, total, page, pageSize: PAGE_SIZE });
}

export async function POST(req: Request) {
  const ok = await isAdminUser();
  if (ok !== true) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const action = body.action;
  const admin = createAdminClient();
  const audit = async (actionName: string, details: Record<string, unknown>) => {
    try {
      await admin.from("audit_logs").insert({ action: actionName, details });
    } catch {
      /* never throw for logging failures */
    }
  };

  // ----- generate -----
  if (action === "generate") {
    const email = String(body.email || "").trim().toLowerCase();
    const userId = body.userId ? String(body.userId) : "";
    const label = String(body.label || "").trim().slice(0, 80) || "API Key";
    const expiryDays = body.expiryDays == null || body.expiryDays === "" ? null : Number(body.expiryDays);
    const usageCap = body.usageCap == null || body.usageCap === "" ? null : Number(body.usageCap);
    const rateLimit = body.rateLimit == null || body.rateLimit === "" ? null : Number(body.rateLimit);
    const features = Array.isArray(body.features) ? body.features.map(String).slice(0, 50) : [];
    const permissions = Array.isArray(body.permissions) ? body.permissions.map(String).slice(0, 50) : [];

    if (!userId && !email) return NextResponse.json({ error: "email or userId required." }, { status: 400 });

    let targetId = userId;
    if (!targetId) {
      const { data: prof } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
      if (!prof) return NextResponse.json({ error: "No customer found with that email." }, { status: 404 });
      targetId = prof.id;
    }

    if (expiryDays != null && (!Number.isFinite(expiryDays) || expiryDays <= 0))
      return NextResponse.json({ error: "Expiry must be a positive number of days." }, { status: 400 });

    const { key, prefix, hash } = generateApiKey();
    const { data, error } = await admin
      .from("api_keys")
      .insert({
        user_id: targetId,
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
      .select("id, name, label, prefix, created_at, expires_at, uses, usage_cap, rate_limit, permissions, features")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await audit("admin_api_key_generate", { key_id: data.id, prefix, user_id: targetId });
    return NextResponse.json({ ok: true, key, last4: maskFromKey(key).slice(-4), record: data }, { status: 201 });
  }

  // ----- mutations on an existing key -----
  const id = body.id;
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });
  const { data: existing } = await admin.from("api_keys").select("*, profiles(id, email, username)").eq("id", id).single();
  if (!existing) return NextResponse.json({ error: "Key not found." }, { status: 404 });

  const now = new Date().toISOString();

  switch (action) {
    case "revoke": {
      const reason = String(body.reason || "admin_revoked").slice(0, 200);
      await admin.from("api_keys").update({ revoked_at: now, status: "revoked", revoked_reason: reason }).eq("id", id);
      await audit("admin_api_key_revoke", { key_id: id, prefix: existing.prefix, user_id: existing.user_id, reason });
      return NextResponse.json({ ok: true });
    }
    case "suspend": {
      await admin.from("api_keys").update({ suspended_at: now, status: "suspended" }).eq("id", id);
      await audit("admin_api_key_suspend", { key_id: id, prefix: existing.prefix, user_id: existing.user_id });
      return NextResponse.json({ ok: true });
    }
    case "reactivate": {
      await admin.from("api_keys").update({ suspended_at: null, revoked_at: null, revoked_reason: null, status: "active" }).eq("id", id);
      await audit("admin_api_key_reactivate", { key_id: id, prefix: existing.prefix, user_id: existing.user_id });
      return NextResponse.json({ ok: true });
    }
    case "ban": {
      const reason = String(body.reason || "admin_banned").slice(0, 200);
      await admin.from("api_keys").update({ banned_at: now, status: "banned", revoked_reason: reason }).eq("id", id);
      await audit("admin_api_key_ban", { key_id: id, prefix: existing.prefix, user_id: existing.user_id, reason });
      return NextResponse.json({ ok: true });
    }
    case "unban": {
      await admin.from("api_keys").update({ banned_at: null, status: "active", revoked_reason: null }).eq("id", id);
      await audit("admin_api_key_unban", { key_id: id, user_id: existing.user_id });
      return NextResponse.json({ ok: true });
    }
    case "regenerate": {
      const { key, prefix, hash } = generateApiKey();
      await admin.from("api_keys").update({ key_hash: hash, prefix, revoked_at: null, revoked_reason: null, suspended_at: null, banned_at: null, status: "active", uses: 0, last_used_at: null }).eq("id", id);
      await audit("admin_api_key_regenerate", { key_id: id, prefix, user_id: existing.user_id });
      return NextResponse.json({ ok: true, key, last4: maskFromKey(key).slice(-4) });
    }
    case "extend": {
      const days = body.days === "permanent" || body.days == null ? null : Number(body.days);
      const expiresAt = days && Number.isFinite(days) && days > 0
        ? new Date(Date.now() + days * 86400000).toISOString()
        : null;
      await admin.from("api_keys").update({ expires_at: expiresAt }).eq("id", id);
      await audit("admin_api_key_extend", { key_id: id, days: days ?? "permanent", user_id: existing.user_id });
      return NextResponse.json({ ok: true });
    }
    case "setLimits": {
      const usageCap = body.usageCap == null ? null : Number(body.usageCap);
      const rateLimit = body.rateLimit == null ? null : Number(body.rateLimit);
      const patch: Record<string, unknown> = { usage_cap: usageCap, rate_limit: rateLimit };
      if (usageCap != null && Number.isFinite(usageCap) && usageCap > 0 && Number(existing.uses || 0) >= usageCap)
        patch.status = "limit_reached";
      else if (existing.status === "limit_reached") patch.status = "active";
      await admin.from("api_keys").update(patch).eq("id", id);
      await audit("admin_api_key_set_limits", { key_id: id, usageCap, rateLimit, user_id: existing.user_id });
      return NextResponse.json({ ok: true });
    }
    case "setFeatures": {
      const features = Array.isArray(body.features) ? body.features.map(String).slice(0, 50) : [];
      const permissions = Array.isArray(body.permissions) ? body.permissions.map(String).slice(0, 50) : [];
      await admin.from("api_keys").update({ features, permissions }).eq("id", id);
      await audit("admin_api_key_set_features", { key_id: id, features, permissions, user_id: existing.user_id });
      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

