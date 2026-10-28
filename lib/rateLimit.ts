// Simple in-memory rate limiter (per server instance).
const buckets = new Map<string, number[]>();

function prune(key: string, windowMs: number, now: number): number[] {
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  buckets.set(key, arr);
  return arr;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfter?: number;
}

/** Check whether a rate limit is hit WITHOUT recording a new hit. */
export function rateLimitCheck(
  key: string,
  limit = 5,
  windowMs = 60000
): RateLimitResult {
  const now = Date.now();
  const arr = prune(key, windowMs, now);
  if (arr.length >= limit) {
    const oldest = arr[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { ok: false, retryAfter };
  }
  return { ok: true };
}

/** Record a hit; returns ok=false only when the limit was already exceeded. */
export function rateLimitHit(
  key: string,
  limit = 5,
  windowMs = 60000
): RateLimitResult {
  const now = Date.now();
  const arr = prune(key, windowMs, now);
  if (arr.length >= limit) {
    const oldest = arr[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { ok: false, retryAfter };
  }
  arr.push(now);
  buckets.set(key, arr);
  return { ok: true };
}

/** Backwards-compatible combined check+record. */
export function rateLimit(
  key: string,
  limit = 5,
  windowMs = 60000
): RateLimitResult {
  return rateLimitHit(key, limit, windowMs);
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}
