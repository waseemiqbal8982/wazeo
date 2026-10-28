import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");
const PROVIDER_URL = Deno.env.get("PROVIDER_API_URL") || "";
const PROVIDER_KEY = Deno.env.get("PROVIDER_API_KEY") || "";

const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

// E8 guardrail caps re-enforced server-side (mirror of HARD_CAPS + slice rule).
const SLICE_MAX = 350;
const SLICE_FRACTION = 0.2;

let mockCounter = 100000;
async function providerAddOrder(service: string, link: string, quantity: number): Promise<string> {
  if (!PROVIDER_URL || !PROVIDER_KEY) {
    mockCounter += 1;
    return `MOCK-${mockCounter}`;
  }
  const body = new URLSearchParams({ key: PROVIDER_KEY, action: "add", service, link, quantity: String(quantity) });
  const res = await fetch(PROVIDER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await res.json();
  if (!res.ok || (data && data.status === "error")) {
    throw new Error(`provider add failed: ${data?.error || res.status}`);
  }
  return String(data?.order || data?.result?.order || "");
}

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const { data: runs, error } = await sb
    .from("organic_run_schedule")
    .select("id, order_id, engagement_type, quantity, run_at, status, retries")
    .eq("status", "pending")
    .lte("run_at", new Date().toISOString())
    .order("run_at", { ascending: true })
    .limit(25);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  if (!runs || runs.length === 0) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: { "Content-Type": "application/json" } });
  }

  let processed = 0;
  let skipped = 0;
  for (const run of runs) {
    // idempotent claim
    const { data: claimed } = await sb
      .from("organic_run_schedule")
      .update({ status: "processing" })
      .eq("id", run.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    const { data: order } = await sb
      .from("engagement_orders")
      .select("org_link, total_qty, status")
      .eq("id", run.order_id)
      .single();

    if (!order) {
      await sb.from("organic_run_schedule").update({ status: "failed", error: "order missing" }).eq("id", run.id);
      continue;
    }

    // E8 — server-side guardrail: skip oversized slices
    const orderTotal = Number(order.total_qty) || 0;
    const sliceCap = Math.max(50, Math.ceil(orderTotal * SLICE_FRACTION));
    if (run.quantity > sliceCap || run.quantity > SLICE_MAX) {
      await sb.from("organic_run_schedule").update({ status: "skipped", error: "slice exceeds server-side cap" }).eq("id", run.id);
      skipped++;
      continue;
    }

    try {
      const providerRef = await providerAddOrder(`organic-${run.engagement_type}`, order.org_link, run.quantity);
      await sb
        .from("organic_run_schedule")
        .update({ status: "delivered", provider_ref: providerRef, delivered_at: new Date().toISOString(), error: null })
        .eq("id", run.id);
      await sb.from("engagement_orders").update({ status: "running", updated_at: new Date().toISOString() }).eq("id", run.order_id);
      processed++;
    } catch (e) {
      const retries = Number(run.retries || 0) + 1;
      const failed = retries >= 3;
      await sb
        .from("organic_run_schedule")
        .update({ status: failed ? "failed" : "pending", retries, error: String(e) })
        .eq("id", run.id);
    }
  }

  return new Response(JSON.stringify({ ok: true, processed, skipped }), { headers: { "Content-Type": "application/json" } });
});
