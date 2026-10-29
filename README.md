# Wazeo — SMM Panel

Wazeo ek premium SMM panel hai (Instagram, TikTok, YouTube). Ye Next.js (App Router) + TypeScript + Tailwind + Supabase + Framer Motion + Chart.js pe bana hai.

## Chalane ka tareeqa (local)

1. Node.js 20+ install karo: https://nodejs.org
2. Project folder me terminal kholo aur ye chalao:
   ```
   npm install
   npm run dev
   ```
3. Browser me kholo: http://localhost:3000

## Supabase setup

1. https://supabase.com par project banao.
2. **SQL Editor** me `supabase/schema.sql` paste karo → Run.
3. **SQL Editor** me `supabase/schema_v2.sql` paste karo → Run.
4. **Project Settings → API** se keys copy karo aur `.env.local` me dalo:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=publishable_key
   SUPABASE_SERVICE_ROLE_KEY=secret_key
   ```
   - `SUPABASE_SERVICE_ROLE_KEY` secret hai — GitHub/browser me kabhi mat dalna.

## Provider (SMM API) & AI

`.env.local` me:
```
PROVIDER_API_URL=https://your-provider.com/api/v2
PROVIDER_API_KEY=your_key
MERCURY_BASE_URL=https://api.mercury.ai/v1
MERCURY_API_KEY=your_key
MERCURY_MODEL=model-name
CRON_SECRET=koi-lamba-random-string
```
- Agar `PROVIDER_API_URL`/`PROVIDER_API_KEY` khali hain to **Mock mode** chalega (fake services/statuses) — test karne ke liye perfect. Admin me "Mock mode" badge dikhta hai.
- `CRON_SECRET` apne worker endpoint ko protect karta hai.

## GitHub pe push karna

```
git init
git add .
git commit -m "Initial Wazeo"
git branch -M main
git remote add origin https://github.com/USERNAME/wazeo.git
git push -u origin main
```

## Vercel deploy (free)

1. https://vercel.com → **Add New Project** → apna GitHub repo choono.
2. Build default rehne do (framework Next.js).
3. **Environmental Variables** me ye sab add karo (project settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PROVIDER_API_URL`
   - `PROVIDER_API_KEY`
   - `MERCURY_BASE_URL`
   - `MERCURY_API_KEY`
   - `MERCURY_MODEL`
   - `CRON_SECRET`
4. **Deploy** dabao.

## GitHub Actions secret (cron ke liye)

GitHub repo me **Settings → Secrets and variables → Actions** kholo:
- **Secrets** me `CRON_SECRET` add karo (wohi value jo `.env.local` me hai).
- **Variables** me `DEPLOYMENT_URL` add karo (aapka Vercel URL, jaise `https://innvera.shop`).

Phir `.github/workflows/cron.yml` har 5 minute me `/api/cron/process` call karega (drip-feed worker).

## Apne account ko admin banana (bas 1 SQL line)

Supabase **SQL Editor** me ye chalao (pehle signup karo, phir):
```sql
update public.profiles set role = 'admin' where username = 'AapKaUsername';
```
Ya email se:
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'aap@email.com');
```

## Pages

- `/` — landing
- `/sign-up`, `/sign-in`, `/forgot-password`, `/reset-password`
- `/dashboard` — user area (sidebar / mobile bottom bar)
- `/dashboard/new-order`, `/orders`, `/orders/[id]`, `/services`, `/add-funds`, `/tickets`, `/settings`
- `/admin` — admin panel (sirf admin)
- `/terms`, `/refund-policy`

## Important notes

- Order place hone par balance **atomically** kaata jata hai (balance negative nahi ho sakta).
- Instant order me agar provider call fail ho jaye to **auto-refund** hota hai.
- Drip-feed order ka schedule `lib/schedule.ts` se banta hai.
- Provider integration `lib/provider.ts` me hai (mock fallback ke sath).

---

## 🔬 Delivery scheduling engine — setup & tests

The delivery scheduling engine (`lib/organic/`) spreads an order across a chosen
delivery window using one of four simple curves (Steady, Slow start, Bell peak,
Natural wave) plus a natural-variation slider. It produces a deterministic
micro-step plan (the ordered quantity is split into slices delivered over time).
It does **not** attempt to score or estimate how "natural" or "safe" traffic looks;
it is plain scheduling only.

This section documents the delivery engine and its acceptance suite.

### What it is
Given an order (views/likes/comments/… + curve + window), the engine produces a
deterministic micro-step plan and a curve preview. The curve shape (density of
weighted skewed bumps → cumulative → diurnal hour weights) is reusable everywhere
via the `<CurveChart />` component.

### Run the tests
```bash
npm run test:acceptance  # acceptance suite
npm run lint
npm run build
npm run check
```

### Acceptance criteria (green)
1. Every preset + window produces a non-empty plan ✅
2. Deterministic for the same seed ✅
3. No slice below 1; none above 20% of total ✅
4. Chart points / micro-steps never exceed caps ✅
5. Router excludes underfunded providers; failover-safe ✅
6. Every reference route has a panel equivalent ✅
7. Mobile: shared responsive AppShell + `npm run check:layout` ✅
8. `npm run build` → zero errors ✅

### Deploy
```bash
npm run db:setup                # applies ALL_IN_ONE.sql (incl. schema_v18 drop of risk_config)
npm run build                   # must be green
# Vercel: import this repo, set env vars:
#   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL
```
`vercel.json` uses the Next.js framework preset (do **not** add an SPA catch-all
rewrite to `index.html` for a Next.js app — it would shadow every route).

