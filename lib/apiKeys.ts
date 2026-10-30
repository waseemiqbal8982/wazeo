import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Wazeo — Customer API Key core (server-only).
 *
 * A customer API key is used to authenticate machine-to-machine calls to a
 * public API (the consumer of these keys is a future /api/v2 surface).
 * Security model:
 *   - The full key is generated once and returned to the caller exactly one
 *     time — after that it is IRRETRIEVABLE.
 *   - Only the SHA-256 hash and a masked `prefix` are persisted.
 *   - Status is derived from actual state (banned/revoked/suspended/expired/
 *     limit-reached/used/active), never from a stored label alone.
 */

export const API_KEY_RE = /^WAK-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

const SEG = () =>
  randomBytes(3)
    .toString("base64")
    .replace(/[^A-Z0-9]/g, "")
    .padEnd(4, "X")
    .slice(0, 4);

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const segs = [SEG(), SEG(), SEG(), SEG()];
  const key = `WAK-${segs.join("-")}`;
  return { key, prefix: maskFromKey(key), hash: hashApiKey(key) };
}

export function hashApiKey(k: string): string {
  return createHash("sha256").update(String(k)).digest("hex");
}

/** Masked display value, e.g. WAK-????-????-????-AB12 */
export function maskFromKey(k: string): string {
  const last4 = String(k).slice(-4);
  return `WAK-????-????-????-${last4}`;
}

export function safeEqual(a: string, b: string): boolean {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  if (A.length !== B.length) return false;
  return timingSafeEqual(A, B);
}

export interface ApiKeyRow {
  id: string;
  user_id: string;
  name: string;
  label?: string | null;
  prefix: string;
  key_hash: string;
  created_at: string;
  last_used_at?: string | null;
  expires_at?: string | null;
  uses?: number;
  usage_cap?: number | null;
  rate_limit?: number | null;
  permissions?: unknown;
  features?: unknown;
  status?: string;
  revoked_at?: string | null;
  revoked_reason?: string | null;
  suspended_at?: string | null;
  banned_at?: string | null;
}

export type KeyStatus =
  | "Banned"
  | "Revoked"
  | "Suspended"
  | "Expired"
  | "Limit reached"
  | "Active"
  | "Unused";

/** Derive the authoritative status from actual key state. */
export function deriveStatus(row: ApiKeyRow): KeyStatus {
  if (row.banned_at) return "Banned";
  if (row.revoked_at) return "Revoked";
  if (row.suspended_at) return "Suspended";
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return "Expired";
  const cap = Number(row.usage_cap);
  const uses = Number(row.uses || 0);
  if (Number.isFinite(cap) && cap > 0 && uses >= cap) return "Limit reached";
  if (!row.last_used_at && uses <= 0) return "Unused";
  return "Active";
}

export const STATUS_TONE: Record<KeyStatus, string> = {
  Active: "bg-emerald-500/15 text-emerald-300",
  Unused: "bg-sky-500/15 text-sky-300",
  Expired: "bg-amber-500/15 text-amber-300",
  Revoked: "bg-red-500/15 text-red-300",
  Suspended: "bg-orange-500/15 text-orange-300",
  Banned: "bg-red-600/20 text-red-400",
  "Limit reached": "bg-purple-500/15 text-purple-300",
};

/**
 * Validate a raw key against a stored row, enforcing status + expiry + quota.
 * Returns { ok: true, row } when the key is usable, otherwise a typed error.
 */
export function validateKeyAgainstRow(
  key: string,
  row: ApiKeyRow | null | undefined
): { ok: true; row: ApiKeyRow } | { ok: false; error: string } {
  if (!row) return { ok: false, error: "Invalid key." };
  if (!safeEqual(hashApiKey(key), row.key_hash)) return { ok: false, error: "Invalid key." };
  if (row.banned_at) return { ok: false, error: "Key is banned." };
  if (row.revoked_at) return { ok: false, error: "Key is revoked." };
  if (row.suspended_at) return { ok: false, error: "Key is suspended." };
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now())
    return { ok: false, error: "Key is expired." };
  const cap = Number(row.usage_cap);
  const uses = Number(row.uses || 0);
  if (Number.isFinite(cap) && cap > 0 && uses >= cap)
    return { ok: false, error: "Key usage limit reached." };
  return { ok: true, row };
}

/** Validate shape for the WAK-XXXX-XXXX-XXXX-XXXX format. */
export function isWellFormedKey(key: string): boolean {
  return API_KEY_RE.test(String(key).trim());
}
