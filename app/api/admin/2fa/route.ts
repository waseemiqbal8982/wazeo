import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash, randomInt } from "node:crypto";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

async function getMe() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const admin = createAdminClient();
  const { data } = await admin.from("admin_2fa").select("enabled,method").eq("user_id", me.id).maybeSingle();
  return NextResponse.json({ enabled: !!data?.enabled, method: data?.method || "email" });
}

export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body: { enable?: boolean; method?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();

  if (body.enable === false) {
    await admin.from("admin_2fa").upsert(
      { user_id: me.id, enabled: false, method: "email", code_hash: null, code_expires_at: null, recovery_hash: null, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    await admin.from("audit_logs").insert({ user_id: me.id, action: "admin_2fa_disable", details: {} });
    return NextResponse.json({ ok: true, enabled: false });
  }

  const method = body.method === "totp" ? "totp" : "email";
  const code = String(randomInt(100000, 999999));
  const recovery = String(randomInt(1000000000, 2147483647));
  const now = new Date();
  const expires = new Date(now.getTime() + 10 * 60 * 1000);

  await admin.from("admin_2fa").upsert(
    {
      user_id: me.id,
      enabled: true,
      method,
      code_hash: createHash("sha256").update(code).digest("hex"),
      code_expires_at: expires.toISOString(),
      recovery_hash: createHash("sha256").update(recovery).digest("hex"),
      updated_at: now.toISOString(),
    },
    { onConflict: "user_id" }
  );

  const emailed = me.email ? await sendEmail({
    to: me.email,
    subject: "Your Wazeo admin 2FA code",
    html: `<p>Your admin verification code is <b>${code}</b></p><p>It expires in 10 minutes.</p>`,
  }) : false;

  await admin.from("audit_logs").insert({ user_id: me.id, action: "admin_2fa_enable", details: { method } });

  // If we could not actually email the code (no SMTP/Resend configured), surface
  // it once so the admin can still complete setup — clearly labelled as a demo fallback.
  return NextResponse.json({
    ok: true,
    enabled: true,
    method,
    emailed,
    recovery: recovery,
    devCode: emailed ? null : code,
  });
}
