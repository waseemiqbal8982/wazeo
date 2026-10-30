import { NextResponse } from "next/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { normalizeKey, formatKeyDisplay } from "@/lib/keys/normalize";
import { deriveStatus, validateRow, KeyRowLike } from "@/lib/keys/key";
import { hashIp, rateLimitKey } from "@/lib/keys/rateLimit";

const GENERIC = "This key is invalid, expired or not for this email";

export async function POST(req: Request) {
  if (!hasServiceRoleKey()) {
    return NextResponse.json({ error: "Server misconfigured." }, { status: 503 });
  }

  let body: { key?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: GENERIC }, { status: 400 });
  }

  const bodyKey = normalizeKey(body.key);
  if (!bodyKey) return NextResponse.json({ error: GENERIC }, { status: 400 });

  const email = (body.email || "").trim().toLowerCase();
  const ipHash = hashIp(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown");
  const keyPrefix = bodyKey.slice(0, 4);

  // Generous limits; never block valid users.
  const rl = rateLimitKey([`check`, ipHash, keyPrefix], 60, 600000);
  if (!rl.ok) return NextResponse.json({ error: GENERIC, retryAfter: rl.retryAfter }, { status: 429 });
  if (email) {
    const rle = rateLimitKey([`check-email`, email], 30, 600000);
    if (!rle.ok) return NextResponse.json({ error: GENERIC }, { status: 429 });
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("wz_keys")
    .select("id,code,plan,features,access_days,redeem_until,bound_email,status,activated_at,access_expires_at,max_devices")
    .eq("code", bodyKey)
    .maybeSingle();

  const verdict = validateRow(bodyKey, row as KeyRowLike | null, email || undefined);
  if (!row) return NextResponse.json({ error: GENERIC }, { status: 400 });

  if (!verdict.ok) {
    // Real reason -> admin error log + key event timeline. Generic to customer.
    try {
      if (row?.id) {
        await admin.from("wz_key_events").insert({
          key_id: row.id,
          type: "check_failed",
          actor: "customer",
          details: { reason: verdict.reason },
        });
      }
      await admin.from("error_logs").insert({
        level: "info",
        source: "key/check",
        message: `key rejected:${verdict.reason} ${row?.id ? `id:${row.id}` : ""}`,
      });
    } catch {
      // never throw for logging failures
    }
    return NextResponse.json({ error: GENERIC }, { status: 400 });
  }

  // Valid: return plan/days/features for the success screen.
  const accessDays = (row as KeyRowLike)?.access_days ?? null;
  const permanent = accessDays == null;
  return NextResponse.json({
    ok: true,
    display: formatKeyDisplay(bodyKey),
    valid: true,
    plan: row.plan || "Standard",
    access_days: accessDays,
    permanent,
    features: row.features || [],
    bound_email: row.bound_email || null,
    end_date: row.access_expires_at || null,
  });
}
