// Pure math: build a drip-feed schedule.
// Rules:
//  - chunks always sum exactly to total
//  - no chunk below serviceMin (merged)
//  - returns run_at as minutes offset from start + quantity

export type CurveType = "steady" | "slow_start" | "bell_peak" | "natural_wave";

export interface ScheduleChunk {
  minutes: number; // offset from start (0 = now)
  quantity: number;
}

function bell(x: number, center: number, width: number): number {
  const d = (x - center) / width;
  return Math.exp(-d * d * 2.5);
}

export function buildSchedule(
  total: number,
  durationMinutes: number,
  curve: CurveType,
  serviceMin: number
): ScheduleChunk[] {
  const safeTotal = Math.max(1, Math.floor(Number(total) || 0));
  if (safeTotal <= 0) return [];
  const safeDuration = Math.max(1, Number(durationMinutes) || 1);
  const min = Math.max(1, Math.floor(Number(serviceMin) || 1));

  // Step size: aim for ~ many small chunks but not too many
  const step = Math.max(1, Math.round(Math.sqrt(safeTotal / 4)));

  // Build a density profile over time
  const points: { minutes: number; weight: number }[] = [];
  let totalWeight = 0;
  for (let m = 0; m <= safeDuration; m += step) {
    let w = 1;
    if (curve === "slow_start") {
      w = m / safeDuration;
    } else if (curve === "bell_peak") {
      w = bell(m, safeDuration / 2, safeDuration / 4);
    } else if (curve === "natural_wave") {
      w = 1 + Math.sin((m / safeDuration) * Math.PI * 3) * 0.3;
    }
    w = Math.max(0.05, w);
    points.push({ minutes: m, weight: w });
    totalWeight += w;
  }
  if (totalWeight <= 0) totalWeight = 1;

  // Distribute quantity proportionally
  let remaining = safeTotal;
  const raw: ScheduleChunk[] = [];
  for (let i = 0; i < points.length; i++) {
    const isLast = i === points.length - 1;
    let q: number;
    if (isLast) {
      q = remaining;
    } else {
      q = Math.floor((points[i].weight / totalWeight) * safeTotal);
    }
    if (q > 0) raw.push({ minutes: points[i].minutes, quantity: q });
    remaining -= q;
  }
  // safety: if any leftover due to rounding, add to last
  if (remaining > 0 && raw.length) raw[raw.length - 1].quantity += remaining;

  // Merge chunks below the service minimum
  const merged: ScheduleChunk[] = [];
  let carry = 0;
  for (const c of raw) {
    carry += c.quantity;
    if (carry >= min || c.minutes === raw[raw.length - 1].minutes) {
      merged.push({ minutes: c.minutes, quantity: carry });
      carry = 0;
    }
  }
  if (carry > 0) {
    if (merged.length) merged[merged.length - 1].quantity += carry;
    else merged.push({ minutes: 0, quantity: carry });
  }

  // Normalise to exact total & sort
  const final = merged.map((c) => ({ ...c })).sort((a, b) => a.minutes - b.minutes);
  const sum = final.reduce((s, c) => s + c.quantity, 0);
  if (sum !== safeTotal && final.length) {
    final[final.length - 1].quantity += safeTotal - sum;
  }
  return final.filter((c) => c.quantity > 0);
}
