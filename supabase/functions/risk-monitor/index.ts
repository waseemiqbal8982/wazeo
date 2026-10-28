import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");

const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

const RISK_ALERT = 30;
const SLICE_FRACTION = 0.2;
const SLICE_MAX = 350;

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const { data: orders, error } = await sb
    .from("engagement_orders")
    .select("id, user_id, total_qty, risk_score, status, algorithm_json")
    .in("status", ["running", "scheduled"]);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });

  let flagged = 0;
  let paused = 0;
  const now = new Date().toISOString();

  for (const o of orders || []) {
    const orderTotal = Number(o.total_qty) || 0;
    const cap = Math.max(50, Math.ceil(orderTotal * SLICE_FRACTION));
    let problem = false;

    // server-side sweep: any run escaping the slice caps gets skipped
    const { data: runs, error: runErr } = await sb
      .from("organic_run_schedule")
      .select("id, quantity, status")
      .eq("order_id", o.id)
      .in("status", ["pending", "processing"]);
    if (!runErr) {
      for (const r of runs || []) {
        if (r.quantity > cap || r.quantity > SLICE_MAX) {
          await sb.from("organic_run_schedule").update({ status: "skipped", error: "risk-monitor: slice exceeds cap" }).eq("id", r.id);
          problem = true;
          flagged++;
        }
      }
    }

    const risk = Number(o.risk_score) || 0;
    if (risk > RISK_ALERT || problem) {
      if (o.status !== "paused") {
        await sb.from("engagement_orders").update({ status: "paused", updated_at: now }).eq("id", o.id);
        paused++;
      }
      await sb.from("announcements").insert({
        title: "Organic order paused (risk monitor)",
        body: `Order ${o.id} was auto-paused: recorded risk ${risk} over alert threshold or a guardrail slice was found.`,
        active: true,
      }).maybeSingle();
    }
  }

  return new Response(JSON.stringify({ ok: true, flagged, paused }), { headers: { "Content-Type": "application/json" } });
});
