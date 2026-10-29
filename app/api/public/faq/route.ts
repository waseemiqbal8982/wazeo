import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("faqs")
    .select("id, question, answer")
    .eq("active", true)
    .order("sort", { ascending: true })
    .limit(50);
  return NextResponse.json({ faqs: data || [] });
}
