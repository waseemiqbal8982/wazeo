# 🔐 Wazeo — Environment Variable Checklist

Only variable **names** are listed here (never values). Make sure each exists
in `.env.local` locally and in your hosting platform (Vercel) when deploying.

## Required

| Variable | Where to set | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key | public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key | secret |
| `SUPABASE_DB_URL` | Supabase → Settings → Database → connection string | secret, used by db:setup / checks |
| `ADMIN_EMAILS` | your own list | comma-separated emails allowed to open `/admin` |
| `CRON_SECRET` | your own | guards the cron/process endpoint |

## Optional

| Variable | Notes |
| --- | --- |
| `PROVIDER_API_URL` | SMM provider API base URL |
| `PROVIDER_API_KEY` | SMM provider API key |
| `MERCURY_BASE_URL` / `MERCURY_API_KEY` / `MERCURY_MODEL` | AI assistant endpoint |

## Public (Next.js) — must be prefixed `NEXT_PUBLIC_`

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` — set this in Vercel to your production URL
  (e.g. `https://innvera.shop`) so confirmation-link emails redirect correctly.

## ⚠️ Deploy reminder (Vercel)

- Add `ADMIN_EMAILS` in Vercel → Project → Settings → Environment Variables
  (set your admin email here, otherwise `/admin` will be locked).
- Also add `NEXT_PUBLIC_SITE_URL` and all required secrets above.
