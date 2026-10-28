import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");

const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const { data: orders, error } = await sb
    .from("engagement_orders")
    .select("id")
    .in("status", ["running", "scheduled"]);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });

  let completed = 0;
  let failed = 0;
  let other = 0;
  const now = new Date().toISOString();
  for (const o of orders || []) {
    const { data: runs } = await sb.from("organic_run_schedule").select("status").eq("order_id", o.id);
    const statuses = (runs || []).map((r) => r.status);
    const pending = statuses.filter((s) => s === "pending" || s === "processing").length;
    const allFailed = statuses.length > 0 && statuses.every((s) => s === "failed");
    const anySkipped = statuses.includes("skipped");
    if (allFailed) {
      await sb.from("engagement_orders").update({ status: "failed", updated_at: now }).eq("id", o.id);
      failed++;
    } else if (pending === 0 && statuses.length > 0) {
      // all runs reached a terminal state (delivered and/or skipped)
      await sb.from("engagement_orders").update({ status: "completed", updated_at: now }).eq("id", o.id);
      completed++;
    } else if (anySkipped && pending === 0) {
      await sb.from("engagement_orders").update({ status: "completed", updated_at: now }).eq("id", o.id);
      completed++;
    } else {
      other++;
    }
  }

  return new Response(JSON.stringify({ ok: true, completed, failed, other }), { headers: { "Content-Type": "application/json" } });
});
