import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateOrganicPlan,
  HARD_CAPS,
  ENGAGEMENT_TYPES,
  type EngagementType,
} from "@/lib/organic";

export const dynamic = "force-dynamic";

interface OrganicPlaceBody {
  link?: string;
  platform?: string;
  presetId?: string;
  windowId?: string;
  variance?: number;
  peakHours?: boolean;
  organicMode?: boolean;
  engagement?: Record<string, number>;
}

export async function POST(req: Request) {
  let body: OrganicPlaceBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const link = (body.link || "").trim();
  if (!link) {
    return NextResponse.json({ error: "A post link is required." }, { status: 400 });
  }

  const engagement = (body.engagement || {}) as Record<string, number>;
  const selected = ENGAGEMENT_TYPES.filter((t) => Number(engagement[t] || 0) > 0);
  if (selected.length === 0) {
    return NextResponse.json({ error: "Pick at least one engagement type." }, { status: 400 });
  }
  for (const t of selected) {
    const qty = Number(engagement[t] || 0);
    if (qty > HARD_CAPS.maxEvents) {
      return NextResponse.json(
        { error: `${t} quantity ${qty} exceeds the maximum ${HARD_CAPS.maxEvents}.` },
        { status: 400 }
      );
    }
  }

  const input = {
    engagement,
    presetId: body.presetId || "steady",
    windowId: body.windowId || "24h",
    variancePercent: Number(body.variance) || 0,
  };

  const plan = generateOrganicPlan(input);

  if (plan.violations.length > 0) {
    return NextResponse.json(
      { error: "Plan exceeds operational limits.", violations: plan.violations },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const algorithmJson = {
    presetId: plan.presetId,
    presetLabel: plan.presetLabel,
    windowId: body.windowId || "24h",
    windowMinutes: plan.windowMinutes,
    variancePercent: input.variancePercent,
    totalQty: plan.totalEvents,
    seed: plan.seed,
    microStepsCount: plan.microStepsCount,
  };

  const { data: order, error: orderErr } = await admin
    .from("engagement_orders")
    .insert({
      user_id: user.id,
      org_link: link,
      platform: body.platform || "instagram",
      preset_id: plan.presetId,
      window_id: body.windowId || "24h",
      window_minutes: plan.windowMinutes,
      variance_percent: input.variancePercent,
      peak_hours: Boolean(body.peakHours),
      organic_mode: body.organicMode !== false,
      total_qty: plan.totalEvents,
      algorithm_json: algorithmJson,
      status: "scheduled",
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: String(orderErr?.message || "insert failed") }, { status: 500 });
  }
  const orderId = order.id;

  const itemRows = selected.map((t) => ({
    order_id: orderId,
    engagement_type: t,
    quantity: Number(engagement[t] || 0),
  }));
  const { data: items, error: itemsErr } = await admin
    .from("engagement_order_items")
    .insert(itemRows)
    .select("id, engagement_type");
  if (itemsErr || !items) {
    await admin.from("engagement_orders").delete().eq("id", orderId).select("id").maybeSingle();
    return NextResponse.json({ error: String(itemsErr?.message || "items insert failed") }, { status: 500 });
  }
  const itemIdByType = new Map<EngagementType, string>(
    items.map((i) => [i.engagement_type as EngagementType, i.id as string])
  );

  const scheduleRows = plan.steps.map((s) => ({
    order_id: orderId,
    item_id: itemIdByType.get(s.engagementType as EngagementType) ?? null,
    engagement_type: s.engagementType,
    run_at: new Date(Date.now() + Math.round(s.minute) * 60000).toISOString(),
    quantity: s.quantity,
    status: "pending",
  }));

  const { error: schedErr } = await admin.from("organic_run_schedule").insert(scheduleRows);
  if (schedErr) {
    await admin.from("engagement_order_items").delete().eq("order_id", orderId);
    await admin.from("engagement_orders").delete().eq("id", orderId).select("id").maybeSingle();
    return NextResponse.json({ error: String(schedErr.message || "schedule insert failed") }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    orderId,
    scheduledRuns: scheduleRows.length,
    createdAt: now,
  });
}
