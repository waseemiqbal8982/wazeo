// Key generation — uses crypto.randomInt for unbiased selection from the
// safe alphabet (no look-alike characters). Server-only.

import { randomInt } from "node:crypto";
import { KEY_ALPHABET, KEY_LENGTH, formatKeyDisplay, normalizeKey } from "./normalize";

/** Generate a random canonical 12-character body. */
export function generateKeyBody(): string {
  let out = "";
  for (let i = 0; i < KEY_LENGTH; i++) {
    out += KEY_ALPHABET[randomInt(KEY_ALPHABET.length)];
  }
  return out;
}

/** Generate a full display key: WZ-XXXX-XXXX-XXXX. */
export function generateKey(): string {
  return formatKeyDisplay(generateKeyBody());
}

/** Test helper: build a display key from a body (for tests). */
export function bodyToDisplay(body: string): string {
  return formatKeyDisplay(normalizeKey(body) ?? "");
}
