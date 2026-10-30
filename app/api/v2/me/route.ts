import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashApiKey, validateKeyAgainstRow, isWellFormedKey, type ApiKeyRow } from "@/lib/apiKeys";

export const dynamic = "force-dynamic";

/**
 * Public API v2 introspection endpoint.
 * Authentication: `Authorization: Bearer WAK-...-...-...-...`
 * Validates the key against its real state and enforces status + quota.
 * On success it returns the account summary and increments the key's usage.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!key) return NextResponse.json({ error: "Missing API key." }, { status: 401 });
  if (!isWellFormedKey(key)) return NextResponse.json({ error: "Malformed API key." }, { status: 401 });

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("api_keys")
    .select("*, profiles(id, email, username)")
    .eq("key_hash", hashApiKey(key))
    .maybeSingle();

  const verdict = validateKeyAgainstRow(key, row as unknown as ApiKeyRow | null);
  if (!verdict.ok) {
    const status = row?.banned_at ? 403 : row?.revoked_at || row?.suspended_at ? 403 : 401;
    return NextResponse.json({ error: verdict.error }, { status });
  }

  // Record usage.
  const k = verdict.row;
  await admin
    .from("api_keys")
    .update({ uses: Number(k.uses || 0) + 1, last_used_at: new Date().toISOString() })
    .eq("id", k.id);

  const prof = (k as any).profiles;
  const cap = Number(k.usage_cap);
  return NextResponse.json({
    ok: true,
    key: { id: k.id, name: k.name, label: k.label, prefix: k.prefix, created_at: k.created_at },
    account: {
      id: prof?.id || null,
      email: prof?.email || null,
      username: prof?.username || null,
    },
    usage: {
      used: Number(k.uses || 0) + 1,
      cap: Number.isFinite(cap) && cap > 0 ? cap : null,
      limit: Number(k.rate_limit) || null,
      last_used_at: new Date().toISOString(),
    },
  });
}
