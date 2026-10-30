// Core key domain logic: status derivation (from dates, never stored),
// validation against a row, and the device-count check. This module is pure
// (no I/O) so it is unit-testable and shared by every route.

import { timingSafeEqual } from "node:crypto";
import { normalizeKey } from "./normalize";

/** Public key statuses (derived, never stored). */
export type KeyStatus = "unused" | "active" | "revoked" | "expired";

/** "Expiring soon" threshold in days (for admin filters). */
export const EXPIRING_SOON_DAYS = 7;

export interface KeyRowLike {
  status?: string; // stored: 'unused' | 'active' | 'revoked'
  access_days?: number | null;
  access_expires_at?: string | null;
  redeem_until?: string | null;
  bound_email?: string | null;
  activated_at?: string | null;
  max_devices?: number;
}

export interface KeyVerdict {
  ok: boolean;
  status: KeyStatus;
  reason?:
    | "not-found"
    | "malformed"
    | "revoked"
    | "expired"
    | "redeem-window-expired"
    | "wrong-email"
    | "not-activated";
}

/** Derive the effective status from stored state + dates. */
export function deriveStatus(row: KeyRowLike): KeyStatus {
  if (row.status === "revoked") return "revoked";
  if (row.status === "active") {
    if (row.access_expires_at && new Date(row.access_expires_at).getTime() < Date.now()) {
      return "expired";
    }
    return "active";
  }
  // unused
  if (row.redeem_until && new Date(row.redeem_until).getTime() < Date.now()) {
    return "expired"; // redemption window passed => expired for practical purposes
  }
  return "unused";
}

/**
 * Validate input against a key row. `input` is the raw typed value; it is
 * normalized here. Returns a verdict. All failure reasons are safe to log to
 * the admin error log / event timeline, but the customer always sees one
 * generic message.
 */
export function validateKeyInput(input: unknown): { ok: true; body: string } | { ok: false; reason: "malformed" } {
  const body = normalizeKey(input);
  if (!body) return { ok: false, reason: "malformed" };
  return { ok: true, body };
}

/** Constant-time string compare (for email/hash comparisons). */
export function ctEqual(a: string, b: string): boolean {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  if (A.length !== B.length) return false;
  return timingSafeEqual(A, B);
}

/**
 * Validate a normalized body against a DB row. Returns the status + reason.
 * Bound-email check is separate (pass expectedEmail when present).
 */
export function validateRow(body: string, row: KeyRowLike | null, email?: string): KeyVerdict {
  if (!row) return { ok: false, status: "unused", reason: "not-found" };

  const status = deriveStatus(row);
  if (status === "revoked") return { ok: false, status, reason: "revoked" };
  if (status === "expired") return { ok: false, status, reason: "expired" };
  if (status === "unused") {
    if (row.redeem_until && new Date(row.redeem_until).getTime() < Date.now()) {
      return { ok: false, status, reason: "redeem-window-expired" };
    }
    if (email != null && row.bound_email) {
      if (!ctEqual(email.toLowerCase(), String(row.bound_email).toLowerCase())) {
        return { ok: false, status: "unused", reason: "wrong-email" };
      }
    }
    return { ok: true, status };
  }

  // active
  if (email != null && row.bound_email) {
    if (!ctEqual(email.toLowerCase(), String(row.bound_email).toLowerCase())) {
      return { ok: false, status, reason: "wrong-email" };
    }
  }
  if (!row.activated_at) return { ok: false, status, reason: "not-activated" };
  return { ok: true, status };
}

/** True when the key is within its device cap (max_devices, default 2). */
export function deviceCapOk(deviceCount: number, maxDevices?: number): boolean {
  const cap = typeof maxDevices === "number" && maxDevices > 0 ? maxDevices : 2;
  return (deviceCount ?? 0) < cap;
}

/** Compute access_expires_at for a (re)activation: later of now and current end. */
export function computeAccessExpiresAt(
  accessDays: number | null | undefined,
  currentEnd?: string | null
): string | null {
  if (accessDays == null) return null; // permanent
  const days = Math.max(1, Math.floor(Number(accessDays)));
  const base = currentEnd ? new Date(currentEnd).getTime() : 0;
  const now = Date.now();
  const start = Math.max(now, base); // renewal adds from the later of now / current end
  return new Date(start + days * 86400000).toISOString();
}
