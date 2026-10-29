import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyRecoveryCode } from "@/lib/adminPin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body: { code?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const code = String(body.code || "").trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "Recovery code enter karo." }, { status: 400 });

  const admin = createAdminClient();
  const { data: row } = await admin.from("admin_pins").select("*").eq("user_id", user.id).maybeSingle();
  if (!row) return NextResponse.json({ error: "Pehle PIN set karo." }, { status: 400 });
  if (!row.setup_pending) return NextResponse.json({ error: "Setup already complete hai." }, { status: 400 });

  const { data: codes } = await admin.from("admin_recovery_codes").select("id, code_hash").eq("user_id", user.id).eq("used_at", null);
  const match = (codes || []).find((c) => verifyRecoveryCode(code, c.code_hash));
  if (!match) return NextResponse.json({ error: "Recovery code ghalat hai." }, { status: 400 });

  await admin.from("admin_recovery_codes").update({ used_at: new Date().toISOString() }).eq("id", match.id);
  await admin.from("admin_pins").update({ setup_pending: false, updated_at: new Date().toISOString() }).eq("user_id", user.id);
  await admin.from("audit_logs").insert({ user_id: user.id, action: "admin_pin_setup_completed", details: {} });

  return NextResponse.json({ ok: true });
}
