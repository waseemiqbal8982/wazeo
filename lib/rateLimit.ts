// Simple in-memory rate limiter (per server instance).
const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit = 5,
  windowMs = 60000
): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    const oldest = arr[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { ok: false, retryAfter };
  }
  arr.push(now);
  buckets.set(key, arr);
  return { ok: true };
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}
