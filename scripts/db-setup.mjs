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
  console.error("❌ SUPABASE_DB_URL missing. Add it to .env.local (Project Settings -> Database -> Connection string).");
  process.exit(1);
}

const sqlPath = path.join(__dirname, "..", "supabase", "ALL_IN_ONE.sql");
const sql = await readFile(sqlPath, "utf8");

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

await client.connect();

try {
  await client.query("BEGIN");
  await client.query(sql);
  // ensure storage bucket (in case SQL didn't create it)
  await client.query(
    `insert into storage.buckets (id, name, public) values ('payments','payments',false) on conflict (id) do nothing`
  );
  await client.query("COMMIT");
  console.log("✅ DB setup complete. All tables, triggers and functions are ready.");
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("❌ SQL error:");
  console.error(e.message);
  const m = String(e.message || "").match(/position (\d+)/i);
  if (m) {
    const pos = parseInt(m[1], 10);
    const before = sql.slice(0, pos);
    const lineno = before.split("\n").length;
    const lineStart = before.lastIndexOf("\n") + 1;
    const lineEnd = sql.indexOf("\n", lineStart);
    const line = sql.slice(lineStart, lineEnd === -1 ? sql.length : lineEnd);
    console.error(`Near line ${lineno}: ${line.trim()}`);
  }
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
