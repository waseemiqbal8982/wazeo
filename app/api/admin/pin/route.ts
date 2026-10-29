import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPin, generateRecoveryCodes, hashRecoveryCode } from "@/lib/adminPin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const admin = createAdminClient();
  const { data } = await admin.from("admin_pins").select("setup_pending, locked_until").eq("user_id", user.id).maybeSingle();
  return NextResponse.json({
    enabled: !!data,
    pendingSetup: !!data?.setup_pending,
    lockedUntil: data?.locked_until || null,
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body: { pin?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const pin = String(body.pin || "");
  if (!/^\d{6,8}$/.test(pin)) {
    return NextResponse.json({ error: "PIN 6 se 8 digits ka hona chahiye." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { hash, salt, algo } = hashPin(pin);
  const codes = generateRecoveryCodes();
  const codeRows = codes.map((c) => ({ user_id: user.id, code_hash: hashRecoveryCode(c) }));

  await admin.from("admin_pins").upsert(
    {
      user_id: user.id,
      pin_hash: hash,
      salt,
      algo,
      failed_attempts: 0,
      locked_until: null,
      setup_pending: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  await admin.from("admin_recovery_codes").delete().eq("user_id", user.id);
  await admin.from("admin_recovery_codes").insert(codeRows);
  await admin.from("audit_logs").insert({ user_id: user.id, action: "admin_pin_setup_started", details: {} });

  return NextResponse.json({ ok: true, pendingSetup: true, recoveryCodes: codes });
}
