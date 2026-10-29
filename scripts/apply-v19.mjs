import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error("❌ SUPABASE_DB_URL missing. Add it to .env.local");
  process.exit(1);
}

const sqlPath = path.join(__dirname, "..", "supabase", "schema_v19.sql");
const sql = await readFile(sqlPath, "utf8");

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  await client.query("BEGIN");
  await client.query(sql);
  await client.query("COMMIT");
  console.log("✅ schema_v19 applied.");
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("❌ SQL error:", e.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
