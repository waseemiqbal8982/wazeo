import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "node:crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body: { code?: string; recovery?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: row } = await admin.from("admin_2fa").select("*").eq("user_id", user.id).maybeSingle();
  if (!row?.enabled) return NextResponse.json({ error: "2FA is not enabled." }, { status: 400 });

  const validCode = body.code && row.code_hash === createHash("sha256").update(String(body.code)).digest("hex");
  const validRecovery = body.recovery && row.recovery_hash === createHash("sha256").update(String(body.recovery)).digest("hex");

  if (!validCode && !validRecovery) {
    return NextResponse.json({ error: "Invalid code." }, { status: 400 });
  }

  if (row.code_expires_at && new Date(row.code_expires_at).getTime() < Date.now() && !validRecovery) {
    return NextResponse.json({ error: "Code expired." }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(`wazeo-2fa-ok-${user.id}`, "1", { path: "/", maxAge: 60 * 60 * 8 });
  return res;
}
