import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adapterForProvider } from "@/lib/providerRegistry";
import { applyHealth, sendAlert } from "@/lib/health";
import { getSettingInt } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: providers } = await admin
    .from("providers")
    .select("*")
    .eq("active", true)
    .eq("status", "active");

  let ok = 0;
  let failed = 0;
  let lowAlerts = 0;

  for (const p of providers || []) {
    const adapter = adapterForProvider(p);
    try {
      const balance = await adapter.getBalance();
      const prev = Number(p.balance) || 0;
      const threshold = Number(p.low_balance_threshold) || 0;
      await admin
        .from("providers")
        .update({
          balance,
          balance_at: new Date().toISOString(),
          balance_stale: false,
        })
        .eq("id", p.id);
      await applyHealth(p.id, true);

      if (threshold > 0 && balance < threshold && prev >= threshold) {
        lowAlerts++;
        await sendAlert("provider_low_balance", {
          event: "provider_low_balance",
          provider_id: p.id,
          provider_name: p.name,
          balance,
          threshold,
          message: `Provider "${p.name}" balance ${balance} is below threshold ${threshold}.`,
        });
      }
      ok++;
    } catch {
      await admin.from("providers").update({ balance_stale: true }).eq("id", p.id);
      await applyHealth(p.id, false);
      failed++;
    }
  }

  return NextResponse.json({ ok: true, polled: ok, failed, lowAlerts, polledAt: new Date().toISOString() });
}

// Export a helper for the poll interval (configurable via settings).
export async function pollIntervalMinutes(): Promise<number> {
  return getSettingInt("balance_poll_min", 5);
}
