import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });
import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GREEN = "\x1b[32m", RED = "\x1b[31m", YEL = "\x1b[33m", RESET = "\x1b[0m";
const ok = (m) => console.log(`${GREEN}✔${RESET} ${m}`);
const bad = (m) => console.log(`${RED}✘${RESET} ${m}`);
const warn = (m) => console.log(`${YEL}!${RESET} ${m}`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const role = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.SUPABASE_DB_URL;

const where = {
  NEXT_PUBLIC_SUPABASE_URL: "Supabase → Settings → API → Project URL",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "Supabase → Settings → API → anon/publishable key",
  SUPABASE_SERVICE_ROLE_KEY: "Supabase → Settings → API → service_role secret",
  SUPABASE_DB_URL: "Supabase → Settings → Database → Connection string → URI (transaction pooler)",
};

console.log("\n=== WAZEO SETUP CHECK ===\n");

// 1) Env vars
console.log("→ Env variables");
let envOk = true;
for (const [k, fix] of Object.entries(where)) {
  if (!process.env[k]) {
    bad(`${k} missing. Fix: paste it in .env.local (${fix}).`);
    envOk = false;
  } else {
    ok(`${k} ✓`);
  }
}

// 1.5) Admin allowlist
if (!process.env.ADMIN_EMAILS) {
  warn("ADMIN_EMAILS missing - add comma-separated admin emails in .env.local (and Vercel). /admin stays locked.");
} else {
  ok("ADMIN_EMAILS present");
}

// 2) Supabase reachable + keys
const admin = url && role ? createClient(url, role, { auth: { persistSession: false } }) : null;

if (url) {
  try {
    const r = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
      headers: { apikey: anon || "", Authorization: `Bearer ${anon || ""}` },
    });
    ok("Supabase URL reachable");
    if (r.status === 401) warn("Anon key not accepted (double check the publishable key).");
    else if (r.status < 500) ok("Anon key accepted");
    else bad(`Anon key check failed HTTP ${r.status}`);
  } catch {
    bad("Supabase URL not reachable. Fix: check internet / URL correctness.");
  }
} else if (anon) {
  try {
    await fetch(`https://${anon.split(".")[0]}.supabase.co/rest/v1/profiles?select=id&limit=1`);
    ok("Supabase URL reachable (derived)");
  } catch {
    bad("Supabase not reachable.");
  }
}

if (admin) {
  try {
    const { error } = await admin.from("profiles").select("id", { head: true, count: "exact" });
    if (error) bad(`Service role key invalid: ${error.message}`);
    else ok("Service role key valid");
  } catch {
    bad("Service role check failed.");
  }
} else {
  warn("Service role check skipped (key missing).");
}

// 3) Tables exist
const sql = readFileSync(path.join(__dirname, "..", "supabase", "ALL_IN_ONE.sql"), "utf8");
const tables = [...sql.matchAll(/create table if not exists public\.(\w+)/g)].map((m) => m[1]);
const uniqueTables = [...new Set(tables)];

if (admin && uniqueTables.length) {
  console.log("→ Tables");
  for (const t of uniqueTables) {
    const { error } = await admin.from(t).select("id", { head: true, count: "exact" });
    if (error) bad(`Table ${t} missing. Fix: run npm run db:setup`);
    else ok(`Table ${t} ✓`);
  }
} else {
  warn("Table checks skipped (service role key missing).");
}

// 4) RLS (needs DB URL)
console.log("→ Row Level Security");
if (dbUrl) {
  try {
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();
    const all = [...uniqueTables, "notifications", "announcements", "referrals", "favorites"];
    for (const t of [...new Set(all)]) {
      const { rows } = await client.query(
        `select relrowsecurity from pg_class where relname = $1`,
        [t]
      );
      if (rows.length === 0) bad(`Table ${t} not found in DB. Fix: run npm run db:setup`);
      else if (rows[0].relrowsecurity) ok(`RLS ON → ${t}`);
      else bad(`RLS OFF → ${t}. Fix: run npm run db:setup`);
    }
    await client.end();
  } catch (e) {
    bad(`Could not connect with DB URL: ${e.message}`);
  }
} else {
  warn("RLS check skipped (SUPABASE_DB_URL missing).");
}

// 5) Provider mode
console.log("→ Provider");
if (!process.env.PROVIDER_API_URL || !process.env.PROVIDER_API_KEY) {
  warn("Provider in MOCK mode (no keys). Add PROVIDER_API_URL / PROVIDER_API_KEY to go live.");
} else {
  ok("Provider configured (LIVE)");
}

// 6) Mercury
console.log("→ Mercury AI");
if (process.env.MERCURY_BASE_URL && process.env.MERCURY_API_KEY && process.env.MERCURY_MODEL) {
  try {
    const base = process.env.MERCURY_BASE_URL.replace(/\/$/, "");
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 8000);
    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.MERCURY_API_KEY}` },
      body: JSON.stringify({ model: process.env.MERCURY_MODEL, messages: [{ role: "user", content: "hi" }], max_tokens: 20 }),
      signal: c.signal,
    });
    clearTimeout(t);
    if (r.ok) ok("Mercury reachable");
    else warn(`Mercury responded HTTP ${r.status} (fix endpoint/key/model)`);
  } catch {
    warn("Mercury not reachable (ok for now — panel falls back).");
  }
} else {
  warn("Mercury not configured (ok — AI features will use fallback).");
}

// 7) Build
console.log("→ Build");
try {
  execSync("npm run build", { stdio: "pipe" });
  ok("Build passes");
} catch {
  bad("Build failed. Run npm run build to see the error.");
}

console.log(`\n=== DONE (${envOk ? "env OK" : "fix env"}) ===\n`);
