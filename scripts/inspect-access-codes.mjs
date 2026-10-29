import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });
import pg from "pg";
const { Client } = pg;

const required = [
  "id", "code", "hash", "last4", "email", "label", "note", "mode",
  "active", "revoked", "expires_at", "usage_limit", "uses",
  "starting_balance", "created_at", "access_days", "plan_name",
  "features", "redemption_expires_at", "used_by", "used_at",
  "must_change_password",
];

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("❌ SUPABASE_DB_URL missing in .env.local");
  process.exit(1);
}

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  const { rows } = await client.query(
    `select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = 'access_codes' order by ordinal_position`
  );
  const cols = new Set(rows.map((r) => r.column_name));
  console.log("access_codes columns (" + rows.length + "):");
  for (const r of rows) console.log("  -", r.column_name, `(${r.data_type})`);
  const missing = required.filter((c) => !cols.has(c));
  console.log("\nREQUIRED columns missing:", missing.length ? JSON.stringify(missing) : "NONE ✅");
  // quick row count
  const cnt = await client.query(`select count(*)::int as n from public.access_codes`);
  console.log("total access_codes rows:", cnt.rows[0].n);
} catch (e) {
  console.error("❌ DB error:", e.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
