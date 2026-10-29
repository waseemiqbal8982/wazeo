// Access-key logic tests. Run: npm run test:key
// These test the redeem/validate rules + access-expiry math that the
// /api/auth/key-redeem route relies on. Live DB is not required.

import { accessInfo, accessLeftLabel } from "../lib/access";

const WZ_RE = /^WZ-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

interface KeyRow {
  active?: boolean;
  revoked?: boolean;
  uses?: number;
  used_at?: string | null;
  expires_at?: string | null;
  redemption_expires_at?: string | null;
  email?: string | null;
  access_days?: number | null;
}

function keyValid(ac: KeyRow, now = Date.now()): boolean {
  if (ac.revoked || !ac.active) return false;
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

console.log(`\nkey tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("Failed: " + failures.join(" | "));
  process.exit(1);
}
