// Shared access-key logic (server only). One normalization + validation path
// for every server code path (redeem, validate, admin display, copy/send).
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { WZ_RE, normalizeAccessKey } from "./accessKeyFormat";

export { WZ_RE, normalizeAccessKey };

/** Generate a fresh key exactly like the admin route (WZ-XXXX-XXXX-XXXX). */
const SEG = () =>
  randomBytes(3)
    .toString("hex")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .padEnd(4, "X")
    .slice(0, 4);

export function generateAccessKey(): string {
  return `WZ-${SEG()}-${SEG()}-${SEG()}`;
}

export function hashAccessKey(key: string): string {
  return createHash("sha256").update(String(key)).digest("hex");
}

export function last4(key: string): string {
  return String(key).slice(-4);
}

export function safeEqual(a: string, b: string): boolean {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  if (A.length !== B.length) return false;
  return timingSafeEqual(A, B);
}

export type KeyRejectReason =
  | "missing"
  | "mismatch"
  | "revoked"
  | "inactive"
  | "suspended"
  | "used"
  | "expired"
  | "redemption-expired"
  | "bad-email"
  | "rate-limited";

/** Validate a raw typed key against a stored access_codes row. */
export function validateAccessKey(
  raw: string,
  row: {
    hash?: string | null;
    revoked?: boolean;
    active?: boolean;
    suspended?: boolean;
    used_at?: string | null;
    uses?: number;
    expires_at?: string | null;
    redemption_expires_at?: string | null;
  } | null
): { ok: true } | { ok: false; reason: KeyRejectReason } {
  if (!row) return { ok: false, reason: "missing" };
  const key = normalizeAccessKey(raw);
  if (!WZ_RE.test(key)) return { ok: false, reason: "bad-email" }; // malformed key
  const h = hashAccessKey(key);
  if (!safeEqual(h, row.hash || "")) return { ok: false, reason: "mismatch" };
  if (row.revoked) return { ok: false, reason: "revoked" };
  if (!row.active) return { ok: false, reason: "inactive" };
  if (row.suspended) return { ok: false, reason: "suspended" };
  if (row.used_at || (row.uses ?? 0) > 0) return { ok: false, reason: "used" };
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now())
    return { ok: false, reason: "expired" };
  if (
    row.redemption_expires_at &&
    new Date(row.redemption_expires_at).getTime() < Date.now()
  )
    return { ok: false, reason: "redemption-expired" };
  return { ok: true };
}
