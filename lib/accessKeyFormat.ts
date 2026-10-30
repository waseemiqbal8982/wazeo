// Client-safe key formatting (string-only, no node crypto). Shared by the
// redeem frontend and server routes so every path normalizes identically.

export const WZ_RE = /^WZ-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

/**
 * Normalize any typed/pasted key into the canonical WZ-XXXX-XXXX-XXXX form.
 * Uppercases, strips separators/spaces/newlines, drops a leading literal "WZ"
 * prefix so pasted full keys are handled, then regroups the 12 body chars.
 */
export function normalizeAccessKey(raw: unknown): string {
  let s = String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  // Strip one leading literal "WZ" prefix. If another full key is still present
  // (length > 12 body chars), strip that too so double/prefixed pastes resolve
  // to the same canonical key. Generated bodies are hex (0-9 A-F) so they can
  // never legitimately begin with "WZ".
  if (s.startsWith("WZ") && s.length > 2) {
    s = s.slice(2);
    if (s.startsWith("WZ") && s.length > 12) s = s.slice(2);
  }
  s = s.slice(0, 12);
  const parts: string[] = [];
  for (let i = 0; i < s.length; i += 4) parts.push(s.slice(i, i + 4));
  return parts.length ? ["WZ", ...parts].join("-") : "";
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
