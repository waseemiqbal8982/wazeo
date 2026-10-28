/**
 * Risk / organic scoring + guardrail validation.
 *
 * Risk = min(200*maxSliceFraction, cap) + flatGapPenalty + endDumpPenalty
 *        + engagementDeviation + firstHourPenalty + offHoursPenalty
 *        + roundNumberPenalty + serviceQualityPenalty
 *
 * organicScore = base + dipChance*weight + burstChance*weight + pauseChance*weight
 *                + min(microSteps/2, weight) -> clamped.
 *
 * The scorer is deterministic given the same plan + seed (all inputs are
 * explicit — no randomness inside).
 */

import {
  HARD_CAPS,
  DEFAULT_RISK_WEIGHTS,
  riskBand,
  type RiskWeights,
  type EngagementType,
  type CurvePreset,
} from "./types";
import type { MicroStep } from "./curve";

export interface RiskInput {
  maxSliceFraction: number; // largest single slice / total
  hasFlatGap: boolean; // gap > 45min while >5% of target remains
  endDump: boolean; // > hardCaps.endDumpLastPercent delivered in final window
  engagementDeviation: number; // deviation from 2-6% target engagement band
  firstHourAbove: boolean; // delivery in first hour exceeds organic ceiling
  firstHourOverdrive?: number; // how far over ceiling (0..n), scales penalty
  offHoursRatio: number; // fraction of events in dead hours (0..1)
  roundNumberRatio: number; // fraction of round-number quantities
  serviceQuality: number; // 0 = best, 1 = worst
  microStepsCount: number;
}

export interface RiskResult {
  risk: number;
  organicScore: number;
  band: ReturnType<typeof riskBand>;
  penalties: {
    maxSliceFraction: number;
    flatGap: number;
    endDump: number;
    engagementDeviation: number;
    firstHour: number;
    offHours: number;
    roundNumber: number;
    serviceQuality: number;
  };
  pass: boolean; // placement allowed (risk within ceiling)
}


export function scoreRisk(input: RiskInput, weights: RiskWeights = DEFAULT_RISK_WEIGHTS): RiskResult {
  const maxSliceFraction = Math.min(
    weights.maxSliceFractionCap,
    200 * Math.max(0, input.maxSliceFraction),
  );
  const flatGap = input.hasFlatGap ? weights.flatGapPenalty : 0;
  const endDump = input.endDump ? weights.endDumpPenalty : 0;
  const engagementDeviation = Math.min(weights.engagementDeviation, Math.max(0, input.engagementDeviation) * 2);
  const firstHour = input.firstHourAbove
    ? Math.min(weights.firstHourPenalty, weights.firstHourPenalty * (1 + (input.firstHourOverdrive ?? 0) * 0.25))
    : 0;
  const offHours = Math.min(weights.offHoursPenalty, input.offHoursRatio * weights.offHoursPenalty * 3);
  const roundNumber = Math.min(weights.roundNumberPenalty, input.roundNumberRatio * weights.roundNumberPenalty * 3);
  const serviceQuality = Math.min(weights.serviceQualityPenalty, input.serviceQuality * weights.serviceQualityPenalty * 2);

  const risk = Math.round(
    maxSliceFraction + flatGap + endDump + engagementDeviation + firstHour + offHours + roundNumber + serviceQuality,
  );

  const band = riskBand(risk);
  const pass = risk <= HARD_CAPS.placementMinScore;

  return { risk, organicScore: 0, band, pass, penalties: { maxSliceFraction, flatGap, endDump, engagementDeviation, firstHour, offHours, roundNumber, serviceQuality } };
}

/** Compute the organic score from a preset's behavior chances + step count. */
export function organicScore(
  preset: CurvePreset,
  microStepsCount: number,
  weights: RiskWeights = DEFAULT_RISK_WEIGHTS,
): number {
  const p = preset.params;
  const raw =
    weights.organicBase +
    (p.dipChance ?? 0) * weights.dipChanceWeight +
    (p.burstChance ?? 0) * weights.burstChanceWeight +
    (p.pauseChance ?? 0) * weights.pauseChanceWeight +
    Math.min(microStepsCount / 2, weights.microStepsWeight);
  return Math.max(weights.minOrganicScore, Math.min(weights.maxOrganicScore, Math.round(raw)));
}

// ---------- Guardrail validation ----------

export interface GuardrailInput {
  steps: MicroStep[];
  windowMinutes: number;
  totalQuantity: number;
  /** Optional expected first-60-min fraction from the selected curve. */
  expectedFirstHourFraction?: number;
}

export interface GuardrailReport {
  ok: boolean;
  violations: string[];
  maxSliceFraction: number;
  maxGapMinutes: number;
  endDumpFraction: number;
  firstHourFraction: number;
  roundNumberRatio: number;
}

