/**
 * Deterministic seeded PRNG for the organic engagement engine.
 *
 * Uses a mulberry32 PRNG so that the same (seed, plan) always yields the same
 * curve and risk score — required by the acceptance test "Risk estimator is
 * deterministic". For seeding from strings (e.g. a preset id + params) we sh
 * a simple string -> uint32 hash.
 */

export type Rng = () => number; // returns float in [0, 1)

/** Hash a string to a uint32 seed (xmur3-style). */
export function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/** mulberry32 PRNG. Returns a function yielding floats in [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build an Rng from a string seed. */
export function rngFromString(seed: string): Rng {
  return mulberry32(hashSeed(seed));
}

/** Random int in [min, max] inclusive. */
export function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Random float in [min, max). */
export function randFloat(rng: Rng, min: number, max: number): number {
  return rng() * (max - min) + min;
}

/** Random normally-distributed-ish value via Box-Muller (approx). */
export function randNormal(rng: Rng, mean = 0, std = 1): number {
  const u = Math.max(rng(), 1e-9);
  const v = Math.max(rng(), 1e-9);
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * std;
}

/** Pick an index by weighted probabilities (weights need not sum to 1). */
export function weightedPick<T>(rng: Rng, items: T[], weightFn: (item: T) => number): T {
  const total = items.reduce((s, it) => s + Math.max(0, weightFn(it)), 0);
  if (total <= 0) return items[randInt(rng, 0, items.length - 1)];
  let roll = rng() * total;
  for (const it of items) {
    roll -= Math.max(0, weightFn(it));
    if (roll <= 0) return it;
  }
  return items[items.length - 1];
}
