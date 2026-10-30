// New key system tests (lib/keys). Run along with test:key.
// Pure logic (no DB). Coverage: format, normalization variants, status
// derivation, device cap, renewal expiry math, constant-time compare.

import { normalizeKey, formatKeyDisplay, keyLast4, KEY_ALPHABET, KEY_DISPLAY_RE } from "../lib/keys/normalize";
import { generateKey, generateKeyBody, bodyToDisplay } from "../lib/keys/generate";
import { deriveStatus, validateRow, deviceCapOk, computeAccessExpiresAt, ctEqual } from "../lib/keys/key";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(cond: boolean, name: string) {
  if (cond) passed++;
  else { failed++; failures.push(name); console.error(`  ✗ ${name}`); }
}

// ---- format ----
{
  const k = generateKey();
  check(KEY_DISPLAY_RE.test(k), `generated key is WZ-XXXX-XXXX-XXXX (${k})`);
  const body = generateKeyBody();
  check(body.length === 12, "body length 12");
  for (const ch of body) check(KEY_ALPHABET.includes(ch), `body chars in alphabet (${ch})`);
}

// ---- normalization variants: all must resolve to same canonical body ----
{
  const base = generateKeyBody(); // 12 chars
  const display = bodyToDisplay(base);
  const variants = [
    display,                       // full display
    base,                          // body only
    display.toLowerCase(),         // lowercase
    display.replace(/-/g, " "),    // spaces
    display.replace(/-/g, "\n"),   // newlines
    `  ${display}  `,             // leading/trailing spaces
    `WZ${base}`,                  // no dashes, WZ prefix
    `WZ-${base.slice(0,4)} ${base.slice(4,8)}-${base.slice(8)}`, // mixed separators
  ];
  for (const v of variants) {
    const n = normalizeKey(v);
    check(n === base, `normalize maps variant -> base (${JSON.stringify(v)})`);
  }
  check(normalizeKey("WZ-ABCD-1234-EF56") === null, "alphabet char '0' rejected (look-alike)");
  check(normalizeKey("") === null, "empty -> null");
  check(normalizeKey("WZ-2345-6789-ABCD") !== null, "valid alphabet accepted");
  check(normalizeKey("WZ-0345-6789-ABCD") === null, "leading 0 rejected (look-alike)");
}

// ---- status / validation ----
{
  check(deriveStatus({ status: "revoked" }) === "revoked", "revoked");
  check(deriveStatus({ status: "active", access_expires_at: null }) === "active", "active permanent");
  check(deriveStatus({ status: "active", access_expires_at: new Date(Date.now() - 5000).toISOString() }) === "expired", "active but past end -> expired");
  check(deriveStatus({ status: "unused", redeem_until: new Date(Date.now() - 1000).toISOString() }) === "expired", "unused past redeem window -> expired");
  check(deriveStatus({ status: "unused", redeem_until: new Date(Date.now() + 5000).toISOString() }) === "unused", "unused within window");

  const body = generateKeyBody();
  check(!validateRow(body, null).ok, "not found -> rejected");
  check(validateRow(body, { status: "unused" }).ok, "unused ok");
  const v = validateRow(body, { status: "active", activated_at: new Date().toISOString() });
  check(v.ok && v.status === "active", "active ok");

  // bound email
  const bound = { status: "unused", bound_email: "A@X.com" } as any;
  check(validateRow(body, bound, "a@x.com").ok, "bound email ok (case-insensitive)");
  check(!validateRow(body, bound, "b@x.com").ok, "wrong bound email rejected");

  // device cap
  check(deviceCapOk(0, 2), "0 devices under cap");
  check(deviceCapOk(1, 2), "1 device under cap");
  check(!deviceCapOk(2, 2), "2 devices at cap");
  check(deviceCapOk(2, 5), "cap 5 allows 2");
  check(deviceCapOk(0, undefined), "default cap 2 allows 0");

  // renewal expiry
  const end = new Date(Date.now() + 10 * 86400000).toISOString();
  const renewed = computeAccessExpiresAt(30, end);
  const diff = new Date(renewed as string).getTime() - new Date(end).getTime();
  check(Math.abs(diff - 30 * 86400000) < 5000, "renewal adds days from current end");
  const fresh = computeAccessExpiresAt(7, null);
  check(Math.abs(new Date(fresh as string).getTime() - Date.now() - 7 * 86400000) < 5000, "first activation = now + days");
  check(computeAccessExpiresAt(null, end) === null, "permanent -> null");

  // constant-time compare
  check(ctEqual("abc", "abc"), "ctEqual equal");
  check(!ctEqual("abc", "abd"), "ctEqual different");
  check(!ctEqual("abc", "abcd"), "ctEqual length differs");
}

console.log(`\nkey-new tests: ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error("Failed: " + failures.join(" | ")); process.exit(1); }
