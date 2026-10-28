import { NextResponse } from "next/server";
import { generateOrganicPlan, type OrganicOrderInput } from "@/lib/organic";

export const dynamic = "force-dynamic";

interface PreviewBody {
  engagement: Record<string, number>;
  presetId?: string;
  windowId?: string;
  variancePercent?: number;
  peakHours?: boolean;
  organicMode?: boolean;
  startHour?: number;
  weekday?: boolean;
}

export async function POST(req: Request) {
  let body: PreviewBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const engagement = body.engagement ?? {};
  const hasQty = Object.values(engagement).some((q) => Number(q) > 0);
  if (!hasQty) {
    return NextResponse.json({ error: "At least one engagement type with a positive quantity is required." }, { status: 400 });
  }

  const input: OrganicOrderInput = {
    engagement,
    presetId: body.presetId ?? "auto_safe",
    windowId: body.windowId ?? "24h",
    variancePercent: body.variancePercent ?? 0,
    peakHours: body.peakHours ?? false,
    organicMode: body.organicMode ?? true,
    startHour: body.startHour,
    weekday: body.weekday,
  };

  const plan = generateOrganicPlan(input);

  return NextResponse.json({
    presetId: plan.presetId,
    presetLabel: plan.presetLabel,
    windowMinutes: plan.windowMinutes,
    risk: plan.risk,
    band: plan.band,
    pass: plan.pass,
    organicScore: plan.organicScore,
    reRolls: plan.reRolls,
    microStepsCount: plan.microStepsCount,
    totalEvents: plan.totalEvents,
    engagement: plan.engagement,
    curvePoints: plan.curvePoints,
    violations: plan.violations,
    penalties: plan.penalties,
  });
}
