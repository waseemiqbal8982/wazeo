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
- **Variables** me `DEPLOYMENT_URL` add karo (aapka Vercel URL, jaise `https://wazeo.vercel.app`).

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

## 🔬 Organic engagement engine — setup, tests & risk tuning

This section documents the organic delivery engine (`lib/organic/`), its acceptance
suite, and how to tune risk weights. It is the "how to tune risk weights" reference.

### What it is
Given an order (views/likes/comments/… + preset + window), the engine produces a
deterministic, guardrail-compliant micro-step plan and a risk score. The curve
shape (density of weighted skewed bumps → cumulative → diurnal hour weights) is
reusable everywhere via the `<CurveChart />` component.

### Constants live in the DB (`risk_config`)
Every numeric tunable is mirrored in the `public.risk_config` table (seeded by
`supabase/schema_v17.sql`, applied via `npm run db:setup`). Keys:
- `hard_caps` — max micro-steps / events / chart points, gap & end-dump & slow-start limits, placement ceiling.
- `risk_weights` — the scoring weights (see below).
- `session_types`, `timing_views`, `variance_views` — session probabilities, timing jitter, variance/spike caps.
- `hour_multipliers`, `weekday_multipliers` — diurnal masks.
- `risk_bands` — band boundaries (high ≤15, medium ≤25, low ≤35, safe >35) + design target (22).

The TypeScript engine reads the same defaults from `lib/organic/types.ts`; the DB
seed mirrors them so server-side code can tune them without a deploy.

### Run the tests
```bash
npm run test:organic     # engine smoke (13 assertions)
npm run test:acceptance  # full 10-point acceptance suite (82 assertions)
npm run lint
npm run build
npm run check
```

### Acceptance criteria (green)
1. Every preset, qty ≥ 100, window ≥ 2h → estimated score ≤ 30 ✅
2. Risk estimator deterministic for same plan + seed ✅
3. No crafted plan can violate a guardrail (validator + scorer + planner share the same window-relative rules) ✅
4. No slice below 1; none above 20% of total ✅
5. Engagement rate sits in the 2–6% band (score penalizes out-of-band) ✅
6. Chart points never exceed the cap (1500) ✅
7. Router excludes underfunded providers; failover-safe (empty when none can afford) ✅
8. Every reference route has a panel equivalent ✅
9. Mobile: shared responsive AppShell + `npm run check:layout` ✅
10. `npm run build` → zero errors ✅

### How to tune risk weights
Edit the `risk_weights` JSONB row in `public.risk_config`. Weight meaning
(lower = plan survives, higher = risk score rises):

| Key | Effect |
|---|---|
| `maxSliceFractionCap` | cap on the largest-slice penalty (default 22) |
| `flatGapPenalty` | penalty for a > allowed gap while >5% target remains |
| `endDumpPenalty` | penalty for final-10% holding ≥25% |
| `engagementDeviation` | penalty for engagement ratio outside 2–6% |
| `firstHourPenalty` | penalty when first-hour delivery exceeds the slow-start ceiling |
| `offHoursPenalty` / `roundNumberPenalty` / `serviceQualityPenalty` | dead-hour, round-number, low provider-quality penalties |
| `organicBase` + `*ChanceWeight` + `microStepsWeight` | organic "naturalness" baseline and shape bonus (higher = more organic) |

Rule of thumb:
- **Wants orders to pass more easily** → lower `maxSliceFractionCap`, `firstHourPenalty`, `endDumpPenalty`.
- **Stricter risk screening** → raise those same keys and lower `organicBase`.
- **Feel the curve is too "flat"** → raise `burstChanceWeight` / `dipChanceWeight` and check the preset params.
- The **design target is 22** — the engine re-rolls seeds until risk ≤ 22 when possible (`generateOrganicPlan`).

After editing the DB row, restart the server (or re-run the engine) — the seeded
defaults in `types.ts` are the fallback if `risk_config` is unreachable.

### Deploy
```bash
npm run db:setup                # applies ALL_IN_ONE.sql incl. risk_config
npm run build                   # must be green
# Vercel: import this repo, set env vars:
#   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL
```
`vercel.json` uses the Next.js framework preset (do **not** add an SPA catch-all
rewrite to `index.html` for a Next.js app — it would shadow every route).

