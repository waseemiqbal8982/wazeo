/**
 * Orchestration: given an organic order request, produce a complete delivery
 * plan + risk report. Deterministic for a given seed. Includes auto re-roll
 * (pick the lowest-risk plan among a few seeds, targeting score <= 22).
 */

import { rngFromString } from "./random";
import {
  CURVE_PRESETS,
  buildPatternParams,
  WINDOW_PRESETS,
  ENGAGEMENT_TYPES,
  HARD_CAPS,
  type EngagementType,
  type CurvePreset,
} from "./types";
import {
  buildCumulativeCurve,
  generateMicroSteps,
  expectedFirstHourFraction,
  type MicroStep,
  type CurvePoint,
} from "./curve";
import { scoreRisk, organicScore, validateGuardrails, firstHourCeiling, type RiskResult } from "./risk";
import { riskBand } from "./types";

export interface OrganicOrderInput {
  engagement: Partial<Record<EngagementType, number>>;
  presetId: string;
  windowId: string; // "2h" | "6h" | ...
  variancePercent?: number;
  peakHours?: boolean;
  organicMode?: boolean;
  startHour?: number;
  weekday?: boolean;
  seed?: string;
  reRollTries?: number;
}

export interface OrganicStep extends MicroStep {
  presetId: string;
}

export interface OrganicPreview {
  presetId: string;
  presetLabel: string;
  windowMinutes: number;
  risk: number;
  band: RiskResult["band"];
  pass: boolean;
  organicScore: number;
  reRolls: number;
  seed: string;
  microStepsCount: number;
  totalEvents: number;
  engagement: Partial<Record<EngagementType, number>>;
  curvePoints: CurvePoint[];
  steps: OrganicStep[];
  violations: string[];
  penalties: RiskResult["penalties"];
}

function resolvePreset(presetId: string): CurvePreset {
  const found = CURVE_PRESETS.find((p) => p.id === presetId);
  if (found) return found;
  const lib = buildPatternParams(presetId);
  if (lib) return { id: presetId, label: presetId, shape: "pattern", rating: 4, params: lib };
  return CURVE_PRESETS[0]; // default auto_safe-ish
}

function resolveWindow(windowId: string): number {
  const w = WINDOW_PRESETS.find((x) => x.id === windowId);
  return w ? w.minutes : 1440;
}

