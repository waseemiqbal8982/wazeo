import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSetting, getSettingJson } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const adminOk = await isAdminUser();
  if (adminOk !== true) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const admin = createAdminClient();
  const { data: providers } = await admin.from("providers").select("*").order("priority", { ascending: true });

  const baseCurrency = (await getSetting("base_currency")) || "USD";
  const rates = await getSettingJson<Record<string, number>>("fx_rates_json", {});

  let total = 0;
  const rows = (providers || []).map((p) => {
    const cur = (p.currency || baseCurrency).toUpperCase();
    const rate = cur === baseCurrency.toUpperCase() ? 1 : rates[cur] ?? 1;
    const bal = Number(p.balance) || 0;
    const inBase = bal * rate;
    total += inBase;
    const {
      api_key,
      api_key_enc,
      ...rest
    } = p;
    return { ...rest, hasApiKey: Boolean(api_key_enc || api_key), balanceInBase: Math.round(inBase * 10000) / 10000 };
  });

  return NextResponse.json({
    providers: rows,
    total: Math.round(total * 10000) / 10000,
    baseCurrency,
  });
}
