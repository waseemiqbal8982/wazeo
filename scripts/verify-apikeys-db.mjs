import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local"), quiet: true });
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import pg from "pg";

const SEG = () => randomBytes(3).toString("base64").replace(/[^A-Z0-9]/g, "").padEnd(4, "X").slice(0, 4);
const makeKey = () => `WAK-${SEG()}-${SEG()}-${SEG()}-${SEG()}`;
const hashKey = (k) => createHash("sha256").update(k).digest("hex");
const mask = (k) => `WAK-????-????-????-${k.slice(-4)}`;
const safeEq = (a, b) => { const A = Buffer.from(a), B = Buffer.from(b); return A.length === B.length && timingSafeEqual(A, B); };

const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();

const adminRow = await c.query(`select id, email from public.profiles where role='admin' order by created_at limit 1`);
if (!adminRow.rows.length) { console.log("no admin found"); process.exit(0); }
const uid = adminRow.rows[0].id;

const key = makeKey();
const prefix = mask(key);
let insertedId;
try {
  const ins = await c.query(
    `insert into public.api_keys (user_id, name, label, prefix, key_hash, status, uses, expires_at, usage_cap, rate_limit, permissions, features)
     values ($1,$2,$3,$4,$5,'active',0,$6,5,10,'["read"]'::jsonb,'["orders"]'::jsonb) returning id`,
    [uid, "e2e-test", "e2e-test", prefix, hashKey(key), new Date(Date.now() + 86400000).toISOString()]
  );
  insertedId = ins.rows[0].id;
  console.log("inserted id:", insertedId.slice(0, 8), "…");

  const sel = await c.query(`select id, user_id, prefix, key_hash, uses, usage_cap, rate_limit, status from public.api_keys where id=$1`, [insertedId]);
  const r = sel.rows[0];
  const ok =
    r.prefix === prefix &&
    !r.key_hash.includes(key) &&
    safeEq(r.key_hash, hashKey(key)) &&
    Number(r.usage_cap) === 5 &&
    Number(r.rate_limit) === 10 &&
    r.status === "active";
  console.log("db round-trip valid:", ok ? "✅" : "❌");

  const revoked = await c.query(`update public.api_keys set revoked_at=now(), status='revoked' where id=$1 returning revoked_at`, [insertedId]);
  console.log("revoke persisted:", revoked.rows[0].revoked_at ? "✅" : "❌");

  const hidden = await c.query(`select (api_keys.key_hash is not null) as has_hash, (api_keys.prefix is not null) as has_prefix, (api_keys.key_hash like '%'||$1||'%') as leaked from public.api_keys where id=$2`, [key, insertedId]);
  console.log("no plaintext leak:", hidden.rows[0].leaked === false ? "✅" : "❌");
} finally {
  if (insertedId) { await c.query(`delete from public.api_keys where id=$1`, [insertedId]); console.log("cleanup done"); }
  await c.end();
}
