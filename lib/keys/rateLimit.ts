// Key-rate limiting. Limits by hashed IP + normalized key prefix and by email,
// with generous thresholds so shared mobile IPs are never blocked. Constant-time
// bucket key comparisons via HMAC hash of the joined identity (not raw values).

import { createHmac, createHash } from "node:crypto";

const buckets = new Map<string, number[]>();

function bucketKey(secret: string, parts: (string | undefined)[]): string {
  const joined = parts.map((p) => p ?? "").join("|");
  return createHmac("sha256", secret).update(joined).digest("hex").slice(0, 32);
}

function prune(key: string, windowMs: number, now: number): number[] {
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  buckets.set(key, arr);
  return arr;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfter?: number;
}

/**
 * Check+record a hit against a key bucket.
 * identity: list of stable strings (e.g. ipHash, keyPrefix, email).
 */
export function rateLimitKey(
  identity: (string | undefined)[],
  limit = 30,
  windowMs = 600000
): RateLimitResult {
  const secret = createHash("sha256").update(String(process.env.KEY_RATE_LIMIT_SECRET || "wazeo-key-rl")).digest("hex");
  const k = bucketKey(secret, identity);
  const now = Date.now();
  const arr = prune(k, windowMs, now);
  if (arr.length >= limit) {
    const oldest = arr[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { ok: false, retryAfter };
  }
  arr.push(now);
  buckets.set(k, arr);
  return { ok: true };
}

/** IP hash helper (24 hex chars). */
export function hashIp(ip: string): string {
  return createHash("sha256").update(String(ip || "unknown")).digest("hex").slice(0, 24);
}
