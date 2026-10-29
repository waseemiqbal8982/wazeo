import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });
import { createHash, randomBytes } from "node:crypto";
import pg from "pg";

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("❌ SUPABASE_DB_URL missing");
  process.exit(1);
}

const SEG = () =>
  randomBytes(3)
    .toString("hex")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .padEnd(4, "X")
    .slice(0, 4);
const key = `WZ-${SEG()}-${SEG()}-${SEG()}`;
const hashKey = (k) => createHash("sha256").update(k).digest("hex");

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  // 1) profiles columns
  const { rows: pcols } = await client.query(
    `select column_name from information_schema.columns where table_schema='public' and table_name='profiles' order by ordinal_position`
  );
  const p = pcols.map((r) => r.column_name);
  const neededP = ["access_expires_at", "plan", "features", "access_key_id"];
  console.log("profiles columns:", p.join(", "));
  console.log("profiles REQUIRED missing:", neededP.filter((c) => !p.includes(c)).length ? JSON.stringify(neededP.filter((c) => !p.includes(c))) : "NONE ✅");

  // 2) exact self-mode insert from the route
  const created = {
    email: "keygen-verify@example.com",
    label: "verify",
    note: "",
    mode: "self",
    code: hashKey(key),
    hash: hashKey(key),
    last4: key.slice(-4),
    expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    access_days: 30,
    plan_name: "Standard",
    features: [],
    redemption_expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    usage_limit: 1,
    starting_balance: 0,
    active: true,
  };
  const cols = Object.keys(created).map((c) => `"${c}"`).join(", ");
  const ph = Object.keys(created).map((_, i) => `$${i + 1}`).join(", ");
  const vals = Object.values(created);
  const ins = await client.query(`insert into public.access_codes (${cols}) values (${ph}) returning id, last4`, vals);
  console.log("✅ self-mode INSERT ok -> id:", ins.rows[0].id, "last4:", ins.rows[0].last4);

  // cleanup
  await client.query(`delete from public.access_codes where id = $1`, [ins.rows[0].id]);
  console.log("cleanup done.");
} catch (e) {
  console.error("❌ verification error:", e.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
