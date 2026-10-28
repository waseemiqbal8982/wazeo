// Shared Support Hub helpers (client-safe).

export interface SupportSettings {
  whatsapp?: string;
  telegram?: string;
  email?: string;
  workingHours?: string; // "HH:MM-HH:MM" (in workingTz)
  workingTz?: string; // IANA timezone
  welcome?: string;
}

export interface WorkingRange {
  open: number; // minutes since midnight
  close: number;
}

export function parseWorkingHours(raw?: string | null): WorkingRange | null {
  if (!raw) return null;
  const m = raw.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return {
    open: Number(m[1]) * 60 + Number(m[2]),
    close: Number(m[3]) * 60 + Number(m[4]),
  };
}

export function nowMinutesInTz(tz?: string | null): number {
  const t = tz || "UTC";
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: t,
    }).formatToParts(new Date());
    const h = parts.find((p) => p.type === "hour")?.value || "0";
    const mi = parts.find((p) => p.type === "minute")?.value || "0";
    return Number(h) * 60 + Number(mi);
  } catch {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }
}

// Returns true if currently within working hours (24/7 if unconfigured).
export function isSupportOnline(workingHours?: string | null, workingTz?: string | null): boolean {
  const range = parseWorkingHours(workingHours);
  if (!range) return true;
  const now = nowMinutesInTz(workingTz);
  if (range.open <= range.close) {
    return now >= range.open && now < range.close;
  }
  // overnight range (e.g. 22:00-06:00)
  return now >= range.open || now < range.close;
}

export function formatWorkingHours(workingHours?: string | null): string {
  if (!workingHours) return "";
  const range = parseWorkingHours(workingHours);
  if (!range) return workingHours;
  const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return `${fmt(range.open)} – ${fmt(range.close)}`;
}
