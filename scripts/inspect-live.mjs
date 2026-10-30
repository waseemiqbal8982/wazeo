import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });
import pg from "pg";

const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();

const acc = (await c.query("select column_name from information_schema.columns where table_schema='public' and table_name='access_codes' order by ordinal_position")).rows.map((r) => r.column_name);
console.log("access_codes columns:", acc.join(", "));

const apk = (await c.query("select column_name from information_schema.columns where table_schema='public' and table_name='api_keys' order by ordinal_position")).rows.map((r) => r.column_name);
console.log("api_keys columns:", apk.join(", ") || "(table missing)");

const keys = (await c.query("select id,email,label,mode,active,revoked,suspended,uses,last4,created_at,expires_at,redemption_expires_at,access_days,plan_name from public.access_codes order by created_at desc limit 12")).rows;
console.log("---- access_codes recent ----");
for (const k of keys) {
  console.log(
    JSON.stringify({
      id: k.id.slice(0, 8),
      emailDomain: k.email ? k.email.split("@")[1] : null,
      label: k.label,
      mode: k.mode,
      active: k.active,
      revoked: k.revoked,
      suspended: k.suspended,
      uses: k.uses,
      last4: k.last4,
      created: k.created_at,
      expires: k.expires_at,
      redempt: k.redemption_expires_at,
      days: k.access_days,
      plan: k.plan_name,
    })
  );
}

const s = (await c.query("select key,value from public.settings where key in ('invite_only','require_key_email_verify','require_email_verify_at_signup') order by key")).rows;
console.log("settings:", JSON.stringify(s));

const el = (await c.query("select level,source,message,created_at from public.error_logs where created_at > now() - interval '48 hours' order by created_at desc limit 15")).rows;
console.log("error_logs(last48h):", JSON.stringify(el.map((e) => ({ level: e.level, source: e.source, msg: String(e.message || "").slice(0, 120), at: e.created_at }))));

const policies = (await c.query("select tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where tablename in ('access_codes','api_keys') order by tablename,policyname")).rows;
console.log("policies(access_codes/api_keys):", JSON.stringify(policies));

await c.end();
