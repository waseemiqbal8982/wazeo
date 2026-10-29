import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  verifyPin,
  verifyRecoveryCode,
  PIN_COOKIE_PREFIX,
  PIN_INACTIVITY_MS,
  PIN_MAX_ATTEMPTS,
  PIN_LOCK_MS,
} from "@/lib/adminPin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body: { pin?: string; recovery?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const admin = createAdminClient();
  const { data: row } = await admin.from("admin_pins").select("*").eq("user_id", user.id).maybeSingle();
  if (!row || row.setup_pending) return NextResponse.json({ error: "PIN setup complete nahi hai." }, { status: 400 });

  const now = Date.now();
  if (row.locked_until && new Date(row.locked_until).getTime() > now) {
    return NextResponse.json({ error: "Bahut zyada ghalat tries. 15 minute baad dobara koshish karo." }, { status: 429 });
  }

  // Recovery code path.
  if (body.recovery) {
    const code = String(body.recovery).trim().toUpperCase();
    const { data: codes } = await admin.from("admin_recovery_codes").select("id, code_hash").eq("user_id", user.id).eq("used_at", null);
    const match = (codes || []).find((c) => verifyRecoveryCode(code, c.code_hash));
    if (!match) {
      return NextResponse.json({ error: "Recovery code ghalat hai." }, { status: 400 });
    }
    await admin.from("admin_recovery_codes").update({ used_at: new Date().toISOString() }).eq("id", match.id);
    const res = NextResponse.json({ ok: true, via: "recovery" });
    res.cookies.set(`${PIN_COOKIE_PREFIX}${user.id}`, String(now), { path: "/", maxAge: Math.floor(PIN_INACTIVITY_MS / 1000) });
    return res;
  }

  // PIN path.
  const pin = String(body.pin || "");
  const ok = verifyPin(pin, row.salt, row.pin_hash);
  if (!ok) {
    const attempts = (row.failed_attempts || 0) + 1;
    const lockedUntil = attempts >= PIN_MAX_ATTEMPTS ? new Date(now + PIN_LOCK_MS).toISOString() : null;
    await admin.from("admin_pins").update({
      failed_attempts: attempts,
      locked_until: lockedUntil || null,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);
    await admin.from("audit_logs").insert({ user_id: user.id, action: "admin_pin_failed", details: { attempts } });
    return NextResponse.json({ error: "PIN ghalat hai." }, { status: 400 });
  }

  await admin.from("admin_pins").update({ failed_attempts: 0, locked_until: null, last_verified_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString() }).eq("user_id", user.id);
  await admin.from("audit_logs").insert({ user_id: user.id, action: "admin_pin_verified", details: {} });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(`${PIN_COOKIE_PREFIX}${user.id}`, String(now), { path: "/", maxAge: Math.floor(PIN_INACTIVITY_MS / 1000) });
  return res;
}
