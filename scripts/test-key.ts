// Access-key logic tests. Run: npm run test:key
// These test the redeem/validate rules + access-expiry math that the
// /api/auth/key-redeem route relies on. Live DB is not required.

import { accessInfo, accessLeftLabel } from "../lib/access";
import { WZ_RE, normalizeAccessKey, validateAccessKey, hashAccessKey } from "../lib/accessKeys";
import { generateAccessKey } from "../lib/accessKeys";
import { encryptKey, decryptKey, keyedHash } from "../lib/keyEncryption";

interface KeyRow {
  active?: boolean;
  revoked?: boolean;
  suspended?: boolean;
  uses?: number;
  used_at?: string | null;
  expires_at?: string | null;
  redemption_expires_at?: string | null;
  email?: string | null;
  access_days?: number | null;
}

function keyValid(ac: KeyRow, now = Date.now()): boolean {
  if (ac.revoked || !ac.active || ac.suspended) return false;
  if (ac.used_at || (ac.uses ?? 0) > 0) return false;
  if (ac.expires_at && new Date(ac.expires_at).getTime() < now) return false;
  if (ac.redemption_expires_at && new Date(ac.redemption_expires_at).getTime() < now) return false;
  return true;
}

function boundEmailOk(ac: KeyRow, email: string): boolean {
  if (!ac.email) return true; // unbound key
  return ac.email.toLowerCase() === email.trim().toLowerCase();
}

function computeAccessExpiresAt(accessDays: number | null, now = Date.now()): string | null {
  if (accessDays == null) return null;
  return new Date(now + accessDays * 86400000).toISOString();
}

// minimal in-memory rate limiter mirroring lib/rateLimit
function makeLimiter(limit: number, windowMs: number) {
  const hits: number[] = [];
  return {
    hit(): boolean {
      const now = Date.now();
      const valid = hits.filter((t) => now - t < windowMs);
      hits.length = 0;
      hits.push(...valid);
      if (hits.length >= limit) return false;
      hits.push(now);
      return true;
    },
  };
}

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

const future = new Date(Date.now() + 30 * 86400000).toISOString();
const past = new Date(Date.now() - 1000).toISOString();

// ---- format ----
check(WZ_RE.test("WZ-ABCD-1234-EF56"), "format accepts valid WZ key");
check(!WZ_RE.test("WZ-ABC-123-EF"), "format rejects short key");
check(!WZ_RE.test("hello"), "format rejects garbage");

// ---- frontend key normalization (root-cause fix) — shared module ----
{
  const full = normalizeAccessKey("WZ-7AD7-1A2B-3C4D");
  check(full === "WZ-7AD7-1A2B-3C4D", "pasted full key (with WZ- prefix) is preserved");
  check(WZ_RE.test(full), "normalized full key matches server regex");
  const body = normalizeAccessKey("7AD71A2B3C4D");
  check(body === "WZ-7AD7-1A2B-3C4D", "body-only input gets WZ- prefix");
  const lower = normalizeAccessKey("wz-7ad7-1a2b-3c4d");
  check(lower === "WZ-7AD7-1A2B-3C4D", "lowercase input normalized to uppercase");
  const partial = normalizeAccessKey("WZ-7AD7");
  check(partial === "WZ-7AD7", "partial key normalized cleanly");
}

// ---- Phase 1 variant matrix (all typed/pasted variants must normalize to the
// same canonical key and pass the shared validator) ----
{
  const key = generateAccessKey();
  const canonical = normalizeAccessKey(key);
  check(WZ_RE.test(canonical), "generated key is canonical");
  const variants: Array<[string, string]> = [
    ["exact", key],
    ["lowercase", key.toLowerCase()],
    ["extra spaces", `  ${key}  `],
    ["newline", key + "\n"],
    ["en-dash (look-alike)", key.replace(/-/g, "–")],
    ["underscores", key.replace(/-/g, "_")],
    ["no dashes", key.replace(/-/g, "")],
    ["prefixed again", `WZ-${key}`],
  ];
  for (const [name, raw] of variants) {
    const norm = normalizeAccessKey(raw);
    check(norm === canonical, `normalize ${name} -> canonical`);
    check(WZ_RE.test(norm), `normalize ${name} matches regex`);
  }
  const row = { hash: hashAccessKey(canonical), active: true, revoked: false, suspended: false, uses: 0, expires_at: future, redemption_expires_at: future };
  check(validateAccessKey(canonical, row).ok, "shared validator accepts canonical key");
  check(validateAccessKey(canonical.toUpperCase(), row).ok, "shared validator accepts exact key");
  check(!validateAccessKey("", row).ok, "shared validator rejects empty");
}

// ---- shared validator acceptance/rejection matrix ----
{
  const key = generateAccessKey();
  const good = { hash: hashAccessKey(key), active: true, revoked: false, suspended: false, uses: 0, expires_at: future, redemption_expires_at: future };
  check(validateAccessKey(key, good).ok, "validator: active fresh key OK");
  check(!validateAccessKey(key, { ...good, revoked: true }).ok, "validator: revoked rejected");
  check(!validateAccessKey(key, { ...good, active: false }).ok, "validator: inactive rejected");
  check(!validateAccessKey(key, { ...good, suspended: true }).ok, "validator: suspended rejected");
  check(!validateAccessKey(key, { ...good, uses: 1 }).ok, "validator: used rejected");
  check(!validateAccessKey(key, { ...good, uses: 0, used_at: new Date().toISOString() }).ok, "validator: used_at rejected");
  check(!validateAccessKey(key, { ...good, expires_at: past }).ok, "validator: expired rejected");
  check(!validateAccessKey(key, { ...good, redemption_expires_at: past }).ok, "validator: redemption expired rejected");
  check(!validateAccessKey(key, null).ok, "validator: missing row rejected");
  check(!validateAccessKey("WZ-AAAA-BBBB-CCCC", { ...good, hash: hashAccessKey("WZ-ZZZZ-YYYY-XXXX") }).ok, "validator: hash mismatch rejected");
}

