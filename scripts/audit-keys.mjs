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

const q = async (label, sql) => {
  try {
    const { rows } = await client.query(sql);
    console.log(`\n=== ${label} ===`);
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.log(`\n=== ${label} === ERROR: ${e.message}`);
  }
};

try {
  await q(
    "KEY TABLES",
    `select t.tablename, p.relrowsecurity as rls
     from pg_tables t
     join pg_class p on p.relname = t.tablename
       and p.relnamespace = (select oid from pg_namespace where nspname='public')
     where t.schemaname='public'
       and t.tablename in ('api_keys','access_codes','providers','provider_logs','audit_logs')
     order by t.tablename`
  );

  await q(
    "api_keys columns",
    `select column_name, data_type, is_nullable
     from information_schema.columns
     where table_schema='public' and table_name='api_keys'
     order by ordinal_position`
  );

  await q(
    "api_keys row count",
    `select count(*)::int as n from public.api_keys`
  );

  await q(
    "access_codes columns",
    `select column_name, data_type, is_nullable
     from information_schema.columns
     where table_schema='public' and table_name='access_codes'
     order by ordinal_position`
  );

  await q(
    "access_codes rows (safe fields)",
    `select id, email, label, mode, active, revoked, uses, last4,
            created_at, expires_at, used_at, starting_balance,
            access_days, plan_name, features, must_change_password
     from public.access_codes order by created_at desc limit 30`
  );

  await q(
    "providers columns",
    `select column_name, data_type, is_nullable
     from information_schema.columns
     where table_schema='public' and table_name='providers'
     order by ordinal_position`
  );

  await q(
    "providers rows (safe/masked)",
    `select id, name, api_url, api_format, status, active, priority,
            balance, balance_stale, concurrency_cap, low_balance_threshold,
            case when api_key_enc is not null then 'encrypted' else 'none' end as key_storage,
            (api_key is not null) as has_plaintext_key
     from public.providers order by priority asc`
  );

  await q(
    "audit_logs key-related recent",
    `select action, created_at from public.audit_logs
     where action ilike '%key%' or action ilike '%provider%' or action ilike '%invite%'
     order by created_at desc limit 40`
  );

  await q(
    "provider_logs recent",
    `select provider_id, action, ok, http_status, retries, duration_ms, error,
            created_at
     from public.provider_logs order by created_at desc limit 25`
  );
} catch (e) {
  console.error("❌ fatal:", e.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
