// Wazeo key system — single source of truth for key normalization.
// The normalized value (the 12 body characters) is the unique lookup key
// stored in `wz_keys.code`. Any way a customer types or pastes a key
// (lowercase, spaces, dashes, newlines, zero-width chars, with or without
// the WZ- prefix or 'WZ') resolves to the same 12 characters.

/** Alphabet with no look-alike characters (0/O/1/I/L are intentionally absent). */
export const KEY_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const KEY_LENGTH = 12; // 3 groups × 4 chars

/** Regex for the display form: WZ-XXXX-XXXX-XXXX (only alphabet chars). */
export const KEY_DISPLAY_RE = /^WZ-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;

/**
 * Normalize any typed/pasted input into the canonical 12-character body.
 * - uppercases
 * - strips spaces, dashes, newlines, zero-width characters and anything else
 *   that is not a letter/digit
 * - strips a single leading literal "WZ"
 * - requires exactly 12 remaining characters from the alphabet
 * Returns the 12-character string, or null when the result is invalid.
 */
export function normalizeKey(input: unknown): string | null {
  const raw = String(input ?? "")
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width space, ZWJ, ZWNJ, BOM
    .replace(/[^A-Z0-9]/g, ""); // removes spaces, dashes, newlines, etc.

  let s = raw;
  if (s.startsWith("WZ") && s.length > 2) {
    s = s.slice(2);
  }

  if (s.length !== KEY_LENGTH) return null;
  for (const ch of s) {
    if (!KEY_ALPHABET.includes(ch)) return null;
  }
  return s;
}

/** Format a normalized 12-char body as WZ-XXXX-XXXX-XXXX. */
export function formatKeyDisplay(body: string): string {
  if (!body || body.length !== KEY_LENGTH) return "";
  return `WZ-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`;
}

/** Last 4 characters (for partial display to non-owner admins). */
export function keyLast4(body: string): string {
  return body ? body.slice(-4) : "";
}
