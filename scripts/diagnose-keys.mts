// Wazeo — Keys diagnosis harness (local + live). Run with tsx:
//   npx tsx scripts/diagnose-keys.mts            # local http://localhost:3000
//   TEST_BASE_URL=https://innvera.shop npx tsx scripts/diagnose-keys.mts
// Creates clearly-labelled TEST keys through the exact admin generator/hash
// (lib/accessKeys.ts), then exercises validate/redeem variants against the
// target base URL. TEST rows are deleted afterwards (keys + test users).
import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });
// @ts-expect-error pg ships no bundled types
import pg from "pg";
import {
  generateAccessKey,
  hashAccessKey,
  last4,
  WZ_RE,
  normalizeAccessKey,
} from "../lib/accessKeys";

const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const DB = process.env.SUPABASE_DB_URL;
const useDb = Boolean(DB);

let client: pg.Client | null = null;
if (useDb) {
  client = new pg.Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
  await client.connect();
}

const createdKeyIds: string[] = [];
const createdUserIds: string[] = [];

const dbInsertKey = async (created: Record<string, unknown>) => {
  const cols = Object.keys(created).map((k) => `"${k}"`).join(", ");
  const ph = Object.keys(created).map((_, i) => `$${i + 1}`).join(", ");
  const { rows } = await (client as pg.Client).query(
    `insert into public.access_codes (${cols}) values (${ph}) returning id`,
    Object.values(created)
  );
  createdKeyIds.push(rows[0].id);
  return rows[0].id as string;
};

const dbDeleteKeys = async () => {
  if (createdKeyIds.length) await (client as pg.Client).query(`delete from public.access_codes where id = any($1)`, [createdKeyIds]);
};

const dbDeleteUsers = async () => {
  if (!createdUserIds.length) return;
  await (client as pg.Client).query(`delete from public.profiles where id = any($1)`, [createdUserIds]);
};

const api = async (action: string, key: string, email: string, extra: Record<string, unknown> = {}) => {
  const res = await fetch(`${BASE}/api/auth/key-redeem`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, key, email, ...extra }),
  });
  let json: any = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
};

let passed = 0, failed = 0;
const check = (cond: boolean, name: string) => {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ ${name}`); }
};

const variants: Array<[string, (k: string) => string]> = [
  ["exact", (k) => k],
  ["lowercase", (k) => k.toLowerCase()],
  ["extra spaces", (k) => `  ${k}  `],
  ["newline", (k) => k + "\n"],
  ["dash variant", (k) => k.replace(/-/g, "–")],
  ["underscores", (k) => k.replace(/-/g, "_")],
  ["no dashes", (k) => k.replace(/-/g, "")],
  ["prefixed again", (k) => `WZ-${k}`],
];

try {
  console.log(`\n=== KEY DIAGNOSE — base=${BASE} (db=${useDb}) ===\n`);

  const emailA = `key.test.${Date.now() % 100000}@example.com`;
  const emailB = `key.test.upper.${Date.now() % 100000}@example.com`;

  const sk1 = generateAccessKey();
  check(WZ_RE.test(sk1), `generated format OK (${sk1})`);
  const created1 = {
    email: null, label: "TEST-diagnose-unbound", note: "", mode: "self",
    code: hashAccessKey(sk1), hash: hashAccessKey(sk1), last4: last4(sk1),
    expires_at: new Date(Date.now() + 30 * 864e5).toISOString(),
    access_days: 30, plan_name: "Standard", features: [],
    redemption_expires_at: new Date(Date.now() + 30 * 864e5).toISOString(),
    usage_limit: 1, starting_balance: 0, active: true,
  };
  if (useDb) await dbInsertKey(created1);
  console.log("\n-- UNBOUND key (self, 30d default) --");
  const r = await api("validate", sk1, emailA);
  check(r.status === 200, `validate exact -> ${r.status}`);
  check(r.json && r.json.ok !== false, "validate returns ok");
  check(r.json && r.json.bound_email === null, "validate reports unbound");

  for (const [name, fn] of variants) {
    const v = normalizeAccessKey(fn(sk1));
    const rv = await api("validate", v, emailA);
    check(rv.status === 200, `validate ${name} -> ${rv.status}`);
  }

  const rCase = await api("validate", sk1, emailA.toUpperCase());
  check(rCase.status === 200, `validate upper-case email -> ${rCase.status}`);

  console.log("\n-- BOUND key --");
  const sk2 = generateAccessKey();
  const created2 = { ...created1, email: emailA, label: "TEST-diagnose-bound", code: hashAccessKey(sk2), hash: hashAccessKey(sk2), last4: last4(sk2) };
  if (useDb) await dbInsertKey(created2);
  const rTrue = await api("validate", sk2, emailA);
  check(rTrue.status === 200, `validate correct bound email -> ${rTrue.status}`);
  const rWrong = await api("validate", sk2, emailB);
  check(rWrong.status >= 400, `validate wrong bound email -> ${rWrong.status}`);


  console.log("\n-- PERMANENT key --");
  const sk3 = generateAccessKey();
  const created3 = { ...created1, label: "TEST-diagnose-perm", access_days: null, code: hashAccessKey(sk3), hash: hashAccessKey(sk3), last4: last4(sk3) };
  if (useDb) await dbInsertKey(created3);
  const rPerm = await api("validate", sk3, emailA);
  check(rPerm.status === 200, `validate permanent -> ${rPerm.status}`);
  check(rPerm.json && rPerm.json.permanent === true, "validate reports permanent");

  console.log("\n-- EXPIRED key --");
  const sk4 = generateAccessKey();
  const created4 = { ...created1, label: "TEST-diagnose-expired", expires_at: new Date(Date.now() - 60_000).toISOString(), redemption_expires_at: new Date(Date.now() - 60_000).toISOString(), code: hashAccessKey(sk4), hash: hashAccessKey(sk4), last4: last4(sk4) };
  if (useDb) await dbInsertKey(created4);
  const rExp = await api("validate", sk4, emailA);
  check(rExp.status >= 400, `validate expired -> ${rExp.status}`);

  console.log("\n-- REDEEM (action=bind) unbound key --");
  const sk5 = generateAccessKey();
  const created5 = { ...created1, label: "TEST-diagnose-bind", code: hashAccessKey(sk5), hash: hashAccessKey(sk5), last4: last4(sk5) };
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
    await client?.end().catch(() => {});
  }
}

process.exit(failed > 0 ? 1 : 0);

