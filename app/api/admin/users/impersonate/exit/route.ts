import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  try {
    await supabase.auth.signOut();
    // Audit-log the exit while we still know we were impersonating.
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      action: "admin_impersonate_exit",
      details: { by: "admin" },
    });
  } catch {}
  const res = NextResponse.json({ ok: true });
  res.cookies.set("wazeo-impersonating", "", { maxAge: 0, path: "/" });
  return res;
}
