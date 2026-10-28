import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ok = await isAdminUser();
  if (ok !== true) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  const admin = createAdminClient();
  let query = admin.from("login_history").select("*").order("created_at", { ascending: false }).limit(500);
  if (userId) query = query.eq("user_id", userId);

  const { data } = await query;
  const rows = data || [];

  // Attach usernames for display.
  const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
  const nameMap: Record<string, string> = {};
  if (ids.length) {
    const { data: profiles } = await admin.from("profiles").select("id,username").in("id", ids);
    (profiles || []).forEach((p) => { nameMap[p.id] = p.username; });
  }

  return NextResponse.json({
    rows: rows.map((r) => ({ ...r, username: nameMap[r.user_id] || r.user_id.slice(0, 8) })),
  });
}
