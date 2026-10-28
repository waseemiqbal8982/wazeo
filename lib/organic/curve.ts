/**
 * Core curve engine.
 *
 * Density = weighted sum of skewed gaussian bumps over normalized time t in [0,1]
 * over a window of W minutes. The cumulative distribution (normalized integral)
 * maps t -> fraction of total delivered. A diurnal mask (hour-of-day weights)
 * is applied and the curve renormalized.
 *
 * From the cumulative we generate discrete delivery events (slices) that obey
 * the variance / spike caps. All randomness is driven by an injectable Rng so
 * results are deterministic for a given (seed, params).
 */

import type { Rng } from "./random";
import {
  SESSION_TYPES,
  ENGAGEMENT_TIMING,
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

// ---------- Skewed gaussian bump ----------
export function bumpValue(
  t: number,
  mu: number,
  sigma: number,
  gamma: number,
): number {
  if (sigma <= 0) return t === mu ? 1 : 0;
  const d = t - mu;
  const s = d <= 0 ? sigma : Math.max(1e-6, sigma * gamma);
  return Math.exp(-(d * d) / (2 * s * s));
}

// ---------- Density over t in [0,1] ----------
export function densityAt(t: number, preset: CurvePreset): number {
  let d = 0;
  for (const b of preset.params.bumps) {
    d += b.w * bumpValue(t, b.mu, b.sigma, b.gamma);
  }
  return Math.max(0, d);
}

/** Numerically integrate density over [0,1] using trapezoid sum. */
export function integrateDensity(preset: CurvePreset, steps = 2000): number {
  let sum = 0;
  const h = 1 / steps;
  let prev = densityAt(0, preset);
  for (let i = 1; i <= steps; i++) {
    const t = i * h;
    const cur = densityAt(t, preset);
    sum += ((prev + cur) / 2) * h;
    prev = cur;
  }
  return sum;
}

/**
 * Expected share of total delivery that lands in the first 60 minutes, computed
 * from the same density function used to generate micro-steps. Used as the
 * shape-relative slow-start ceiling.
 */
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

/**
 * Build sample points of the cumulative distribution (with diurnal masking).
 * Returns up to maxPoints points.
 */
export function buildCumulativeCurve(
  preset: CurvePreset,
  windowMinutes: number,
  opts?: {
    maxPoints?: number;
    startHour?: number; // local hour (0-23) at order start
    weekday?: boolean; // apply weekday multipliers
    hourMultipliers?: number[];
    weekdayMultipliers?: number[];
  },
): CurvePoint[] {
  const maxPoints = Math.min(opts?.maxPoints ?? 300, HARD_CAPS.maxChartPoints);
  const hourMult = opts?.hourMultipliers ?? DEFAULT_HOUR_MULTIPLIERS;
  const wdMult = opts?.weekdayMultipliers ?? DEFAULT_WEEKDAY_MULTIPLIERS;
  const startHour = (((opts?.startHour ?? 12) % 24) + 24) % 24;

  // sample density at a fixed step, apply diurnal mask
  const N = 1000;
  const h = 1 / N;
  let totalWeight = 0;
  const w: number[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i * h;
    const minutes = t * windowMinutes;
    const hour = (startHour + Math.floor(minutes / 60)) % 24;
    let mult = hourMult[hour] ?? 1;
    if (opts?.weekday) mult *= wdMult[hour] ?? 1;
    const d = densityAt(t, preset) * mult;
    w.push(d);
    totalWeight += d;
  }
  if (totalWeight <= 0) {
    for (let i = 0; i <= N; i++) w[i] = 1;
    totalWeight = N + 1;
  }

  // cumulative
  const out: CurvePoint[] = [];
  let running = 0;
  const step = Math.max(1, Math.floor((N + 1) / maxPoints));
  for (let i = 0; i <= N; i += step) {
    running += w[i];
    out.push({
      t: i * h,
      x: i * h * windowMinutes,
      density: w[i] / totalWeight,
      cumulative: running / totalWeight,
    });
  }
  // ensure endpoint
  const last = out[out.length - 1];
  if (last.t < 0.9999) {
    out.push({ t: 1, x: windowMinutes, density: 0, cumulative: 1 });
  }
  return out;
}


// ---------- Micro-step slicing ----------
export interface MicroStep {
  minute: number; // minutes offset from start (float ok)
  quantity: number;
  engagementType: EngagementType;
}

/**
 * Generate a curve-shaped plan of micro-steps for one engagement type over the
 * window. Slices are placed deterministically along the preset's cumulative
 * curve: slice *i* is delivered at the time where the CDF crosses the evenly
 * spaced point (i+0.5)/N, with quantity proportional to the CDF segment delta.
 *
 * This guarantees the delivered curve visually matches the preset shape with no
 * end-dump and no erratic large slices. Small jitter and the per-type variance
 * caps are applied, but the session model is used only to modulate slice size
 * within the caps (not to change placement).
 */
export function generateMicroSteps(opts: {
  preset: CurvePreset;
  engagementType: EngagementType;
  totalQuantity: number;
  windowMinutes: number;
  rng: Rng;
  maxSteps?: number;
  curve?: CurvePoint[];
}): MicroStep[] {
  const {
    preset,
    engagementType,
    totalQuantity,
    windowMinutes,
    rng,
    maxSteps = HARD_CAPS.maxMicroStepsPerRun,
  } = opts;

  const variance = ENGAGEMENT_VARIANCE[engagementType];
  const qty = Math.max(0, Math.floor(totalQuantity));
  if (qty <= 0) return [];

  const cap = Math.max(1, Math.floor(qty * 0.2));
  const N = Math.min(maxSteps, Math.max(1, qty));

  // Time-uniform step positions (guarantees timeline coverage, no big gaps, no
  // end-dump). Per-step quantity is weighted by the curve density so the
  // delivered profile still matches the selected preset shape.
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

  // Redistribute rounding remainder, never pushing a slice above 20% of total.
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


