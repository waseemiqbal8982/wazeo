// Live DB test for the license workflow (validation + atomic email binding).
// Mirrors the exact checks in /api/auth/key-redeem and the admin licence actions.
// Run: node scripts/test-license-flow.mjs
import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });
import { createHash, randomBytes } from "node:crypto";
import pg from "pg";

const SEG = () =>
  randomBytes(3).toString("hex").toUpperCase().replace(/[^A-Z0-9]/g, "").padEnd(4, "X").slice(0, 4);
const makeKey = () => `WZ-${SEG()}-${SEG()}-${SEG()}`;
const hashKey = (k) => createHash("sha256").update(k).digest("hex");
const last4 = (k) => k.slice(-4);
const WZ_RE = /^WZ-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();

let passed = 0, failed = 0;
const check = (cond, name) => {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ ${name}`); }
};

const createdIds = [];
const cleanup = async () => {
  if (createdIds.length) await c.query(`delete from public.access_codes where id = any($1)`, [createdIds]);
  await c.end();
};

// ---- server-side loadKey equivalent ----
const loadKey = async (key) => {
  const { rows } = await c.query(`select * from public.access_codes where hash = $1 limit 1`, [hashKey(key)]);
  const ac = rows[0];
  if (!ac) return { error: "missing" };
  if (ac.revoked || !ac.active || ac.suspended) return { error: "invalid-state" };
  if (ac.used_at || (ac.uses ?? 0) > 0) return { error: "used" };
  if (ac.expires_at && new Date(ac.expires_at).getTime() < Date.now()) return { error: "expired" };
  if (ac.redemption_expires_at && new Date(ac.redemption_expires_at).getTime() < Date.now()) return { error: "redemption-expired" };
  return { ac };
};

// ---- atomic bind (exactly the SQL/condition used in the route) ----
const atomicBind = async (id, email) => {
  const { rowCount } = await c.query(
    `update public.access_codes set email = $2, bound_at = now()
     where id = $1 and email is null and uses = 0 and active and not revoked and not suspended`,
    [id, email]
  );
  return rowCount === 1;
};

try {
  console.log("LICENSE FLOW LIVE TEST\n");

  // 1) generate a fresh unbound license exactly like the admin route
  const key = makeKey();
  check(WZ_RE.test(key), `generated key format OK (${key})`);
  const created = {
    email: null, label: "flow-test", note: "", mode: "self",
    code: hashKey(key), hash: hashKey(key), last4: last4(key),
    expires_at: new Date(Date.now() + 30 * 864e5).toISOString(),
    access_days: 7, plan_name: "Standard", features: JSON.stringify(["Combo"]),
    redemption_expires_at: new Date(Date.now() + 30 * 864e5).toISOString(),
    usage_limit: 1, starting_balance: 0, active: true,
  };
  const cols = Object.keys(created).map((k) => `"${k}"`).join(", ");
  const ph = Object.keys(created).map((_, i) => `$${i + 1}`).join(", ");
  const { rows: ins } = await c.query(
    `insert into public.access_codes (${cols}) values (${ph}) returning id`,
    Object.values(created)
  );
  const licId = ins[0].id;
  createdIds.push(licId);

  // 2) validation accepts a fresh active unbound license
  let res = await loadKey(key);
  check(!res.error, "fresh active unbound license is VALID");
  check(res.ac?.email === null, "license is unbound");

  // 3) atomic bind - email A claims it
  check(await atomicBind(licId, "customer-a@example.com"), "first email binds atomically");
  const afterBind = (await c.query(`select email, bound_at from public.access_codes where id = $1`, [licId])).rows[0];
  check(afterBind.email === "customer-a@example.com", "license bound to customer A");

  // 4) atomic bind - a second email MUST fail (already bound, single-claim)
  check(!(await atomicBind(licId, "customer-b@example.com")), "second email CANNOT claim the same license");

  // 5) a used license is rejected by loadKey
  await c.query(`update public.access_codes set uses = 1, active = false, used_at = now(), used_by = $2 where id = $1`, [licId, "00000000-0000-0000-0000-000000000000"]);
  res = await loadKey(key);
  check(!!res.error, "used license is rejected");

  // 6) suspended license rejected (fresh key)
  const key2 = makeKey();
  const created2 = { ...created, code: hashKey(key2), hash: hashKey(key2), last4: last4(key2), active: true, email: null, uses: 0 };
  const cols2 = Object.keys(created2).map((k) => `"${k}"`).join(", ");
  const ph2 = Object.keys(created2).map((_, i) => `$${i + 1}`).join(", ");
  const ins2 = (await c.query(`insert into public.access_codes (${cols2}) values (${ph2}) returning id`, Object.values(created2))).rows[0];
  createdIds.push(ins2.id);
  await c.query(`update public.access_codes set suspended = true where id = $1`, [ins2.id]);
  res = await loadKey(key2);
  check(res.error === "invalid-state", "suspended license is rejected");

  // 7) expired license rejected
  const key3 = makeKey();
  const created3 = { ...created, code: hashKey(key3), hash: hashKey(key3), last4: last4(key3), active: true, expires_at: new Date(Date.now() - 1000).toISOString() };
  const cols3 = Object.keys(created3).map((k) => `"${k}"`).join(", ");
  const ph3 = Object.keys(created3).map((_, i) => `$${i + 1}`).join(", ");
  const ins3 = (await c.query(`insert into public.access_codes (${cols3}) values (${ph3}) returning id`, Object.values(created3))).rows[0];
  createdIds.push(ins3.id);
  res = await loadKey(key3);
  check(res.error === "expired", "expired license is rejected");
} catch (e) {
  console.error("❌ exception:", e.message);
  failed++;
} finally {
  await cleanup();
}

console.log(`\nlicense-flow tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
