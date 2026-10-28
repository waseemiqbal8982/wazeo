import { lookup } from "node:dns/promises";

// Server-side URL validation to prevent SSRF. Allows only https and blocks
// private / link-local / loopback IP ranges (checked both literally and after
// DNS resolution to blunt DNS-rebinding attacks).

const PRIVATE_V4_PATTERNS: RegExp[] = [
  /^0\./, // 0.0.0.0/8
  /^10\./, // 10.0.0.0/8
  /^127\./, // 127.0.0.0/8 (loopback)
  /^169\.254\./, // 169.254.0.0/16 (link-local)
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
  /^192\.168\./, // 192.168.0.0/16
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // 100.64.0.0/10 (CGNAT)
];

export function isPrivateIp(ip: string): boolean {
  const v6 = ip.toLowerCase();
  if (v6 === "::1" || v6 === "::" || v6.startsWith("fe80:")) return true;
  for (const re of PRIVATE_V4_PATTERNS) if (re.test(ip)) return true;
  return false;
}

export type UrlValidation = { ok: true } | { ok: false; error: string };

export async function validateProviderUrl(raw: string): Promise<UrlValidation> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, error: "Invalid URL" };
  }

  if (url.protocol !== "https:") {
    return { ok: false, error: "Only https URLs are allowed" };
  }

  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0"
  ) {
    return { ok: false, error: "Private/local hosts are blocked" };
  }

  // Literal IPv4 — check directly.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    if (isPrivateIp(host)) return { ok: false, error: "Private IP ranges are blocked" };
    return { ok: true };
  }

  // Hostname — resolve and check the resolved addresses to blunt DNS rebinding.
  try {
    const resolved = await lookup(host);
    const addrs = Array.isArray(resolved) ? resolved : [resolved];
    for (const a of addrs) {
      if (isPrivateIp(a.address)) {
        return { ok: false, error: `Resolved to private IP (${a.address})` };
      }
    }
  } catch {
    // Unresolvable now — will fail at request time. Allow through.
  }

  return { ok: true };
}
