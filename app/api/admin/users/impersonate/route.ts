import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// Secure impersonation: admin-only, cannot impersonate other admins, and the
// resulting session is clearly flagged (the callback sets an "impersonating"
// cookie that the UI banner + exit rely on).
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
  const { data: target } = await admin.from("profiles").select("role,username").eq("id", userId).maybeSingle();
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (target.role === "admin") {
    return NextResponse.json({ error: "You cannot impersonate another admin." }, { status: 403 });
  }

  const { data: u } = await admin.auth.admin.getUserById(userId);
  const email = u?.user?.email;
  if (!email) return NextResponse.json({ error: "User has no email." }, { status: 400 });

  const origin = new URL(req.url).origin;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${origin}/auth/callback?next=/dashboard&impersonate=1` },
  });

  if (error || !data?.properties?.redirect_to) {
    return NextResponse.json({ error: "Could not generate impersonation link." }, { status: 500 });
  }

  await admin.from("audit_logs").insert({
    user_id: userId,
    action: "admin_impersonate_start",
    details: { by: "admin", target: target.username },
  });

  // Return the ready-to-use magic link URL; the client navigates to it.
  return NextResponse.json({ url: data.properties.redirect_to });
}
