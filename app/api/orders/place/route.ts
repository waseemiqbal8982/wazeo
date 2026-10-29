import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSchedule } from "@/lib/schedule";
import { validateLink } from "@/lib/validation";
import { runHooks } from "@/lib/hooks";
import { requireEmailVerifyAtSignup } from "@/lib/authPolicy";
import { getSettingInt } from "@/lib/settings";

export const dynamic = "force-dynamic";

interface PlaceBody {
  serviceId: string;
  link: string;
  quantity: number;
  durationMinutes?: number;
  curve?: string;
  curvePoints?: number[];
  startDelayMinutes?: number;
  variation?: number;
  minRun?: number;
  maxRun?: number;
  endAt?: string;
}

export async function POST(req: Request) {
  let body: PlaceBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Gradual mode is the only supported mode — no instant orders.
  const mode = "drip";
  const {
    serviceId,
    link,
    quantity,
    durationMinutes,
    curve = "steady",
    curvePoints,
    startDelayMinutes = 0,
    variation = 10,
    minRun,
    maxRun,
    endAt,
  } = body;

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

  // Validate delivery controls (always gradual).
  const minDuration = await getSettingInt("min_delivery_duration", 15);
  if (!durationMinutes || durationMinutes < Math.max(1, minDuration) || durationMinutes > 72 * 60) {
    return NextResponse.json(
      { error: `Delivery duration must be between ${Math.max(1, minDuration)} minutes and 72 hours.` },
      { status: 400 }
    );
  }
  const validCurves = ["steady", "slow_start", "bell_peak", "natural_wave", "custom"];
  if (!validCurves.includes(curve)) {
    return NextResponse.json({ error: "Choose a valid delivery curve." }, { status: 400 });
  }
  if (curve === "custom" && (!Array.isArray(curvePoints) || curvePoints.length < 2)) {
    return NextResponse.json({ error: "Draw your delivery curve with at least 2 points." }, { status: 400 });
  }
  const v = Math.min(30, Math.max(0, Number(variation) || 0));
  const delay = Math.max(0, Math.floor(Number(startDelayMinutes) || 0));
  if (delay >= durationMinutes) {
    return NextResponse.json({ error: "Start delay must be shorter than the delivery duration." }, { status: 400 });
  }
  if (endAt) {
    const end = new Date(endAt).getTime();
    const start = Date.now() + delay * 60000;
    if (!Number.isFinite(end) || end <= start) {
      return NextResponse.json({ error: "End time must be in the future after the start." }, { status: 400 });
    }
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
    p_duration_minutes: durationMinutes,
    p_curve: curve,
  });

  if (placeErr) {
    const msg = String(placeErr.message || placeErr);
    return NextResponse.json({
      error: msg.includes("Insufficient") ? "Insufficient balance." : msg,
    }, { status: 400 });
  }

  const orderId = placed.order_id;
  const admin = createAdminClient();

  // Gradual delivery: build the schedule and save chunks.
  const runMin = Number(minRun) > 0 ? Number(minRun) : (Number(service.run_min) > 0 ? Number(service.run_min) : Number(service.min) || 10);
  const runMax = Number(maxRun) > 0 ? Number(maxRun) : (Number(service.run_max) > 0 ? Number(service.run_max) : 0);
  const schedule = buildSchedule(quantity, durationMinutes!, curve as any, runMin, {
    seed: orderId,
    variation: v,
    startDelayMinutes: delay,
    minRun: runMin,
    ...(runMax > runMin ? { maxRun: runMax } : {}),
    ...(curve === "custom" ? { curvePoints } : {}),
  });

  const startBase = Date.now() + delay * 60000;
  const rows = schedule.map((c) => ({
    order_id: orderId,
    run_at: new Date(startBase + c.minutes * 60000).toISOString(),
    quantity: c.quantity,
  }));
  await admin.from("order_chunks").insert(rows);
  await admin.from("orders").update({ status: "pending" }).eq("id", orderId);

  await runHooks("order.created", { orderId, quantity, serviceName: service.name, userId: user.id });

  return NextResponse.json({ ok: true, orderId, balance: placed.balance });
}
