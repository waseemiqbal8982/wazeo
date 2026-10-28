import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  try {
    await supabase.auth.signOut();
  } catch {}
  const res = NextResponse.json({ ok: true });
  res.cookies.set("wazeo-impersonating", "", { maxAge: 0, path: "/" });
  return res;
}
