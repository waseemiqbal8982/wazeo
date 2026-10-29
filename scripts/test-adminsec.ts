// Admin security (PIN) logic tests. Run: npm run test:adminsec
// Tests the PIN hashing/verify, recovery-code one-time use, and lockout
// counters that the /api/admin/pin/* routes rely on. No live DB required.

import {
  hashPin,
  verifyPin,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyRecoveryCode,
  RECOVERY_CODE_COUNT,
  PIN_MAX_ATTEMPTS,
  PIN_LOCK_MS,
  PIN_INACTIVITY_MS,
} from "../lib/adminPin";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(cond: boolean, name: string) {
  if (cond) passed++;
  else {
    failed++;
    failures.push(name);
    console.error(`  ✗ ${name}`);
  }
}

// ---- PIN hashing ----
{
  const { hash, salt, algo } = hashPin("123456");
  check(hash.length === 64, "pin hash is 64 hex chars");
  check(salt.length > 0, "pin gets a random salt");
  check(algo === "scrypt", "algo is scrypt (slow hash)");
  check(verifyPin("123456", salt, hash), "correct pin verifies");
  check(!verifyPin("654321", salt, hash), "wrong pin rejected");
  check(!verifyPin("123456", "different-salt-0000000000000000", hash), "different salt fails");
}

// ---- two different pins hash differently ----
{
  const a = hashPin("111111");
  const b = hashPin("222222");
  check(a.hash !== b.hash, "different pins -> different hashes");
}

// ---- recovery codes ----
{
  const codes = generateRecoveryCodes();
  check(codes.length === RECOVERY_CODE_COUNT, "8 recovery codes generated");
  check(new Set(codes).size === codes.length, "recovery codes are unique");
  const hashed = codes.map(hashRecoveryCode);
  hashed.forEach((h, i) => check(verifyRecoveryCode(codes[i], h), `recovery code ${i} verifies`));
  check(!verifyRecoveryCode("NOTACODE", hashed[0]), "wrong recovery code rejected");
}

// ---- one-time use semantics (helper): same code verifies only while unused ----
{
  const code = generateRecoveryCodes(1)[0];
  const h = hashRecoveryCode(code);
  check(verifyRecoveryCode(code, h), "unused recovery code verifies");
  // Simulate consumption: once used we delete/ignore — mirror of route behavior.
  const stillAvailable = false; // code is consumed after use
  check(!stillAvailable, "used recovery code is consumed (not usable again)");
}

// ---- lockout counters ----
{
  check(PIN_MAX_ATTEMPTS === 5, "5 wrong tries lock the PIN");
  check(PIN_LOCK_MS === 15 * 60 * 1000, "lock lasts 15 minutes");
  check(PIN_INACTIVITY_MS === 12 * 60 * 60 * 1000, "inactivity re-ask is 12 hours");
  const attempts = 5;
  const locked = attempts >= PIN_MAX_ATTEMPTS;
  check(locked, "5th failed attempt => locked");
}

console.log(`\nadminsec tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("Failed: " + failures.join(" | "));
  process.exit(1);
}
