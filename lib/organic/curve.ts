/**
 * Core curve engine for plain delivery scheduling.
 *
 * Density = weighted sum of skewed gaussian bumps over normalized time t in [0,1]
 * over a window of W minutes. The cumulative distribution maps t -> fraction of
 * total delivered. From the cumulative we generate discrete delivery slices that
 * obey per-type variance/spike caps. All randomness uses an injectable Rng so
 * results are deterministic for a given (seed, params).
 */

import type { Rng } from "./random";
import {
  ENGAGEMENT_VARIANCE,
  HARD_CAPS,
  DEFAULT_HOUR_MULTIPLIERS,
  DEFAULT_WEEKDAY_MULTIPLIERS,
  type EngagementType,
  type CurvePreset,
} from "./types";

export interface CurvePoint {
  t: number; // 0..1
  x: number; // minutes offset
  density: number;
  cumulative: number; // fraction of total
}

export function bumpValue(
  t: number,
  mu: number,
  sigma: number,
  gamma: number
): number {
  if (sigma <= 0) return t === mu ? 1 : 0;
  const d = t - mu;
  const s = d <= 0 ? sigma : Math.max(1e-6, sigma * gamma);
  return Math.exp(-(d * d) / (2 * s * s));
}

export function densityAt(t: number, preset: CurvePreset): number {
  let d = 0;
  for (const b of preset.params.bumps) {
    d += b.w * bumpValue(t, b.mu, b.sigma, b.gamma);
  }
  return Math.max(0, d);
}

export function expectedFirstHourFraction(preset: CurvePreset, windowMinutes: number): number {
  const tEnd = Math.min(1, 60 / Math.max(1, windowMinutes));
  const N = 400;
  let up = 0;
  let tot = 0;
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N;
    const d = densityAt(t, preset);
    tot += d;
    if (t <= tEnd) up += d;
  }
  return tot > 0 ? up / tot : 0;
}

export function buildCumulativeCurve(
  preset: CurvePreset,
  windowMinutes: number,
  opts?: {
    maxPoints?: number;
    startHour?: number;
    weekday?: boolean;
    hourMultipliers?: number[];
    weekdayMultipliers?: number[];
  }
): CurvePoint[] {
  const maxPoints = Math.min(opts?.maxPoints ?? 300, HARD_CAPS.maxChartPoints);
  const hourMult = opts?.hourMultipliers ?? DEFAULT_HOUR_MULTIPLIERS;
  const wdMult = opts?.weekdayMultipliers ?? DEFAULT_WEEKDAY_MULTIPLIERS;
  const startHour = (((opts?.startHour ?? 12) % 24) + 24) % 24;

  const N = 1000;
  const h = 1 / N;
  let totalWeight = 0;
  const weights: number[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i * h;
    const hour = (startHour + Math.floor(t * windowMinutes / 60)) % 24;
    const m = hourMult[hour] ?? 1;
    const w = wdMult[hour] ?? 1;
    const dens = densityAt(t, preset) * m * w;
    weights.push(dens);
    totalWeight += dens;
  }

  const step = Math.max(1, Math.floor(N / maxPoints));
  const out: CurvePoint[] = [];
  let cum = 0;
  for (let i = 0; i <= N; i += step) {
    const t = i * h;
    cum += weights[i] / Math.max(1e-9, totalWeight);
    out.push({ t, x: Math.round(t * windowMinutes), density: weights[i], cumulative: Math.min(1, cum) });
  }
  const last = out[out.length - 1];
  if (last.t < 0.9999) {
    out.push({ t: 1, x: windowMinutes, density: 0, cumulative: 1 });
  }
  return out;
}

export interface MicroStep {
  minute: number;
  quantity: number;
  engagementType: EngagementType;
}

export function generateMicroSteps(opts: {
  preset: CurvePreset;
  engagementType: EngagementType;
  totalQuantity: number;
  windowMinutes: number;
  rng: Rng;
  maxSteps?: number;
  curve?: CurvePoint[];
}): MicroStep[] {
  const { preset, engagementType, totalQuantity, windowMinutes, rng } = opts;
  const maxSteps = opts.maxSteps ?? HARD_CAPS.maxMicroStepsPerRun;
  const variance = ENGAGEMENT_VARIANCE[engagementType];
  const qty = Math.max(0, Math.floor(totalQuantity));
  if (qty <= 0) return [];

  const cap = Math.max(1, Math.floor(qty * 0.2));
  const N = Math.min(maxSteps, Math.max(1, qty));

  const dens: number[] = [];
  let denSum = 0;
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N;
    const d = densityAt(t, preset);
    dens.push(d);
    denSum += d;
  }
  if (denSum <= 0) {
    for (let i = 0; i < N; i++) dens[i] = 1;
    denSum = N;
  }

  const raw: number[] = [];
  for (let i = 0; i < N; i++) {
    const frac = dens[i] / denSum;
    let q = frac * qty;
    q *= 1 + (rng() - 0.5) * variance.variance;
    q = Math.max(1, Math.round(q));
    q = Math.min(q, variance.spikeMax);
    q = Math.min(q, variance.hardCap);
    q = Math.min(q, cap);
    raw.push(q);
  }

  const total = raw.reduce((s, x) => s + x, 0);
  const scale = total > 0 ? qty / total : 1;

  const steps: MicroStep[] = [];
  let delivered = 0;
  for (let i = 0; i < N; i++) {
    let q = Math.max(1, Math.round(raw[i] * scale));
    q = Math.min(q, qty - delivered);
    if (q <= 0) continue;
    const t = (i + 0.5) / N;
    steps.push({
      minute: Math.min(windowMinutes, Math.round(t * windowMinutes)),
      quantity: q,
      engagementType,
    });
    delivered += q;
    if (delivered >= qty) break;
  }

  if (delivered < qty) {
    let remainder = qty - delivered;
    for (const st of steps) {
      if (remainder <= 0) break;
      const room = cap - st.quantity;
      if (room > 0) {
        const add = Math.min(remainder, room);
        st.quantity += add;
        remainder -= add;
      }
    }
  }

  return steps;
}
