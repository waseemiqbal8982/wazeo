import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseRates } from "@/lib/currencies";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createAdminClient();
  const { data } = await admin.from("settings").select("*");
  const map = Object.fromEntries((data || []).map((s) => [s.key, s.value]));
  const rates = parseRates(map);

  let def = "USD";
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase.from("profiles").select("currency").eq("id", user.id).maybeSingle();
      if (prof?.currency) def = prof.currency;
    }
  } catch {}

  return NextResponse.json({ rates, default: def });
}
