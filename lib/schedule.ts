// Deterministic seeded drip-feed scheduler.
// Rules (guaranteed):
//  - run quantities sum EXACTLY to total
//  - every run is >= the per-run minimum (when total >= min)
//  - cumulative delivery is non-decreasing
//  - same seed -> same plan (deterministic), no overlapping runs
//  - natural variation (0..30%) only adds seeded jitter to shape, never to total
// The engine is pure math: it never scores "organicness", detection risk, or bot likelihood.

export type CurveType = "steady" | "slow_start" | "bell_peak" | "natural_wave";

export interface ScheduleChunk {
  minutes: number; // offset from start (0 = now)
  quantity: number;
}

export interface ScheduleOptions {
  /** Seed string (e.g. order id) or number. Same seed => same plan. Default 1. */
  seed?: string | number;
  /** Natural variation 0..30 (percent). Jitters the curve shape only. Default 10. */
  variation?: number;
  /** Hard cap on number of runs. Default auto from total/min. */
  maxRuns?: number;
  /** Per-run minimum override (falls back to serviceMin). */
  minRun?: number;
  /** Shift all runs by this many minutes (start delay). Default 0. */
  startDelayMinutes?: number;
}

// --- seeded PRNG (mulberry32) ---------------------------------------------
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function toSeed(seed: string | number): number {
  return typeof seed === "string" ? hashString(seed) : (Number(seed) || 1) >>> 0;
}

// --- curve shape (0..1 progress -> weight) --------------------------------
function curveWeight(curve: CurveType, p: number): number {
  switch (curve) {
    case "slow_start":
      return Math.max(0.05, p); // ramp up
    case "bell_peak": {
      const d = p - 0.5;
      return Math.exp((-d * d) / (2 * 0.22 * 0.22));
    }
    case "natural_wave":
      return Math.max(0.15, 1 + 0.55 * Math.sin(p * Math.PI * 4));
    case "steady":
    default:
      return 1;
  }
}

export function buildSchedule(
  total: number,
  durationMinutes: number,
  curve: CurveType,
  serviceMin: number,
  opts: ScheduleOptions = {}
): ScheduleChunk[] {
  const safeTotal = Math.max(1, Math.floor(Number(total) || 0));
  if (safeTotal <= 0) return [];
  const safeDuration = Math.max(1, Math.floor(Number(durationMinutes) || 1));
  const min = Math.max(1, Math.floor(Number(opts.minRun) || Number(serviceMin) || 1));
  const delay = Math.max(0, Math.floor(Number(opts.startDelayMinutes) || 0));

  // If total is below the per-run minimum we cannot satisfy the minimum rule;
  // emit a single run of the whole total (best-effort).
  if (safeTotal < min) return [{ minutes: delay, quantity: safeTotal }];

  const rand = mulberry32(toSeed(opts.seed ?? 1));
  const variation = Math.min(30, Math.max(0, Number(opts.variation) || 10)) / 100;

  // Number of runs: at least 1, at most floor(total/min), capped by maxRuns
  // AND by the window length (so every run gets a distinct minute -> no overlap).
  const maxFeasible = Math.floor(safeTotal / min);
  const autoMax = Math.min(48, Math.max(1, Math.round(Math.sqrt(safeTotal / min))));
  const nRaw = Math.max(1, Math.min(maxFeasible, opts.maxRuns ? Math.max(1, Math.floor(opts.maxRuns)) : autoMax));
  const n = Math.min(nRaw, safeDuration);

  // Seeded weights for each run slot.
  const weights: number[] = [];
  let sumW = 0;
  for (let i = 0; i < n; i++) {
    const p = n === 1 ? 0.5 : i / (n - 1);
    const jitter = (rand() - 0.5) * 2 * variation; // [-variation, +variation]
    const w = Math.max(0.05, curveWeight(curve, p) * (1 + jitter));
    weights.push(w);
    sumW += w;
  }
  if (sumW <= 0) sumW = 1;

  // Quantities: start with min each, then distribute the remainder by weight
  // so the sum is EXACTLY total and every run >= min.
  const q: number[] = new Array(n).fill(min);
  const remaining = safeTotal - min * n;
  const pool = remaining;
  const shares = weights.map((w) => Math.floor((w / sumW) * pool));
  const distributed = shares.reduce((s, x) => s + x, 0);
  // leftover (rounding) — deterministic: add to largest-weight runs in order
  const leftover = pool - distributed;
  const order = weights.map((w, i) => i).sort((a, b) => weights[b] - weights[a] || a - b);
  for (let k = 0; k < leftover; k++) q[order[k % n]] += 1;
  for (let i = 0; i < n; i++) q[i] += shares[i];

  // Non-overlapping times: one run per slot, evenly spaced across the window.
  const runs: ScheduleChunk[] = [];
  for (let i = 0; i < n; i++) {
    const minutes = delay + Math.round((i / n) * safeDuration);
    runs.push({ minutes, quantity: q[i] });
  }
  const sorted = runs.sort((a, b) => a.minutes - b.minutes || b.quantity - a.quantity);
  return sorted.filter((c) => c.quantity > 0);
}

// --- lagging components (likes/comments follow views in the same window) ---
export function lagRuns(runs: ScheduleChunk[], lagMinutes = 5): ScheduleChunk[] {
  return runs.map((r) => ({ minutes: r.minutes + Math.max(0, lagMinutes), quantity: r.quantity }));
}
