# Edge functions (OPTIONAL)

The Wazeo app runs fully **without** any Supabase edge function deployed.
All scheduled work is handled by:

- The Next.js cron routes (`/api/cron/process`, `/api/cron/balance`) — server-side.
- The GitHub Actions workflow (`.github/workflows/cron.yml`) which triggers those routes with `CRON_SECRET`.

The files in this folder are kept only as reference/optional implementations. You do **not**
need to deploy them. If you choose to, you must deploy them yourself from the Supabase Dashboard
(SQL Editor / Functions) — they are not wired into the app and the app never calls them.
