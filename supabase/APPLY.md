# APPLY — manual (no CLI) instructions

This project's backend artifacts are written to be applied directly from the
Supabase Dashboard without a CLI (`supabase` is NOT installed locally; `supabase
db push` / `supabase functions deploy` were attempted and reported — see bottom).

Everything below is paste-ready.

---

## 1. Apply the migration (schema)

1. Supabase Dashboard → **SQL Editor** → **+ New query**.
2. Paste the contents of `supabase/migrations/20261028000001_organic_engine.sql`.
3. Click **Run**.
4. Verify: the tables `engagement_orders`, `engagement_order_items`,
   `organic_run_schedule` exist (Table Editor), each with RLS enabled
   (toggle on in the table settings) and the policies created.

## 2. Deploy the edge functions

For each folder under `supabase/functions/`:
`execute-runs`, `check-status`, `sync-balances`, `sync-services`, `risk-monitor`:

1. Supabase Dashboard → **Edge Functions** → **Create a new function**.
2. Give it the same name as the folder, select its `index.ts`, **Deploy**.
   (Or use `supabase functions deploy <name>` if you ever install the CLI.)
3. **Edge Functions → (function) → Settings → Environment variables** — set these
   secrets on EVERY function:
   - `SUPABASE_SERVICE_ROLE_KEY` = your service-role key (keep secret)
   - `CRON_SECRET` = a shared secret string (same value used in cron.sql)
   - `PROVIDER_API_URL` / `PROVIDER_API_KEY` = optional; leave blank for mock mode

## 3. Schedule the cron jobs

1. Supabase Dashboard → **SQL Editor** → **+ New query**.
2. Open `supabase/cron.sql`, replace the two placeholders:
   - `<PROJECT_REF>` → the ref in your function URL
     (`https://<PROJECT_REF>.functions.supabase.co/...`)
   - `<CRON_SECRET>` → the same secret you set on the functions
3. Paste and **Run**.
4. Verify with:
   ```sql
   select jobid, jobname, schedule, active from cron.job;
   ```
   You should see the five jobs: `execute-runs` (1m), `check-status` (10m),
   `sync-balances` (5m), `sync-services` (6h), `risk-monitor` (5m).

## 4. Place a real organic order (test the persistence gap)

1. Sign in at the app, open **Dashboard → Organic Engagement**.
2. Paste a link, pick engagement/window/preset, click **Continue to Place Order**.
3. The button now POSTs to `/api/organic/place`, which inserts one row in
   `engagement_orders`, per-type rows in `engagement_order_items`, and the micro-run
   timeline in `organic_run_schedule` (with server-side guardrail enforcement).
4. Verify the row:
   ```sql
   select id, user_id, preset_id, status, risk_score, total_qty, created_at
   from public.engagement_orders order by created_at desc limit 5;
   ```

## 5. RLS policy test (two users)

1. As user A, insert an organic order (Step 4). 
2. As user B, `select` from `engagement_orders` — they must see ZERO of A's rows.
3. As the admin (role='admin'), `select` — the admin must see ALL rows.

---

## CLI attempt report

- `supabase db push` → **NOT run**: the `supabase` CLI is not installed on this
  machine (`supabase: The term 'supabase' is not recognized`). Use the SQL Editor
  paste flow (Step 1).
- `supabase functions deploy` → **NOT run**: same reason. Use the Edge Functions
  editor (Step 2) or install the CLI.
