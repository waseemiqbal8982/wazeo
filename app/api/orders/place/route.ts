import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { providerAddOrder, providerGetServices } from "@/lib/provider";
import { buildSchedule } from "@/lib/schedule";
import { validateLink } from "@/lib/validation";
import { runHooks } from "@/lib/hooks";
import { logProviderCall } from "@/lib/providerLog";
import { requireEmailVerifyAtSignup } from "@/lib/authPolicy";

export const dynamic = "force-dynamic";

interface PlaceBody {
  serviceId: string;
  link: string;
  quantity: number;
  mode?: string;
  durationMinutes?: number;
  curve?: string;
}

export async function POST(req: Request) {
  let body: PlaceBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { serviceId, link, quantity, mode = "instant", durationMinutes, curve } = body;

  if (!serviceId || !link || !quantity || quantity <= 0) {
    return NextResponse.json({ error: "Service, link and a positive quantity are required." }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!user.email_confirmed_at && (await requireEmailVerifyAtSignup())) {
    return NextResponse.json({ error: "Please verify your email first." }, { status: 403 });
  }

  // Access-expiry guard: only NEW orders are blocked. History & renewal remain.
  const { data: prof } = await supabase.from("profiles").select("access_expires_at").eq("id", user.id).single();
  if (prof?.access_expires_at) {
    const end = new Date(prof.access_expires_at).getTime();
    if (Number.isFinite(end) && end <= Date.now()) {
      return NextResponse.json(
        { error: "Your access has expired. Renew with a new key to place new orders." },
        { status: 403 }
      );
    }
  }

  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .eq("active", true)
    .single();

  if (!service) {
    return NextResponse.json({ error: "Service not found or inactive." }, { status: 404 });
  }

  const linkError = validateLink(service.platform, link);
  if (linkError) return NextResponse.json({ error: linkError }, { status: 400 });

  if (quantity < Number(service.min) || quantity > Number(service.max)) {
    return NextResponse.json(
      { error: `Quantity must be between ${service.min} and ${service.max}.` },
      { status: 400 }
    );
  }

  if (mode === "drip") {
    if (!durationMinutes || durationMinutes < 15 || durationMinutes > 72 * 60) {
      return NextResponse.json({ error: "Drip duration must be between 15 minutes and 72 hours." }, { status: 400 });
    }
    if (!curve) return NextResponse.json({ error: "Choose a drip curve." }, { status: 400 });
  }

  // Order guard: reject duplicate active orders for the same link.
  const { data: dup } = await supabase
    .from("orders")
    .select("id")
    .eq("user_id", user.id)
    .eq("link", link.trim())
    .not("status", "in", '(completed,cancelled,refunded)')
    .limit(1);

  if (dup && dup.length > 0) {
    return NextResponse.json(
      { error: "You already have an active order for this link." },
      { status: 400 }
    );
  }

  // Atomically place order + deduct balance (uses the user's session).
  const { data: placed, error: placeErr } = await supabase.rpc("place_order", {
    p_service_id: serviceId,
    p_link: link,
    p_quantity: quantity,
    p_mode: mode,
    p_duration_minutes: mode === "drip" ? durationMinutes : null,
    p_curve: mode === "drip" ? curve : null,
  });

  if (placeErr) {
    const msg = String(placeErr.message || placeErr);
    return NextResponse.json({
      error: msg.includes("Insufficient") ? "Insufficient balance." : msg,
    }, { status: 400 });
  }

  const orderId = placed.order_id;
  const admin = createAdminClient();

  if (mode === "instant") {
    try {
      const providerServices = await providerGetServices();
      const match = providerServices.find((s) => s.provider_service_id === service.provider_service_id);
      const providerId = match ? match.provider_service_id : service.provider_service_id;
      const t0 = Date.now();
      const { orderId: providerOrderId } = await providerAddOrder({
        service: providerId,
        link,
        quantity,
      });
      await admin.from("orders").update({ provider_order_id: providerOrderId, status: "processing" }).eq("id", orderId);
      await logProviderCall({ action: "add", ok: true, duration_ms: Date.now() - t0, response_masked: JSON.stringify({ order: providerOrderId }) });
    } catch (e) {
      await logProviderCall({ action: "add", ok: false, error: String(e) });
      // refund automatically
      try { await admin.rpc("cancel_and_refund", { p_order_id: orderId }); } catch {}
      return NextResponse.json(
        { error: "We couldn't reach the provider. Your payment was refunded automatically. Please try again." },
        { status: 502 }
      );
    }
  } else {
    // drip: build schedule and save chunks
    const schedule = buildSchedule(quantity, durationMinutes!, curve as any, Number(service.min));
    const rows = schedule.map((c) => ({
      order_id: orderId,
      run_at: new Date(Date.now() + c.minutes * 60000).toISOString(),
      quantity: c.quantity,
    }));
    await admin.from("order_chunks").insert(rows);
    await admin.from("orders").update({ status: "pending" }).eq("id", orderId);
  }

  await runHooks("order.created", { orderId, quantity, serviceName: service.name, userId: user.id });

  return NextResponse.json({ ok: true, orderId, balance: placed.balance });
}
