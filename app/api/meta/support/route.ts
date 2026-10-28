import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Public-safe surface of the Support Hub config (never exposes other settings).
export async function GET() {
  const admin = createAdminClient();
  const { data } = await admin.from("settings").select("*");
  const map = Object.fromEntries((data || []).map((s) => [s.key, s.value]));
  return NextResponse.json({
    whatsapp: map.support_whatsapp || "",
    telegram: map.support_telegram || "",
    email: map.support_email || "",
    workingHours: map.working_hours || "",
    workingTz: map.working_tz || "",
    welcome: map.support_welcome || "",
  });
}
