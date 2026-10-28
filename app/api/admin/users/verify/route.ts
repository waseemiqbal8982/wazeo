import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/adminAuth";

export async function POST(req: Request) {
  const ok = await isAdminUser();
  if (ok !== true) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  let body: { userId?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const userId = body.userId;
  const action = body.action;
  if (!userId) return NextResponse.json({ error: "userId required." }, { status: 400 });
  if (!["mark_verified", "resend"].includes(action || "")) {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const admin = createAdminClient();
  const origin = new URL(req.url).origin;

  if (action === "mark_verified") {
    const { error } = await admin.auth.admin.updateUserById(userId, { email_confirm: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await admin
      .from("audit_logs")
      .insert({ user_id: userId, action: "admin_mark_verified", details: { by: "admin" } });
  } else if (action === "resend") {
    const { data: u, error: ge } = await admin.auth.admin.getUserById(userId);
    if (ge || !u?.user?.email) return NextResponse.json({ error: "User not found." }, { status: 404 });
    const { error } = await admin.auth.resend({
      type: "signup",
      email: u.user.email,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    if (error) return NextResponse.json({ error: "Could not send verification. Try again." }, { status: 500 });
    await admin
      .from("audit_logs")
      .insert({ user_id: userId, action: "admin_resend_verification", details: {} });
  }

  return NextResponse.json({ ok: true });
}
