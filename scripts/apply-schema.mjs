import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local"), quiet: true });
import { readFile } from "node:fs/promises";
import pg from "pg";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/apply-schema.mjs <relative-sql-path>");
  process.exit(1);
}
const sql = await readFile(resolve(process.cwd(), file), "utf8");
const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  console.log("✅ applied:", file);
} catch (e) {
  console.error("❌ SQL error:", e.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
