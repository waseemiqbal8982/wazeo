import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

// This endpoint no longer creates a session (session is created by the
// browser-side Supabase client). It only records the last login time.
export async function POST(req: Request) {
  const rl = rateLimit(`signin-touch:${getClientIp(req)}`, 12, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 });
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email required." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const u = (users?.users || []).find((x) => x.email === email);
    if (u) {
      await admin.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", u.id);
    }
  } catch {}

  return NextResponse.json({ ok: true });
}
