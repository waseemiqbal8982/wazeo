// Wazeo — Keys diagnosis harness (local + live).
// Creates a clearly-labelled test key through the same function the admin route
// uses (WZ-XXXX-XXXX-XXXX + SHA-256 hash), then exercises the validate/redeem
// variants against a target base URL (local build or live TEST_BASE_URL).
// TEST rows are labelled "TEST" and are deleted at the end (keys + test users).
//
// Usage:
//   node scripts/diagnose-keys.mjs            # local http://localhost:3000
//   TEST_BASE_URL=https://innvera.shop node scripts/diagnose-keys.mjs
import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });
import { createHash, randomBytes } from "node:crypto";
import pg from "pg";

// ---- replicate the admin route's generators exactly (app/api/admin/keys/route.ts) ----
const SEG = () =>
  randomBytes(3)
    .toString("hex")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .padEnd(4, "X")
    .slice(0, 4);
function makeKey() {
  return `WZ-${SEG()}-${SEG()}-${SEG()}`;
}
const hashKey = (k) => createHash("sha256").update(k).digest("hex");
const last4 = (k) => k.slice(-4);
const WZ_RE = /^WZ-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const DB = process.env.SUPABASE_DB_URL;
const useDb = Boolean(DB);

let client = null;
if (useDb) {
  client = new pg.Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
  await client.connect();
}


const createdKeyIds = [];
const createdUserIds = [];

const dbInsertKey = async (created) => {
  const cols = Object.keys(created).map((k) => `"${k}"`).join(", ");
  const ph = Object.keys(created).map((_, i) => `$${i + 1}`).join(", ");
  const { rows } = await client.query(
    `insert into public.access_codes (${cols}) values (${ph}) returning id`,
    Object.values(created)
  );
  createdKeyIds.push(rows[0].id);
  return rows[0].id;
};

const dbDeleteKeys = async () => {
  if (createdKeyIds.length) await client.query(`delete from public.access_codes where id = any($1)`, [createdKeyIds]);
};

const dbDeleteUsers = async () => {
  if (!createdUserIds.length) return;
  await client.query(`delete from public.profiles where id = any($1)`, [createdUserIds]);
};

const api = async (action, key, email, extra = {}) => {
  const res = await fetch(`${BASE}/api/auth/key-redeem`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, key, email, ...extra }),
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
};

const cleanKey = (raw) => {
  let s = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (s.startsWith("WZ") && s.length > 2) s = s.slice(2);
  s = s.slice(0, 12);
  const parts = [];
  for (let i = 0; i < s.length; i += 4) parts.push(s.slice(i, i + 4));
  return parts.length ? ["WZ", ...parts].join("-") : "";
};

let passed = 0, failed = 0;
const check = (cond, name) => {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ ${name}`); }
};

const variants = [
  ["exact", (k) => k],
  ["lowercase", (k) => k.toLowerCase()],
  ["extra spaces", (k) => `  ${k}  `],
  ["newline", (k) => k + "\n"],
  ["dash variant", (k) => k.replace(/-/g, "–")], // en-dash look-alike
  ["underscores", (k) => k.replace(/-/g, "_")],
  ["no dashes", (k) => k.replace(/-/g, "")],
  ["prefixed again", (k) => `WZ-${k}`],
];

try {
  console.log(`\n=== KEY DIAGNOSE — base=${BASE} (db=${useDb}) ===\n`);

  const emailA = `key.test.${Date.now() % 100000}@example.com`;
  const emailB = `key.test.upper.${Date.now() % 100000}@example.com`;

  // ---- 1) fresh UNBOUND key (admin route default) ----
  const sk1 = makeKey();
  check(WZ_RE.test(sk1), `generated format OK (${sk1})`);
  const created1 = {
    email: null, label: "TEST-diagnose-unbound", note: "", mode: "self",
    code: hashKey(sk1), hash: hashKey(sk1), last4: last4(sk1),
    expires_at: new Date(Date.now() + 30 * 864e5).toISOString(),
    access_days: 30, plan_name: "Standard", features: [],
    redemption_expires_at: new Date(Date.now() + 30 * 864e5).toISOString(),
    usage_limit: 1, starting_balance: 0, active: true,
  };
  if (useDb) await dbInsertKey(created1);
  console.log("\n-- UNBOUND key (self, 30d default) --");
  let r = await api("validate", sk1, emailA);
  check(r.status === 200, `validate exact -> ${r.status}`);
  check(r.json && r.json.ok !== false, "validate returns ok");
  check(r.json && r.json.bound_email === null, "validate reports unbound");

  for (const [name, fn] of variants) {
    const v = cleanKey(fn(sk1));
    const rv = await api("validate", v, emailA);
    check(rv.status === 200, `validate ${name} -> ${rv.status}`);
  }

  const rCase = await api("validate", sk1, emailA.toUpperCase());
  check(rCase.status === 200, `validate upper-case email -> ${rCase.status}`);

  // ---- 2) BOUND key (email bound, different case handled server-side) ----
  console.log("\n-- BOUND key --");
  const sk2 = makeKey();
  const created2 = { ...created1, email: emailA, label: "TEST-diagnose-bound", code: hashKey(sk2), hash: hashKey(sk2), last4: last4(sk2) };
  if (useDb) await dbInsertKey(created2);
  const rTrue = await api("validate", sk2, emailA);
  check(rTrue.status === 200, `validate correct bound email -> ${rTrue.status}`);
  const rWrong = await api("validate", sk2, emailB);
  check(rWrong.status >= 400, `validate wrong bound email -> ${rWrong.status}`);

  // ---- 3) PERMANENT key ----
  console.log("\n-- PERMANENT key (access_days null) --");
  const sk3 = makeKey();
  const created3 = { ...created1, label: "TEST-diagnose-perm", access_days: null, code: hashKey(sk3), hash: hashKey(sk3), last4: last4(sk3) };
  if (useDb) await dbInsertKey(created3);
  const rPerm = await api("validate", sk3, emailA);
  check(rPerm.status === 200, `validate permanent -> ${rPerm.status}`);
  check(rPerm.json && rPerm.json.permanent === true, "validate reports permanent");

  // ---- 4) EXPIRED key ----
  console.log("\n-- EXPIRED key --");
  const sk4 = makeKey();
  const created4 = { ...created1, label: "TEST-diagnose-expired", expires_at: new Date(Date.now() - 60_000).toISOString(), redemption_expires_at: new Date(Date.now() - 60_000).toISOString(), code: hashKey(sk4), hash: hashKey(sk4), last4: last4(sk4) };
  if (useDb) await dbInsertKey(created4);
  const rExp = await api("validate", sk4, emailA);
  check(rExp.status >= 400, `validate expired -> ${rExp.status}`);

  // ---- 5) REDEEM (bind) happy path ----
  console.log("\n-- REDEEM (action=bind) unbound key --");
  const sk5 = makeKey();
  const created5 = { ...created1, label: "TEST-diagnose-bind", code: hashKey(sk5), hash: hashKey(sk5), last4: last4(sk5) };
  if (useDb) await dbInsertKey(created5);
  const rBind = await api("bind", sk5, emailB);
  check(rBind.status === 200, `bind unbound -> ${rBind.status}`);
  if (rBind.json && rBind.json.email) createdUserIds.push(rBind.json.profile_id || null);

  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
} finally {
  console.log("\ncleanup...");
  if (useDb) {
    await dbDeleteKeys().catch(() => {});
    await dbDeleteUsers().catch(() => {});
    await client.end().catch(() => {});
  }
}

process.exit(failed > 0 ? 1 : 0);
