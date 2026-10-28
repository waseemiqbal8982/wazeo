import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");

const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

async function getProviderBalance(p: { id: string; api_url?: string | null; api_key?: string | null }): Promise<number> {
  if (!p.api_url || !p.api_key) return 850.5; // mock
  const body = new URLSearchParams({ key: p.api_key, action: "balance" });
  const res = await fetch(p.api_url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await res.json().catch(() => ({}));
  return Number(data?.balance || data?.result?.balance || 0);
}

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const { data: providers, error } = await sb
    .from("providers")
    .select("id, name, api_url, api_key, balance, low_balance_threshold")
    .eq("active", true)
    .eq("status", "active");

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });

  let ok = 0;
  let failed = 0;
  let lowAlerts = 0;
  const now = new Date().toISOString();

  for (const p of providers || []) {
    const threshold = Number(p.low_balance_threshold) || 0;
    try {
      const balance = await getProviderBalance(p);
      await sb.from("providers").update({ balance, balance_at: now, balance_stale: false }).eq("id", p.id);
      if (threshold > 0 && balance < threshold) {
        lowAlerts++;
        await sb.from("announcements").insert({
          title: "Low provider balance",
          body: `Provider "${p.name}" balance ${balance} is below threshold ${threshold}.`,
          active: true,
        }).maybeSingle();
      }
      ok++;
    } catch {
      await sb.from("providers").update({ balance_stale: true }).eq("id", p.id);
      failed++;
    }
  }

  return new Response(JSON.stringify({ ok: true, polled: ok, failed, lowAlerts, polledAt: now }), { headers: { "Content-Type": "application/json" } });
});
