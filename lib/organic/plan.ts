/**
 * Plain delivery scheduling: produce a delivery plan from a curve preset plus
 * a natural-variation slider. No risk scoring, no re-roll, no pattern library.
 */

import { rngFromString } from "./random";
import {
  CURVE_PRESETS,
  WINDOW_PRESETS,
  ENGAGEMENT_TYPES,
  HARD_CAPS,
  type EngagementType,
  type CurvePreset,
} from "./types";
import {
  buildCumulativeCurve,
  generateMicroSteps,
  type MicroStep,
  type CurvePoint,
} from "./curve";

export interface OrganicOrderInput {
  engagement: Partial<Record<EngagementType, number>>;
  presetId: string;
  windowId: string; // "2h" | "6h" | ...
  variancePercent?: number;
  startHour?: number;
  weekday?: boolean;
  seed?: string;
}

export interface OrganicStep extends MicroStep {
  presetId: string;
}

export interface OrganicPreview {
  presetId: string;
  presetLabel: string;
  windowMinutes: number;
  microStepsCount: number;
  totalEvents: number;
  engagement: Partial<Record<EngagementType, number>>;
  curvePoints: CurvePoint[];
  steps: OrganicStep[];
  variancePercent: number;
  seed: string;
  violations: string[];
}

function resolvePreset(presetId: string): CurvePreset {
  if (presetId === "auto_safe") return CURVE_PRESETS[0];
  return CURVE_PRESETS.find((p) => p.id === presetId) ?? CURVE_PRESETS[0];
}

function resolveWindow(windowId: string): number {
  const w = WINDOW_PRESETS.find((x) => x.id === windowId);
  return w ? w.minutes : 1440;
}

export function generateOrganicPlan(input: OrganicOrderInput): OrganicPreview {
  const preset = resolvePreset(input.presetId);
  const windowMinutes = resolveWindow(input.windowId);
  const seed = input.seed ?? "wazeo-schedule";
  const rng = rngFromString(seed);
  const variancePercent = Math.max(0, Math.min(100, input.variancePercent ?? 0));

  const steps: OrganicStep[] = [];
  let totalEvents = 0;
  let overMax = false;

  for (const t of ENGAGEMENT_TYPES) {
    const qty = Math.floor(input.engagement[t] ?? 0);
    if (qty <= 0) continue;
    if (totalEvents + qty > HARD_CAPS.maxEvents) {
      overMax = true;
      continue;
    }
    const micro = generateMicroSteps({
      preset,
      engagementType: t,
      totalQuantity: qty,
      windowMinutes,
      rng,
    });
    for (const m of micro) {
      steps.push({ ...m, presetId: preset.id });
    }
    totalEvents += qty;
  }

  const curvePoints = buildCumulativeCurve(preset, windowMinutes, {
    startHour: input.startHour,
    weekday: input.weekday,
  });

  return {
    presetId: preset.id,
    presetLabel: preset.label,
    windowMinutes,
    microStepsCount: steps.length,
    totalEvents,
    engagement: input.engagement,
    curvePoints,
    steps,
    variancePercent,
    seed,
    violations: overMax ? [`Total exceeds max ${HARD_CAPS.maxEvents} events.`] : [],
  };
}
