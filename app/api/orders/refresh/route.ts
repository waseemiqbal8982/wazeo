import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { providerGetStatus } from "@/lib/provider";
import { runHooks } from "@/lib/hooks";
import { logProviderCall } from "@/lib/providerLog";

export const dynamic = "force-dynamic";

function mapStatus(s: string): string {
  const v = s.toLowerCase();
  if (v.includes("cancel") || v.includes("refund")) return "cancelled";
  if (v.includes("complet") || v.includes("done")) return "completed";
  if (v.includes("partial")) return "partial";
  if (v.includes("progress")) return "in_progress";
  if (v.includes("process") || v.includes("active")) return "processing";
  return "pending";
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  // Refresh the current user's orders that are not finished and have a provider id.
  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, provider_order_id, user_id")
    .eq("user_id", user.id)
    .not("status", "in", "(completed,cancelled,refunded)")
    .not("provider_order_id", "is", null);

  let updated = 0;
  for (const o of orders || []) {
    try {
      const t0 = Date.now();
      const { status } = await providerGetStatus(o.provider_order_id);
      const mapped = mapStatus(status);
      await logProviderCall({ action: "status", ok: true, duration_ms: Date.now() - t0, response_masked: JSON.stringify({ status: mapped }) });
      if (mapped !== o.status) {
        await admin.from("orders").update({ status: mapped }).eq("id", o.id);
        if (mapped === "cancelled") {
          try { await admin.rpc("cancel_and_refund", { p_order_id: o.id }); } catch {}
        }
        await runHooks("order.status_changed", { orderId: o.id, status: mapped });
      }
      updated++;
    } catch (e) {
      await logProviderCall({ action: "status", ok: false, error: String(e) });
    }
  }

  return NextResponse.json({ ok: true, updated });
}
