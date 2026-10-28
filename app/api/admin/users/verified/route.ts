import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/adminAuth";

export async function GET() {
  const ok = await isAdminUser();
  if (ok !== true) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const admin = createAdminClient();
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const map: Record<string, boolean> = {};
  for (const u of data?.users || []) {
    map[u.id] = !!u.email_confirmed_at;
  }
  return NextResponse.json({ verified: map });
}
