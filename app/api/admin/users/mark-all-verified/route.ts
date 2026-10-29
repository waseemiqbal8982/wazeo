import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/adminAuth";

export async function POST() {
  const ok = await isAdminUser();
  if (ok !== true) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const admin = createAdminClient();
  let updated = 0;

  try {
    // Mark every existing user as email-verified (bulk admin action).
    let page = 0;
    for (;;) {
      const { data, error } = await admin.auth.admin.listUsers({ page: page + 1, perPage: 1000 });
      if (error) return NextResponse.json({ error: "Could not list users." }, { status: 500 });
      const users = data?.users || [];
      if (!users.length) break;
      for (const u of users) {
        if (!u.email_confirmed_at) {
          await admin.auth.admin.updateUserById(u.id, { email_confirm: true });
          updated++;
        }
      }
      page++;
      if (users.length < 1000) break;
    }
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  // Audit-log the bulk action.
  try {
    await admin.from("audit_logs").insert({
      action: "admin_mark_all_verified",
      details: { users_updated: updated },
    });
  } catch {}

  return NextResponse.json({ ok: true, updated });
}
