import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateProviderUrl } from "@/lib/ssrf";
import { encryptSecret, maskKey } from "@/lib/crypto";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Fields we are willing to accept on create/update.
const FIELDS = [
  "name",
  "api_url",
  "api_format",
  "currency",
  "priority",
  "weight",
  "markup_pct",
  "active",
  "status",
  "low_balance_threshold",
  "concurrency_cap",
] as const;

function sanitize(row: any) {
  const { api_key, api_key_enc, ...rest } = row;
  return {
    ...rest,
    hasApiKey: Boolean(api_key_enc || api_key),
    api_key_masked: (api_key_enc || api_key) ? maskKey(String(api_key_enc || api_key)) : null,
  };
}

async function requireAdmin() {
  const ok = await isAdminUser();
  if (ok !== true) return null;
  return ok;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }
  const admin = createAdminClient();
  const { data } = await admin.from("providers").select("*").order("priority", { ascending: true });
  return NextResponse.json({ providers: (data || []).map(sanitize) });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  if (!body?.name?.trim()) {
    return NextResponse.json({ error: "Provider name is required." }, { status: 400 });
  }

  const apiUrl = body.api_url?.trim?.() || "";
  if (apiUrl) {
    const v = await validateProviderUrl(apiUrl);
    if (!v.ok) return NextResponse.json({ error: `Invalid provider URL: ${v.error}` }, { status: 400 });
  }

  const insert: Record<string, unknown> = { name: body.name.trim(), api_url: apiUrl || null };
  for (const f of FIELDS) {
    if (body[f] !== undefined) {
      if (f === "api_url") continue;
      insert[f] = body[f];
    }
  }
  if (body.api_key && String(body.api_key).trim()) {
    insert.api_key_enc = encryptSecret(String(body.api_key));
    insert.api_key = null; // never keep plaintext
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("providers").insert(insert).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit("provider_create", { name: data.name });
  return NextResponse.json({ provider: sanitize(data) }, { status: 201 });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  if (!body?.id) {
    return NextResponse.json({ error: "Provider id is required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin.from("providers").select("*").eq("id", body.id).single();
  if (!existing) return NextResponse.json({ error: "Provider not found." }, { status: 404 });

  const patch: Record<string, unknown> = {};
  for (const f of FIELDS) {
    if (body[f] !== undefined) {
      if (f === "api_url") {
        const apiUrl = String(body[f]).trim();
        if (apiUrl && apiUrl !== existing.api_url) {
          const v = await validateProviderUrl(apiUrl);
          if (!v.ok) {
            return NextResponse.json({ error: `Invalid provider URL: ${v.error}` }, { status: 400 });
          }
        }
        patch.api_url = apiUrl || null;
      } else {
        patch[f] = body[f];
      }
    }
  }
  if (body.api_key && String(body.api_key).trim()) {
    patch.api_key_enc = encryptSecret(String(body.api_key));
    patch.api_key = null;
  }

  const { data, error } = await admin.from("providers").update(patch).eq("id", body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit("provider_update", { name: existing.name });
  return NextResponse.json({ provider: sanitize(data) });
}
