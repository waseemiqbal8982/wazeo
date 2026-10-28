import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ok = await isAdminUser();
  if (ok !== true) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const userId = body.userId;
  if (!userId) return NextResponse.json({ error: "userId required." }, { status: 400 });

  const admin = createAdminClient();
  const { data: u } = await admin.auth.admin.getUserById(userId);
  const email = u?.user?.email;
  if (!email) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const origin = new URL(req.url).origin;
  const { error } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });
  if (error) {
    return NextResponse.json({ error: "Could not send reset email. Try again." }, { status: 500 });
  }

  await admin.from("audit_logs").insert({
    user_id: userId,
    action: "admin_reset_password",
    details: { by: "admin" },
  });

  return NextResponse.json({ ok: true });
}
