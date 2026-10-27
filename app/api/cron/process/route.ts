import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { providerAddOrder } from "@/lib/provider";
import { buildSchedule } from "@/lib/schedule";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Due chunks: pending and run_at <= now, limit to control load.
  const { data: chunks, error } = await admin
    .from("order_chunks")
    .select("id, order_id, quantity, run_at, status, retries")
    .eq("status", "pending")
    .lte("run_at", new Date().toISOString())
    .order("run_at", { ascending: true })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!chunks || chunks.length === 0) return NextResponse.json({ ok: true, processed: 0 });

  let processed = 0;

  for (const chunk of chunks) {
    // idempotency guard: try to atomically claim the chunk
    const { data: claimed } = await admin
      .from("order_chunks")
      .update({ status: "sent", provider_order_id: null })
      .eq("id", chunk.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (!claimed) continue; // someone else took it

    // Fetch the order + service details
    const { data: order } = await admin
      .from("orders")
      .select("id, link, service_id, provider_order_id")
      .eq("id", chunk.order_id)
      .single();

    if (!order) {
      await admin.from("order_chunks").update({ status: "failed", error: "order missing" }).eq("id", chunk.id);
      continue;
    }

    const { data: service } = await admin
      .from("services")
      .select("provider_service_id")
      .eq("id", order.service_id)
      .single();

    try {
      const { orderId: providerOrderId } = await providerAddOrder({
        service: service?.provider_service_id || String(chunk.order_id),
        link: order.link,
        quantity: chunk.quantity,
      });
      await admin.from("order_chunks").update({ status: "done", provider_order_id: providerOrderId }).eq("id", chunk.id);
      await admin.from("orders").update({ status: "processing", provider_order_id: providerOrderId || order.provider_order_id }).eq("id", chunk.order_id);
      processed++;
    } catch (e) {
      const retries = Number(chunk.retries || 0) + 1;
      const failed = retries >= 3;
      await admin
        .from("order_chunks")
        .update({ status: failed ? "failed" : "pending", retries, error: String(e) })
        .eq("id", chunk.id);
    }
  }

  // Update parent order status if all chunks finished
  const { data: orders } = await admin.from("orders").select("id").not("status", "in", "(completed,cancelled,refunded)");
  for (const o of orders || []) {
    const { data: rem } = await admin.from("order_chunks").select("status").eq("order_id", o.id);
    const pending = (rem || []).filter((c) => c.status === "pending").length;
    const failedAll = (rem || []).length > 0 && (rem || []).every((c) => c.status === "failed");
    if (pending === 0) {
      if (failedAll) {
        try { await admin.rpc("cancel_and_refund", { p_order_id: o.id }); } catch {}
      } else {
        await admin.from("orders").update({ status: "completed" }).eq("id", o.id);
      }
    }
  }

  return NextResponse.json({ ok: true, processed });
}