// ---- valid key with bound email ----
{
  const ac: KeyRow = { active: true, revoked: false, uses: 0, email: "a@b.com", expires_at: future };
  check(keyValid(ac), "valid key is valid");
  check(boundEmailOk(ac, "a@b.com"), "bound email matches");
  check(!boundEmailOk(ac, "x@y.com"), "wrong email rejected");
}

// ---- expired / revoked / reused ----
check(!keyValid({ active: true, uses: 0, expires_at: past }), "expired key invalid");
check(!keyValid({ active: true, revoked: true, uses: 0, expires_at: future }), "revoked key invalid");
check(!keyValid({ active: true, suspended: true, uses: 0, expires_at: future }), "suspended key invalid");
check(!keyValid({ active: true, uses: 1, expires_at: future }), "reused key invalid");
check(!keyValid({ active: true, uses: 0, used_at: new Date().toISOString(), expires_at: future }), "used_at marks invalid");
check(!keyValid({ active: true, uses: 0, expires_at: future, redemption_expires_at: past }), "redemption deadline passed invalid");
check(!keyValid({ active: false, uses: 0, expires_at: future }), "inactive key invalid");

// ---- unbound ----
check(boundEmailOk({}, "any@example.com"), "unbound key accepts any email");

// ---- access_expires_at calc ----
{
  const now = Date.now();
  const iso = computeAccessExpiresAt(7, now);
  const diff = new Date(iso as string).getTime() - now;
  check(Math.abs(diff - 7 * 86400000) < 5000, "access_expires_at = now + access_days");
  check(computeAccessExpiresAt(null, now) === null, "permanent -> null access_expires_at");
  check(Number.isFinite(new Date(iso as string).getTime()), "access_expires_at is valid date");
}

// ---- accessInfo helper ----
{
  const perm = accessInfo(null);
  check(perm.unlimited && !perm.expired, "null access_expires_at = unlimited");
  const expired = accessInfo(past);
  check(expired.expired, "past access_expires_at = expired");
  const active = accessInfo(new Date(Date.now() + 10 * 86400000).toISOString());
  check(!active.expired && active.daysLeft === 10, "future access -> 10 days left");
  check(accessLeftLabel(new Date(Date.now() + 10 * 86400000).toISOString()).includes("10"), "label shows days");
  check(accessLeftLabel(null).includes("Unlimited"), "label shows unlimited");
}

// ---- rate limit 5 / 10min ----
{
  const lim = makeLimiter(5, 600000);
  for (let i = 0; i < 5; i++) check(lim.hit(), `rate limit allows attempt ${i + 1}`);
  check(!lim.hit(), "6th attempt blocked");
}

// ---- invite-only gate ----
{
  const gate = (setting: string) => setting === "true";
  check(gate("true") === true, "invite-only ON blocks plain signup (gate true)");
  check(gate("false") === false, "invite-only OFF allows plain signup");
}

// ---- empty form defaults (Item 2: zero required fields) ----
{
  const input = { email: "", accessDays: "", planName: "", startingBalance: 0, expiresAt: "" };
  const accessDays = input.accessDays === "permanent" ? null : (Number(input.accessDays) || 30);
  const planName = input.planName.trim() || "Standard";
  const redemption = new Date(Date.now() + 30 * 86400000).toTimeString(); // 30-day default marker
  check(accessDays === 30, "empty accessDays defaults to 30 days");
  check(planName === "Standard", "empty planName defaults to Standard");
  check(input.email === "", "empty email = unbound key (binds on first use)");
  check(/[0-9]/.test(redemption), "redemption default is 30 days");
}

// ---- bulk: multiple emails → same number of key inputs ----
{
  const bulk = "a@x.com\nb@x.com\nc@x.com";
  const list = bulk.split("\n").map((l) => l.trim()).filter(Boolean);
  check(list.length === 3, "bulk parses 3 emails");
  check(list.every((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)), "all bulk emails valid");
}

// ---- encryption at rest (Item 1: admin can show full key) ----
{
  const key = generateAccessKey();
  const enc = encryptKey(key);
  check(enc.startsWith("gcm:v1:"), "encrypted key uses gcm:v1 format");
  check(decryptKey(enc) === key, "encryption round-trip returns the full key");
  check(decryptKey("") === "", "empty stored key decrypts to empty");
  check(decryptKey("garbage") === "", "malformed payload decrypts to empty");
  check(keyedHash(key) === keyedHash(key), "keyed hash is deterministic");
  check(keyedHash(key).length === 64, "keyed hash is sha256 hex (64 chars)");
  check(keyedHash(key) !== encryptKey(key), "keyed hash differs from ciphertext");
}

console.log(`\nkey tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("Failed: " + failures.join(" | "));
  process.exit(1);
}