function buildSinglePlan(input: OrganicOrderInput, seed: string): OrganicPreview {
  const preset = resolvePreset(input.presetId);
  const windowMinutes = resolveWindow(input.windowId);
  const rng = rngFromString(seed);

  // E4 — true per-order re-roll: jitter the delivery window and the preset shape
  // geometry by ±15–30% seeded by this attempt's seed, so each re-roll explores a
  // genuinely different delivery profile (not just a new RNG stream).
  const windowScale = 1 + (rng() - 0.5) * 0.6; // ±30% around the chosen window
  const jitteredWindow = Math.max(60, Math.round(windowMinutes * windowScale));

  function jitterBump(b: { w: number; mu: number; sigma: number; gamma: number }) {
    const j = (v: number, lo: number, hi: number) =>
      Math.min(hi, Math.max(lo, v * (1 + (rng() - 0.5) * 0.3)));
    return {
      w: Math.max(0.05, b.w * (1 + (rng() - 0.5) * 0.3)),
      mu: j(b.mu, 0.02, 0.98),
      sigma: j(b.sigma, 0.02, 0.6),
      gamma: j(b.gamma, 0.6, 3),
    };
  }

  const jitteredPreset: CurvePreset = {
    ...preset,
    params: {
      bumps: preset.params.bumps.map(jitterBump),
      jitter: preset.params.jitter,
      dipChance: preset.params.dipChance,
      burstChance: preset.params.burstChance,
      pauseChance: preset.params.pauseChance,
    },
  };

  const curvePoints = buildCumulativeCurve(jitteredPreset, jitteredWindow, {
    startHour: input.startHour,
    weekday: input.weekday,
  });

  const engagement = ENGAGEMENT_TYPES.filter(
    (t) => (input.engagement[t] ?? 0) > 0,
  );
  const allSteps: OrganicStep[] = [];
  const totalQty = engagement.reduce((s, t) => s + (input.engagement[t] ?? 0), 0);

  for (const t of engagement) {
    const qty = input.engagement[t]!;
    const rawSteps: OrganicStep[] = generateMicroSteps({
      preset: jitteredPreset,
      engagementType: t,
      totalQuantity: qty,
      windowMinutes: jitteredWindow,
      rng,
      curve: curvePoints,
      maxSteps: Math.max(1, Math.floor(HARD_CAPS.maxMicroStepsPerRun / Math.max(1, engagement.length))),
    }).map((s) => ({ ...s, presetId: preset.id }));
    // round-number jitter ±5%
    const steps = rawSteps.map((s) => {
      if (s.quantity % 10 === 0) {
        const jit = 1 + (rng() - 0.5) * 0.1;
        s.quantity = Math.max(1, Math.round(s.quantity * jit));
      }
      return s;
    });
    allSteps.push(...steps);
  }

  // Expected first-60-min fraction from the selected curve density (shape-
  // relative slow-start ceiling). Shared with the hard validator.
  const expFirstHourFrac = expectedFirstHourFraction(jitteredPreset, jitteredWindow);

  const guard = validateGuardrails({
    steps: allSteps,
    windowMinutes: jitteredWindow,
    totalQuantity: totalQty || 1,
    expectedFirstHourFraction: expFirstHourFrac,
  });

  // First-hour guardrail is curve-relative (shared with validateGuardrails so
  // the hard validator, scorer, and planner always agree).
  const ceiling = firstHourCeiling(jitteredWindow, expFirstHourFrac);
  const firstHourAbove = guard.firstHourFraction > ceiling;
  // scale penalty by how far over the ceiling we are, capped
  const firstHourPenaltyRaw = Math.max(0, (guard.firstHourFraction - ceiling) / ceiling);

  // Engagement-rate deviation from the 2-6% target band (acceptance #5).
  // For each engagement type (likes/comments/saves/shares) relative to views we
  // push the score up when the requested ratio lands outside [0.02, 0.06].
  const viewsQty = input.engagement.views ?? 0;
  let engagementDeviation = 0;
  if (viewsQty > 0) {
    for (const t of engagement) {
      if (t === "views") continue;
      const ratio = (input.engagement[t] ?? 0) / viewsQty;
      if (ratio > 0) {
        if (ratio > 0.06) engagementDeviation += ratio - 0.06;
        else if (ratio < 0.02) engagementDeviation += 0.02 - ratio;
      }
    }
  }

  const riskRes = scoreRisk({
    maxSliceFraction: guard.maxSliceFraction,
    hasFlatGap: guard.maxGapMinutes > HARD_CAPS.maxGapMinutes,
    endDump: guard.endDumpFraction > HARD_CAPS.endDumpLastPercent / 100,
    engagementDeviation,
    firstHourAbove,
    firstHourOverdrive: firstHourPenaltyRaw,
    offHoursRatio: 0.1,
    roundNumberRatio: guard.roundNumberRatio,
    serviceQuality: input.presetId === "auto_safe" ? 0.1 : 0.3,
    microStepsCount: allSteps.length,
  });

  // Higher user variance → slightly higher risk, capped at 99.
  const varianceAdj = (input.variancePercent ?? 0) / 100;
  const finalRisk = Math.min(99, Math.round(riskRes.risk * (1 + varianceAdj * 0.25)));

  const organic = organicScore(preset, allSteps.length);

  return {
    presetId: preset.id,
    presetLabel: preset.label,
    windowMinutes: jitteredWindow,
    risk: finalRisk,
    band: riskBand(finalRisk),
    pass: finalRisk <= HARD_CAPS.placementMinScore,
    organicScore: organic,
    reRolls: 0,
    seed,
    microStepsCount: allSteps.length,
    totalEvents: allSteps.reduce((s, x) => s + x.quantity, 0),
    engagement: input.engagement,
    curvePoints,
    steps: allSteps,
    violations: guard.violations,
    penalties: riskRes.penalties,
  };
}

/**
 * Generate an organic plan with auto re-roll. Re-rolls up to `reRollTries`
 * seeds and returns the lowest-risk plan. A re-roll is triggered when the
 * risk exceeds the target ceiling (22) so the UI keeps the gauge green.
 */
export function generateOrganicPlan(input: OrganicOrderInput): OrganicPreview {
  const tries = Math.max(1, input.reRollTries ?? 5);
  const base = input.seed ?? "wazeo-organic";

  let best: OrganicPreview | null = null;
  for (let i = 0; i < tries; i++) {
    const seed = `${base}:${i}`;
    const plan = buildSinglePlan(input, seed);
    if (!best || plan.risk < best.risk) best = plan;
    if (best.risk <= 22) break;
  }
  const b = best!;
  return {
    ...b,
    reRolls: tries,
    risk: b.risk,
    pass: b.risk <= HARD_CAPS.placementMinScore,
  };
}
