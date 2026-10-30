import { generateApiKey, hashApiKey, safeEqual, isWellFormedKey, deriveStatus, validateKeyAgainstRow, type ApiKeyRow } from "../lib/apiKeys";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  if (cond) { pass++; console.log("  ✅", name); }
  else { fail++; console.log("  ❌", name); }
}

// ---- generate / format ----
const { key, prefix, hash } = generateApiKey();
check("format WAK-XXXX-XXXX-XXXX-XXXX", isWellFormedKey(key));
check("prefix is masked", prefix.startsWith("WAK-????-????-????-") && prefix.length === key.length);
check("hash is sha256 hex", /^[a-f0-9]{64}$/.test(hash));
check("mask ends with last4", prefix.endsWith(key.slice(-4)));

// ---- hash determinism + safeEqual ----
check("hash deterministic", hashApiKey(key) === hash);
check("safeEqual true for same", safeEqual(hash, hash));
check("safeEqual false for different", !safeEqual(hash, hashApiKey("WAK-TEST-TEST-TEST-TEST")));

// ---- deriveStatus ----
const base: ApiKeyRow = { id: "x", user_id: "u", name: "n", prefix: "p", key_hash: "h", created_at: new Date().toISOString() };
check("unused -> Unused", deriveStatus(base) === "Unused");
check("used -> Active", deriveStatus({ ...base, last_used_at: new Date().toISOString() }) === "Active");
check("revoked -> Revoked", deriveStatus({ ...base, revoked_at: new Date().toISOString() }) === "Revoked");
check("suspended -> Suspended", deriveStatus({ ...base, suspended_at: new Date().toISOString() }) === "Suspended");
check("banned -> Banned", deriveStatus({ ...base, banned_at: new Date().toISOString() }) === "Banned");
check("expired -> Expired", deriveStatus({ ...base, expires_at: new Date(Date.now() - 1000).toISOString() }) === "Expired");
check("limit reached -> Limit reached", deriveStatus({ ...base, uses: 10, usage_cap: 10 }) === "Limit reached");

// ---- validateKeyAgainstRow ----
const row: ApiKeyRow = { ...base, key_hash: hash, uses: 0 };
check("valid key ok", validateKeyAgainstRow(key, row).ok === true);
check("wrong key rejected", validateKeyAgainstRow("WAK-AAAA-BBBB-CCCC-DDDD", row).ok === false);
check("revoked rejected", validateKeyAgainstRow(key, { ...row, revoked_at: new Date().toISOString() }).ok === false);
check("suspended rejected", validateKeyAgainstRow(key, { ...row, suspended_at: new Date().toISOString() }).ok === false);
check("banned rejected", validateKeyAgainstRow(key, { ...row, banned_at: new Date().toISOString() }).ok === false);
check("expired rejected", validateKeyAgainstRow(key, { ...row, expires_at: new Date(Date.now() - 1000).toISOString() }).ok === false);
check("quota exhausted rejected", validateKeyAgainstRow(key, { ...row, uses: 10, usage_cap: 10 }).ok === false);

console.log(`\nResult: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