/**
 * Window-relative slow-start ceiling (fraction of total deliverable in the
 * first 60 minutes). Because a front-loaded "viral" preset legitimately
 * concentrates early delivery, the ceiling scales generously down to short
 * windows (a 2h window has most of its delivery in hour one) and tightens
 * toward the spec's ~8% for multi-day windows. Shared by the risk scorer, the
 * planner, and the hard guardrail validator so they never disagree.
 */
export function slowStartCeiling(windowMinutes: number): number {
  const pt: [number, number][] = [
    [120, 0.9],
    [360, 0.65],
    [720, 0.4],
    [1440, 0.22],
    [4320, 0.12],
    [10080, 0.08],
  ];
  if (windowMinutes <= pt[0][0]) return pt[0][1];
  for (let i = 1; i < pt.length; i++) {
    if (windowMinutes <= pt[i][0]) {
      const [x0, y0] = pt[i - 1];
      const [x1, y1] = pt[i];
      const f = (windowMinutes - x0) / (x1 - x0);
      return y0 + f * (y1 - y0);
    }
  }
  return pt[pt.length - 1][1];
}

/**
 * First-hour ceiling for a concrete plan. Generous window-based floor
 * (covers jitter/rounding and front-loaded viral shapes) plus the expected
 * shape-relative term as an additional headroom cap. Returns a fraction.
 */
export function firstHourCeiling(windowMinutes: number, expectedFirstHourFraction?: number): number {
  const windowFloor = slowStartCeiling(windowMinutes);
  const shapeHeadroom = expectedFirstHourFraction != null ? Math.min(0.95, expectedFirstHourFraction * 4) : 0;
  return Math.max(windowFloor, shapeHeadroom);
}

/**
 * Validate a micro-step plan against the server-side guardrails. Returns a
 * report; `ok` is false if any hard guardrail is violated.
 */
export function validateGuardrails(input: GuardrailInput): GuardrailReport {
  const violations: string[] = [];
  const { steps, windowMinutes, totalQuantity } = input;
  const qty = Math.max(1, totalQuantity);

  // 1. max event fraction (no slice above 20% of total)
  const maxSliceFraction = steps.reduce((m, s) => Math.max(m, s.quantity), 0) / qty;
  if (maxSliceFraction > 0.2) {
    violations.push(`Max single slice fraction ${(maxSliceFraction * 100).toFixed(1)}% too high (>20%)`);
  }

  // 2. gap check — window-relative allowed gap (min 45m, ~2% of window)
  const gapAllowed = Math.max(HARD_CAPS.maxGapMinutes, Math.round(windowMinutes * 0.02));
  let maxGap = 0;
  let maxGapRemaining = 0;
  const sorted = [...steps].sort((a, b) => a.minute - b.minute);
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].minute - sorted[i - 1].minute;
    if (gap > maxGap) {
      maxGap = gap;
      const deliveredBefore = sorted.slice(0, i).reduce((s, st) => s + st.quantity, 0);
      maxGapRemaining = qty - deliveredBefore;
    }
  }
  if (maxGap > gapAllowed && maxGapRemaining / qty > 0.05) {
    violations.push(`Gap ${Math.round(maxGap)}min exceeds allowed ${gapAllowed}min`);
  }

  // 3. end dump
  const endWindowStart = windowMinutes * (1 - HARD_CAPS.endDumpWindowPercent / 100);
  const endDelivery = sorted.reduce((s, st) => (st.minute >= endWindowStart ? s + st.quantity : s), 0);
  const endDumpFraction = endDelivery / qty;
  if (endDumpFraction > HARD_CAPS.endDumpLastPercent / 100) {
    violations.push(`End dump ${(endDumpFraction * 100).toFixed(1)}% exceeds 10%`);
  }

  // 4. slow start (expected-curve-relative, instant-dump capped)
  const ceiling = firstHourCeiling(windowMinutes, input.expectedFirstHourFraction);
  const firstHourDelivery = sorted.reduce((s, st) => (st.minute < HARD_CAPS.slowStartMinutes ? s + st.quantity : s), 0);
  const firstHourFraction = firstHourDelivery / qty;
  if (firstHourFraction > ceiling) {
    violations.push(`First hour ${(firstHourFraction * 100).toFixed(1)}% exceeds ${(ceiling * 100).toFixed(0)}%`);
  }

  // 5. round numbers
  const roundNumberRatio = steps.filter((s) => s.quantity % 10 === 0).length / Math.max(1, steps.length);
  if (roundNumberRatio > 0.5) {
    violations.push(`Too many round-number quantities (${(roundNumberRatio * 100).toFixed(0)}%)`);
  }

  // 6. count caps
  if (steps.length > HARD_CAPS.maxMicroStepsPerRun) {
    violations.push(`Micro-steps ${steps.length} exceed cap ${HARD_CAPS.maxMicroStepsPerRun}`);
  }

  return {
    ok: violations.length === 0,
    violations,
    maxSliceFraction,
    maxGapMinutes: maxGap,
    endDumpFraction,
    firstHourFraction,
    roundNumberRatio,
  };
}
