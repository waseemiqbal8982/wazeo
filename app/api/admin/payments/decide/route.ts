import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/adminAuth";
import { runHooks } from "@/lib/hooks";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ok = await isAdminUser();
  if (ok !== true) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  let body: { paymentId?: string; approve?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { paymentId, approve } = body;
  if (!paymentId || typeof approve !== "boolean") {
    return NextResponse.json({ error: "paymentId and approve required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: pay } = await admin.from("payments").select("user_id,amount,status").eq("id", paymentId).maybeSingle();
  if (!pay) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  if (pay.status !== "pending") {
    return NextResponse.json({ error: "This payment was already processed." }, { status: 400 });
  }

  const { error } = await admin.rpc("approve_payment", { p_payment_id: paymentId, p_approve: approve });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    user_id: pay.user_id,
    action: approve ? "admin_payment_approved" : "admin_payment_rejected",
    details: { payment_id: paymentId, amount: pay.amount },
  });

  if (approve) {
    try {
      await runHooks("payment.approved", { paymentId, userId: pay.user_id, amount: pay.amount });
    } catch {}
  }

  return NextResponse.json({ ok: true });
}
