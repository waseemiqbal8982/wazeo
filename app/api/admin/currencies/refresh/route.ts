import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/adminAuth";

export async function POST() {
  const adminOk = await isAdminUser();
  if (adminOk !== true) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  // Free API: open.er-api.com (no key required). Fallback to manual rates.
  let rates: Record<string, number> | null = null;
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const j = await res.json();
      if (j?.result === "success" && j.rates) {
        rates = {
          INR: Number(j.rates.INR),
          PKR: Number(j.rates.PKR),
          CNY: Number(j.rates.CNY),
        };
      }
    }
  } catch {}

  if (!rates) {
    return NextResponse.json({ error: "Could not refresh rates. Check network and try again." }, { status: 502 });
  }

  const admin = createAdminClient();
  const rows = Object.entries(rates).map(([code, value]) => ({ key: `rate_${code}`, value: String(value) }));
  const { error } = await admin.from("settings").upsert(rows, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, rates });
}
