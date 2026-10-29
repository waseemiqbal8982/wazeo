import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });
import pg from "pg";

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("❌ SUPABASE_DB_URL missing");
  process.exit(1);
}
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  const { rows } = await client.query(
    `select table_name from information_schema.tables where table_schema='public' and table_name in ('admin_pins','admin_recovery_codes')`
  );
  console.log("admin tables present:", rows.map((r) => r.table_name).join(", ") || "(none)");
} catch (e) {
  console.error("❌ error:", e.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
