-- ============================================================
-- Wazeo — pg_cron + pg_net scheduler for organic engine edge functions
-- Paste into Supabase SQL Editor and Run AFTER deploying the edge functions
-- and configuring their env vars (see APPLY.md).
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Optional: store the service-role key in Vault for future DB-level ops.
-- (The edge functions read their own SUPABASE_SERVICE_ROLE_KEY env secret.)
-- INSERT INTO vault.secrets (name, secret)
-- VALUES ('service_role_key', '<YOUR_SERVICE_ROLE_KEY>')
-- ON CONFLICT (name) DO NOTHING;

-- Configure these two placeholders:
--   <PROJECT_REF>  -> your Supabase project ref (subdomain in your function URL)
--   <CRON_SECRET>  -> same value you set as CRON_SECRET on the edge functions

-- execute-runs: every 1 minute
select cron.schedule('execute-runs', '* * * * *', $cron$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/execute-runs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body := '{}',
    timeout_milliseconds := 20000
  );
$cron$);

-- check-status: every 10 minutes
select cron.schedule('check-status', '*/10 * * * *', $cron$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/check-status',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body := '{}',
    timeout_milliseconds := 20000
  );
$cron$);

-- sync-balances: every 5 minutes
select cron.schedule('sync-balances', '*/5 * * * *', $cron$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/sync-balances',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body := '{}',
    timeout_milliseconds := 20000
  );
$cron$);

-- sync-services: every 6 hours
select cron.schedule('sync-services', '0 */6 * * *', $cron$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/sync-services',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body := '{}',
    timeout_milliseconds := 60000
  );
$cron$);

-- risk-monitor: every 5 minutes
select cron.schedule('risk-monitor', '*/5 * * * *', $cron$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/risk-monitor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body := '{}',
    timeout_milliseconds := 20000
  );
$cron$);

-- Inspect scheduled jobs:
-- select * from cron.job;
