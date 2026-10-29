// Helpers for access plans (access keys). Shared by client components.

export interface AccessInfo {
  expired: boolean;
  unlimited: boolean;
  daysLeft: number; // 0 if expired
}

/** Compute access state from a profile's access_expires_at. */
export function accessInfo(accessExpiresAt?: string | null): AccessInfo {
  if (!accessExpiresAt) {
    // No key ever redeemed -> treat as permanent (open access).
    return { expired: false, unlimited: true, daysLeft: 0 };
  }
  const end = new Date(accessExpiresAt).getTime();
  if (Number.isNaN(end)) return { expired: false, unlimited: true, daysLeft: 0 };
  const now = Date.now();
  if (end <= now) return { expired: true, unlimited: false, daysLeft: 0 };
  const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
  return { expired: false, unlimited: false, daysLeft };
}

/** Format "Access left" label. */
export function accessLeftLabel(accessExpiresAt?: string | null): string {
  const info = accessInfo(accessExpiresAt);
  if (info.expired) return "Access expired";
  if (info.unlimited) return "Unlimited access";
  return `Access left: ${info.daysLeft} day${info.daysLeft === 1 ? "" : "s"}`;
}

/** Format the date until which access works (e.g. "12 Mar 2027"). */
export function formatAccessUntil(accessExpiresAt?: string | null): string {
  if (!accessExpiresAt) return "Permanent access";
  const d = new Date(accessExpiresAt);
  if (Number.isNaN(d.getTime())) return "Permanent access";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
