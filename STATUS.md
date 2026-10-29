# 📊 STATUS — Wazeo (Stage 0 audit)

## Update (prompt 31 — Item 1 light mode visibility, PARTIAL)
- Tag `stable-before-prompt31` created + pushed.
- **Light palette rebuilt** (`app/globals.css`): full semantic token set for light — surface levels, text levels, border + `--border-input`, divider, icon, chart (grid/tooltip), focus ring, overlay, status tokens. Adjusted to WCAG AA (4.5:1 text, 3:1 essential borders/icons). Light glass uses stronger tints + borders; shadows replace glow.
- **Neutral theme** added (dark + light accent) and registered in `THEMES`, preload list, and chart/theme surfaces.
- **Three-way mode (Light/Dark/Auto):** `ThemeProvider` now stores a preference incl. `auto` and resolves against the system via `matchMedia` (listener updates live). The inline preload script resolves `auto` *before first paint* → no theme flash. Persisted in localStorage + cookie. UI: shared `ThemeModeToggle` (segmented) wired into AppShell; HomeHeader icon button cycles dark→light→auto.
- **Charts:** `ChartShell` uses token-driven gridlines/tooltip bg-text/border, surface card, and status colors — readable in light; distinguishable series retained.
- **Inputs/chips/badges:** read `--input-bg`, `--border-input`, `--placeholder`, `--surface-2`, and status tokens (contrast-safe in light/dark).
- **`npm run test:contrast`:** added harness (`scripts/test-contrast.mjs`) = Playwright + axe-core `color-contrast` + custom input-border (3:1) checks over landing/sign-in/dashboard/orders/services/wallet/support/settings/admin pages × all themes × light/dark; `CONTRAST_FAST=1` for a quick smoke run. The full audit run is defined; completing it to zero across every combo requires a stable env/network (Supabase realtime/live connections stall `networkidle`), so it is recorded as PARTIAL this session. Lint 0 errors, build pass.

## Update (prompt 30 — Item 2 key generation fixed)
- **Root cause:** the admin "Generate keys" API skipped every input that lacked a valid email (`if (!email || !regex) continue;`). So a form with zero required fields returned zero keys (looks like a silent "generation error"). `db:setup` still fails on the pre-existing `engagement_orders` reference (recorded), so the API was verified by code inspection + test suite.
- **Fix:** email now optional → empty email creates an unbound key (binds on first use). Invalid non-empty emails are logged to `error_logs` (source=admin/keys) + audit/logs.
- **Defaults when empty:** access 30 days, plan "Standard", redemption valid 30 days, starting balance 0, mode self.
- **UI rebuilt:** big "Generate key" button on top, optional fields in an "Advanced options" accordion, quick chips for 7/30/90/365 days and Permanent, key shown once with Copy + "Copy ready-to-send message" (unbound email text handled).
- **Checks:** `npm run test:key` 35/35 pass (empty-form defaults + bulk); `npm run lint` 0 errors; `npm run build` pass.

## Update (prompt 30 — Item 1 admin lockout rescue + admin security, PARTIAL)
- Tag `stable-before-prompt30` created + pushed.
- **Rescue `npm run admin:reset-2fa`:** service-role script that removes every Supabase MFA factor (auth.admin.mfa listFactors/deleteFactor), clears the own `admin_2fa` row (enabled=false) and sets `require_admin_2fa=false`. No-arg uses first `ADMIN_EMAILS`; falls back to first role='admin' profile. **RAN + confirmed** (admin_2fa enabled rows = 0). This unlocks the owner who was locked out by a mistaken 2FA enable.
- **Email/TOTP 2FA hidden & disabled by default** — the old enable/disable card in AdminSystem was replaced with a note pointing to Admin PIN.
- **Admin PIN system (new):** 6–8 digit PIN stored as salted scrypt slow hash (`lib/adminPin.ts`). API routes: `/api/admin/pin` (status/setup), `/api/admin/pin/verify`, `/api/admin/pin/confirm`. `proxy.ts` enforces the PIN once per device session and again after 12h inactivity (cookie timestamp). 5 wrong tries lock the PIN screen 15 minutes per user (in DB). No email is ever sent for the PIN.
- **Recovery:** enabling the PIN generates 8 one-time codes (shown once, stored hashed); setup completes only after the admin types one valid code back (then consumed). `npm run admin:reset-pin -- [email]` (service role) clears PIN + codes.
- **Checks:** `npm run lint` 0 errors; `npm run build` pass; `npm run test:adminsec` 24/24 pass.
- Still pending: optional switches UI/audit wiring (trusted devices, admin login alerts, country allowlist — settings keys seeded).

## Update (prompt 28 — Items 4 & 5, PARTIAL)
- **Item 4:** custom desktop cursor `components/Cursor.tsx` mounted in root layout. Enabled only for `(hover:hover) and (pointer:fine)` and not reduced motion. One requestAnimationFrame loop, transform-only movement with easing, pointer-events none, native cursor kept. Re-colors to the active accent, grows/colours over buttons & links, becomes a text-bar over inputs, shrinks on press, small ripple on click, pauses while the tab is hidden. Glass tokens (`--glass-*`, `.glass-strong`, `.glass-glow`, `--glow`) already exist in globals.css and are applied to the pill / More sheet / modals / dropdowns.
- **Item 5:** Button click ripple (transform/opacity only; respects reduced motion and `pointer:fine`), new animated `Toggle` switch (`components/ui/Toggle.tsx`), existing press-scale feedback.
- Checks: `npm run lint` 0 errors; `npm run build` pass.

## Update (prompt 28 — Item 3 chart module, PARTIAL)
- **Shared chart module** `components/charts/ChartShell.tsx` added (Chart.js + react-chartjs-2, client component). Theme-aware: reads `--accent`/`data-mode` at render; 8-accent palette + light. Features: responsive down to 320px, smooth draw-in animation, index crosshair/rich tooltips, clickable legend (hide/show series), date-range chips, compare-with-previous % delta, drag-to-zoom with Reset, PNG + CSV export, skeleton + empty state with zero baseline ("Your chart will grow with your first order"), and a pulsing "Live" badge with a 20s poll that pauses while the tab is hidden. No scores/risk indicators.
- **Wired into Admin Overview** `/admin` with real order data: "Orders per day" (last 7 days, line) + "Order status" (bar).
- Checks: `npm run lint` 0 errors; `npm run build` pass.
- Remaining for Item 3: wire the rest of admin charts (revenue vs profit, new users, signup funnel, users-by-country flags, platform split, top services, deposits per method, provider failure rate, tickets over time, keys generated vs used) and customer charts (views/likes per platform tabs, spend, planned vs delivered), plus Supabase Realtime subscription.

## Update (prompt 28 — Item 1 mobile shell, PARTIAL)
- Tag `stable-before-prompt28` created + pushed.
- **Floating pill bottom nav** (admin + customer, phones <768px): replaced the old edge-to-edge attached bar with a centered, floating, fully-rounded glass pill — `inset-x-3`, `max-w-[420px]`, bottom gap `max(12px, env(safe-area-inset-bottom))`, accent-glow shadow + backdrop blur. A glowing active indicator glides between items (framer `layoutId`). The pill hides while any input is focused (Focus listener) and returns on blur. Main content already carries `pb-28` so nothing hides behind the pill.
- **More bottom sheet** upgraded: search box that filters the grouped admin menu, regrouped into Operations / Customers / Money / Content / System with large (64px+) tap targets; closes on navigation and clears search.
- **Slim glass top header**: mobile logo, page title, admin Ctrl+K search, wallet/currency, theme, a new notifications bell (with dropdown) and the avatar menu.
- **check:layout** extended: now fails if the phone nav stretches edge-to-edge (`inset-x-0 bottom-0`) or if the pill is missing the centered/cap/gap gates; `npm run check:layout` passes. `npm run lint` 0 errors; `npm run build` pass.
- **Still pending for Item 1:** the full per-page 320–430px mobile CSS audit (tables→cards, filters bottom-sheet, sticky save/bulk bars, no horizontal scroll, safe-area modals/drawers, RTL) across every admin page, and real-device verification of the pill at 320/360/390/430/768/1024/1280 px.

## Update (prompt 27 — public site + home page + admin content)
- Tag `stable-before-prompt27` created + pushed.
- **Home page rebuilt** (server-rendered, mobile-first): sticky header with animated logo/menu/lang/currency/dark-toggle, hero with morphing example delivery curve + platform chips, live DB numbers with count-up and admin-editable hide thresholds, how-it-works, services showcase with real per-platform "from" prices, honest feature grid, interactive "example" delivery demo, reviews carousel (only approved reviews; empty-state + guarantee when none; average only when ≥5 approved), trust section with real support channels + hours, admin-editable FAQ accordion, anonymized real-order ticker (hidden under 10 in 7 days), per-visit random accent theme (saved after first choice).
- **Logo / back nav / access:** logo links home everywhere; back arrow + Home on auth pages and public sub-pages (44px tap targets); mobile floating Sign in/Dashboard button (doesn't overlap ContactFab).
- **Public pages added:** /services (searchable price list + platform filters + currency switcher), /pricing, /how-it-works, /faq, /tracker (by order ID, no personal data), /api-docs, /about, /owner. Terms/Privacy/Refund labelled as templates. sitemap.xml + public/robots.txt + OpenGraph/twitter metadata.
- **Admin > Content (`/admin/cms`)**: home section toggles + editable headline, reviews moderation (approve/hide/delete), FAQ manager, footer links, counter thresholds. All saves write `audit_logs`.
- **Reviews table added** (`reviews`): RLS — customers create only for their own completed orders; public reads only approved. "Rate this order" (1–5 stars, text, show-first-name) on completed orders. Applied to live DB via new migration `20261029000002_public_home_reviews.sql`.
- **Item 7:** cookie notice, Share Wazeo (referral link), "Why gradual delivery" explainer, dark/light toggle, status strip (maintenance/provider issue only).
- **Checks:** `npm run lint` 0 errors; `npm run build` pass; `i18n:check` pass; `check` pass (RLS ON); `check:layout` pass.
- **Still to do (manual / later):** push all new home/public UI text into the 5 locale files (currently hardcoded English); install Chrome + run Lighthouse CLI for real scores; full `db:setup` still fails on the pre-existing organic-era `engagement_orders` reference (schema applied via targeted migration instead).


## Update (prompt 26 — Item 1: users stay signed in)
- Tag `stable-before-prompt26` created + pushed.
- **Root cause:** auth cookies were written as session cookies (no long maxAge)
  and the browser client didn't explicitly enable `persistSession`/`autoRefreshToken`;
  there was no "Stay signed in" (default ON) control, so sessions were dropped on
  browser restart / not reliably renewed.
- **Fix (official @supabase/ssr pattern):** new `lib/sessionCookie.ts`
  (`STAY_SIGNED_IN_COOKIE`, `SESSION_MAX_AGE` ≈ 400 days, `staySignedInEnabled`,
  `sessionMaxAge`). `lib/supabase/client.ts` now sets `persistSession: true`,
  `autoRefreshToken: true`, and a 400-day `cookieOptions.maxAge` when Stay-signed-in
  is on (default). `lib/supabase/server.ts` stays read-only in Server Components but
  applies the long maxAge when writing cookies. `proxy.ts` reads the stay cookie and
  writes renewed cookies (refresh happens here) with the long maxAge on the response.
  Sign-in form adds a "Keep me signed in" checkbox (default checked) that sets the
  stay cookie. No silent sign-out code exists (only intentional banned/exit/logout).
- **`npm run test:session`** added (`scripts/test-session.mjs`): signs in, expires the
  access token artificially while keeping a valid refresh token, requests a protected
  page `/dashboard` and API route `/api/user/currency`, and proves the user stays
  signed in and cookies are renewed. Requires a live DB + running server (TEST_BASE_URL),
  same as test:otp.
- **Checks:** `npm run lint` → 0 errors; `npm run build` → pass.
- **Manual:** `MANUAL_STEPS.md` — check Supabase → Authentication → Sessions has no
  inactivity timeout / time-box.

## Update (prompt 26 — Item 2: no email at sign-up, email only for reset)
- **Admin Settings → Security:** "Require email verification at sign-up" switch (default
  OFF via `settings` key `require_email_verify_at_signup`), "Mark all existing users as
  verified" bulk action (`/api/admin/users/mark-all-verified`, audit-logged), and an
  editable disposable-email domain list (`disposable_email_domains`, JSON array).
- **Switch OFF (default):** sign-up (`/api/auth/signup`) creates the user via the admin
  API with `email_confirm: true` (no verification email), signs the user in
  (`signInWithPassword`), and opens the dashboard. `/verify-email` is skipped.
- **All gates read the switch:** proxy (redirects only when ON), dashboard layout, sign-in
  server action, and API routes `orders/place`, `support/ticket`, `user/currency` only
  block unverified users when the switch is ON.
- **Abuse protection (always on):** 5 sign-ups / hour per IP hash; hidden honeypot field;
  minimum form-fill time (2s, `form_start`); disposable-email domain rejection.
- **Password reset:** "Forgot password" (`/api/auth/forgot`) now rate-limits 3 / hour per
  email and always returns the generic "If this email exists, we sent a link" message; the
  link routes through `/auth/callback?next=/reset-password`. `/reset-password` has a
  strength bar and lands the user signed-in on the dashboard. `docs/EMAIL_TEMPLATE_RESET.html`
  (branded, dark, `{{ .ConfirmationURL }}`) added; MANUAL_STEPS.md updated with Supabase
  email-template + redirect-URL steps.
- **Checks:** `npm run lint` → 0 errors; `npm run build` → pass.

## Update (prompt 26 — Item 3: login methods controlled from admin)
- Google / X / GitHub sign-in buttons are hidden by default. `app/api/meta/oauth`
  now returns `{ google/twitter/github: { configured, enabled }, emailPassword }`.
- Admin → Settings → **Login methods**: a switch per provider (all OFF by default)
  with a status note ("Keys configured" / "Keys not configured"), plus an "Email and
  password" switch (default ON). Settings keys: `login_google_enabled`,
  `login_twitter_enabled`, `login_github_enabled`, `login_email_password_enabled` (added
  to schema_v20 + ALL_IN_ONE.sql).
- A provider's button shows on sign-in only when it is both **enabled** (admin switch)
  and **configured** (OAuth keys filled). `components/auth/SocialLogin.tsx` filters on
  both; divider hides when no buttons show. The sign-in page hides the email+password
  form and "Create an account" when email+password is disabled.
- `docs/OAUTH_SETUP.md` added (Roman Urdu: create OAuth apps, enter keys in Supabase +
  Wazeo admin, enable in Login methods).
- **Checks:** `npm run lint` → 0 errors; `npm run build` → pass.

## Update (prompt 26 — Item 4: no instant orders, draw your own curve (PARTIAL))
- **No instant orders:** `app/api/orders/place` forces gradual mode (`mode="drip"`);
  the Instant option is removed from New Order UI; old orders keep their stored mode.
- **Admin settings / schema:** `min_delivery_duration` (default 15) + per-service
  `run_min`/`run_max` columns (schema_v20 + ALL_IN_ONE.sql). Orders curve check allows
  `'custom'`.
- **Delivery controls on New Order:** duration (15m–72h), start delay, natural variation
  0–30%, min/max per run, preset curve, and **"Draw my curve"** touch canvas editor
  (`components/newOrder/CurveCanvas.tsx`: 6–12 control points, drag/freehand, undo,
  reset, smooth) feeding `lib/schedule.ts`.
- **Scheduler extended:** `buildSchedule` supports `curve === "custom"` (interpolated
  control points), `minRun`/`maxRun` (with exact-total redistribution), and
  `startDelayMinutes`. Guarantees preserved: exact sum, min, cumulative non-decreasing,
  no overlap, determinism. `npm run test:schedule` extended → **2512 assertions PASS**.
- **Live preview:** cumulative line + interval bars + summary ("about every X to Y
  minutes, finishing in about Z hours") + price in OrderForm.
- **Remaining (not yet done):** live real-data graphs on the order page (planned vs
  delivered, progress ring, ETA) and dashboard (views/likes over time per platform),
  with Realtime + 20s polling fallback; admin Settings UI wiring for min-duration and
  per-service run sizes.
- **Checks:** `npm run lint` → 0 errors; `npm run build` → pass; `npm run test:schedule` → pass.

## Update (prompt 25 — sign-in / sign-up / access-key screens + key data)
- Tag `stable-before-prompt25` created + pushed.
- **Item 1 — Load then sign-in:** SplashLoader (spinning ring, no text, ≥600ms) already in root layout → fades into sign-in. Sign-in page reordered: form first (email/password/show-hide/forgot/Sign in) → round social buttons (Google/X/GitHub; unconfigured providers disabled with "Not set up yet" tooltip via new `/api/meta/oauth`) → two clear options "Create an account" / "I have an access key". Ref: `app/(auth)/sign-in`, `components/auth/SocialLogin`.
- **Item 2 — Access-key flow (multi-step):** `components/auth/AccessKeyRedeem.tsx` rebuilt: enter key (auto-uppercase + auto-format WZ-XXXX-XXXX-XXXX) → validating popup (orbit spinner ≥1.2s) → success state (plan, days/Permanent, works-until date, feature chips) → compact activate step (email bound/read-only if bound, password + strength bar) → "Activate my access". `app/api/auth/key-redeem` rewritten: `action=validate` (returns plan/days/features/bound_email) and `action=redeem` (atomic claim, create user, `access_expires_at = now + access_days`, plan/features/access_key_id on profile, credit starting balance, audit). Verification rule: bound-email match = verified; else OTP; admin Setting `require_key_email_verify` (default OFF) forces OTP.
- Data support: `supabase/schema_v19.sql` (+ merged into ALL_IN_ONE.sql) adds `access_codes.access_days/plan_name/features/redemption_expires_at` and `profiles.access_expires_at/plan/features`. Admin keys form now has access-days presets (7/30/90/365/Permanent/custom), plan name, feature checkboxes (Modules), starting balance, redemption deadline, note; copy + ready-to-send message. Header & sidebar show "Access left: N days / Unlimited" via `lib/access.ts`. Expired access blocks only NEW orders (`app/api/orders/place` guard); admin can **Extend/Revoke access** per user (`app/api/admin/keys` actions).
- **Item 3 — Simpler normal signup:** form now only email/password/confirm + terms checkbox. Username auto-generated from email (dedupe on profiles) server-side; country detected from headers (stored "unknown" if missing); referral now via `/r/<code>` cookie (30d) applied silently — no code field. OTP verification stays mandatory. Ref: `app/(auth)/sign-up`, `app/api/auth/signup`, `app/r/[code]/route.ts`.
- **Item 4 — Finish:** new text added to all 5 locales (en/ur/hi/fr/zh). `npm run lint` 0 errors, `npm run build` pass, `npm run i18n:check` pass, `npm run check:layout` pass, `npm run test:key` 29 assertions pass (new). docs/ADMIN_GUIDE.md updated.
- **Environment caveats:** `npm run test:otp` + `npm run check` + `npm run db:setup` need a **live Supabase DB** (SUPABASE_DB_URL + SMTP); locally they fail/hang (pre-existing). schema_v19 SQL is ready to apply via `npm run db:setup` on the live project.
- **Remaining/manual:** live DB apply; real OTP/SMTP; visual sweep at 320–1280px LTR+RTL on a real phone; OAUTH setup doc.



## Kya exists/kyaam karta hai
- Next.js 16 (App Router) + TypeScript + Tailwind v4 + Supabase + Framer Motion + Chart.js.
- Auth (signup/signin/reset/verify, rate limit), middleware protected /dashboard & /admin.
- Dashboard shell (sidebar + mobile bottom bar), balance chip, theme picker (3 accents), reduce-motion.
- Dashboard overview (stats, announcements, notifications, recent orders).
- Services browse + favorites; New Order (instant + drip), schedule preview, live price.
- Orders list + detail (timeline, planned-vs-delivered chart, chunks table, refresh).
- Add Funds (screenshot upload) + history; Tickets (list/new/chat + AI route).
- Settings (username, password, theme, reduce motion, referral code copy).
- Admin: overview, users (adjust/ban/make-admin), orders (refund), services (sync+markup+active), payments (approve/reject + proof), tickets reply, announcements, settings.
- Provider adapter with MOCK mode; AI lib (Mercury + fallback); order guard (duplicate link).
- Automation: db:setup, make-admin, seed, check; ALL_IN_ONE.sql; docs (README, START_HERE, DEPLOY, AUDIT, LAUNCH_CHECKLIST).

## Quality (abhi)
- `npm run lint` → 0 errors (29 warnings).
- `npm run build` → exit 0 (Compiled successfully).
- `npm run check` → env/URL/anon/service-role/tables green; RLS check DB-URL issue (needs sahi SUPABASE_DB_URL us project ki jahan tables hain).
- Git repo initialized, first commit done (local).

## Kya abhi nahi / naya chahiye (is task)
- i18n (5 languages) + RTL (Urdu) — nahi hai.
- Admin back-office (WordPress-style) — sirf basic pages hain.
- Translation admin page, providers manager, coupons/loyalty, testimonials/FAQ/CMS, audit logs, system page, maintenance/popups.
- Public price list + order tracker (public).
- Loyalty bar, daily check-in, coupon on wallet, AI order assistant, mass order, schedule-later.


---

## Update (latest pass)
- Added schema_v4 + schema_v5 (providers, coupons, loyalty_levels, translation_overrides, audit_logs, api_keys, daily_checkin, cms_pages, faqs, testimonials, popups, error_logs, package_presets, comment_sets, webhook_configs, profiles.language/permissions/discount/custom_rates/notes, orders.package_id/scheduled_for/growth_json). Merged into ALL_IN_ONE.sql + `npm run db:setup` ✅.
- Admin shell upgraded: grouped collapsible sidebar + top bar search (Ctrl+K) + breadcrumbs.
- New admin pages (real saves): Providers, Coupons & Loyalty, Translations, System. Audit logs on key actions.
- i18n foundation: 5 locales + lib/i18n + LanguageSwitcher (landing/settings) + server-side html lang/dir + Urdu RTL + `npm run i18n:check` ✅.
- Seed updated for new tables (loyalty, coupon, FAQ, testimonial, package presets) ✅.

### What is next (NOT built yet)
- Admin: users notes/discount/CSV, order bulk/profit/flag, services tree/drag/CSV, payments methods UI, CMS/content editor, appearance/branding, integrations (webhooks/SMTP/Mercury UI).
- Customer: public price list, public tracker, check-in UI, loyalty bar, referral dashboard, mass/repeat/schedule later, AI assistant UI, command palette, onboarding, PWA, API key page.


---

## Update (latest pass — context limited)
- ✅ Ran `npm run lint` (0 errors) and `npm run build` (pass).
- ✅ Added `supabase/schema_v6.sql`: `profiles.phone`, `last_login_at`, `signup_ip_hash` (+ index) and extended `handle_new_user` to store phone + signup IP hash. Merged into ALL_IN_ONE.sql + `npm run db:setup` ✅.

### Next (NOT done yet — this context ran out)
- Signup UI: phone field + country code, show/hide password, terms checkbox, honeypot; signup route sending phone.
- Login: write last_login_at, "Remember me", auto-redirect admin→/admin.
- Support system (WhatsApp/Telegram/live-chat realtime), tickets category/attachment.
- Finish remaining admin pages (users detail, payments methods manager, webhooks, reports, roles matrix, CMS/Appearance/Integrations UI).
- Growth package UI (views/likes/comments schedule, preview, pause/resume/cancel), public tracker/price list, check-in/loyalty/referral dashboard, mass/repeat/AI assistant, command palette, onboarding, PWA, API keys + /api/v2, CSV exports.
## Update (this pass — Stage 1 backend slice)
- ✅ Signup API: phone field (sanitized), honeypot (`website`), IP hash (sha256) → stored on `profiles` via upsert + `handle_new_user` (schema_v6). Rate limit increased to 6/min.
- ✅ Signin API: writes `last_login_at`.
- ✅ Sign-in page: auto-redirect — admin → `/admin`, customer → `/dashboard`.
- ✅ `npm run lint` (0 errors) · `npm run build` (pass).

### Still NOT built (scope very large, context ended)
- Signup UI (phone/terms/show-hide/honeypot field), profile phone edit.
- Support system (WhatsApp/Telegram/live-chat realtime), ticket category/attachment.
- Remaining admin pages (users detail, payments methods manager, reports, roles matrix, CMS/Appearance/Integrations UI).
- Growth package UI, public tracker/price list, check-in/loyalty/referral dashboard, mass/repeat/AI assistant, command palette, onboarding, PWA, API keys + /api/v2, CSV exports.


---

## Folder organization
- Main project: `C:\Users\WASEEM\Desktop\Wazeo` (single authoritative workspace).
- 57 Wazeo-related diagnostic logs/installer were on Desktop → moved to `Wazeo\_desktop_logs\` (reversible). Only `devserver3.log` remained on Desktop because the running dev server has it open (move it after stopping dev).
- No source/config/db/env file moved; `node_modules`, `.next`, `package.json`, configs untouched.
- Verified after organizing: `npm run lint` (0 errors), `npm run build` (pass), localhost responds HTTP 200.





---

## LOGIN LOOP — root cause FOUND & FIXED (evidence)
- Evidence: scripts/check-profile.mjs (service role) -> for waseemiqbalbhutta242808982@gmail.com: auth user exists, email confirmed=true, profile row MISSING. Dashboard/admin layouts do if (!profile) redirect('/sign-in') -> sign-in loop (flicker, no error).
- Fix: schema_v7 backfill (profiles for all auth.users) merged + db:setup ok; actions.ts ensure-profile on login; check-profile/test-login scripts added; admin role re-applied via make-admin.
- Verified: check-profile -> profile exists, role=admin. lint 0 errors, build pass. Local commit done; push baqi: git push origin master.


---

## Latest stage (Order Center groundwork / Stage 1-8 partial)
- schema_v8 added: scheduled_steps, access_codes, vault_saved_links, user_module_settings (+ settings invite_only). Merged into ALL_IN_ONE.sql + npm run db:setup OK.
- Signup route: invite-only gate (if settings invite_only=true, requires valid/active access code, consumes usage).
- lint 0 errors, build pass.

### Next (NOT built): Order Center 3 modes UI, Growth/Likes planner, Scheduled Orders page UI, Service mapping/multi-provider admin, mobile modules, animated charts, invite admin UI, email end-to-end, seed update, docs.


---

## Latest: schema_v9 (services.is_demo) added, merged, db:setup OK. lint 0 / build pass.
### Not built yet (context ended): Blocks A-H UI/features (Order Center, planners, scheduled orders UI, service mapping, mobile, charts, invite admin UI, email end-to-end, currencies, deposit page, support hub, starter services seed, website features, graphs/motion, audit+push). Next: continue from Block A1 (Order Center).


---

## Latest: schema_v10 (profiles.country) + signup country auto-detect (x-vercel-ip-country / cf-ipcountry) stored on profile. db:setup OK, lint 0, build pass.
### Not built (context ended): full signup country UI, currencies system, deposit page/methods, support hub, starter services seed, dropdown bottom-sheet refactor, service orderability enforcement, presets, graphs/motion, translations + final push.


---

## Latest: Country picker on signup completed (searchable datalist, PK/IN/BD pinned, server detection hint, body.country override). lib/countries.ts + /api/meta/country route added. lint 0, build pass.
### Not built (context ended): split auth layout + canvas animation, logo spin/draw-in states, charts/motion polish, translations + final checks (Parts 2-5).


---

## Latest: country -> default language on signup (PK->ur, IN->hi, CN->zh, else en) stored on profile. lint 0, build pass.
### Not built (context ended): Parts 2-5 (split auth layout + canvas animation, logo motion states, charts/mobile polish, translations + final checks).


---

## Latest: Interactive auth pages (split layout + canvas visual + form polish) ✅
- Split layout for /sign-in & /sign-up (form ek side, interactive visual doosri side — phone pe visual upar, chota). `/forgot-password` & `/reset-password` abhi bhi centered hain.
- `components/auth/AuthVisual.tsx`: lightweight canvas animation (koi extra library nahi) — glowing nodes + flowing growth/drip curves, accent color me. Nodes mouse/finger follow karte hain, tap se ripple banta hai, colors accent theme ke saath change. 3 floating cards (Views delivered / Orders today / Platforms) count-up stats ke saath drift + rotating tagline.
- Performance: tab hidden pe canvas pause, ~30fps cap, devicePixelRatio ≤2, `prefers-reduced-motion` / `[data-reduce-motion=true]` / slow device (cores≤2 ya memory≤2GB) pe static gradient fallback. Form loading kabhi block nahi hota.
- Form polish: animated focus, password strength bar, show/hide icon (`components/auth/PasswordInput.tsx`), signup success checkmark, error pe shake + clear message, submit sirf loading pe disabled (visible reason).
- Naye visible text ke keys 5 locale files (en/ur/hi/fr/zh) me add kiye; `npm run i18n:check` ✅.
- `npm run lint` → 0 errors (35 pre-existing warnings). `npm run build` → pass.
- E2E test (scripts/auth-e2e-test.mjs): signup HTTP → admin confirm → signin client-SDK → signin-touch endpoint → invalid password reject. Sab ✅.


## Update (Part 1 — Email OTP verification) ✅
- Signup ab OTP se verify hota hai: `components/auth/OtpInput.tsx` (single invisible native input + 6 boxes — auto-focus, auto-advance, paste full code, backspace, numeric keypad, shake on wrong, caret indicator).
- `app/(auth)/sign-up/page.tsx`: signup ke baad animated "Check your email" panel — 6-box OTP, 60s resend countdown, "wrong email? change it" link, wrong/expired/too-many messages, success checkmark + smooth redirect to /dashboard.
- New API routes: `app/api/auth/verify-otp` (verifyOtp type=signup + ensures profile row), `app/api/auth/resend-code` (resend, rate-limited). Verify limit = 5 wrong per 10 min per IP+email.
- `app/auth/callback/route.ts`: email link (token_hash) verification works too; signup route now sets `emailRedirectTo` → /auth/callback.
- docs: `docs/EMAIL_TEMPLATE.html` (dark branded, uses {{ .Token }}) + `docs/EMAIL_SETUP.md` (Roman Urdu: Resend account, innvera.shop DNS in Hostinger, SMTP/API key in Supabase, OTP expiration 600, test).
- OTP keys added to all 5 locales (en/ur/hi/fr/zh); locale JSON rebuilt valid.
- `npm run lint` → 0 errors (36 warnings). `npm run build` → pass.


## Update (Part 2 — Save ALL signup data) ✅
- Audit: signup data ab mehfooz hota hai profiles me (trigger + server route dono). Copy karta hai: username, email (auth.users), phone, country (2-letter), language, currency (default USD), referral_used, full_name, signup_ip_hash, created_at (signup time), last_login_at.
- `supabase/schema_v11.sql`: new columns email, currency, full_name, referral_used (+indexes); extended `handle_new_user` trigger to copy har metadata field; extended `update_profile` to save currency/country; re-runnable backfill from auth.users metadata. Merged into ALL_IN_ONE.sql + `npm run db:setup` ✅.
- `lib/currencies.ts` + `lib/countries.ts` (`countryFlag`) added.
- Admin Users table ab sab fields dikhata hai (username, email, country+flag, language, currency, balance, signup date, last login, status) + profile drawer modal with all fields. "Make admin" button UI se hata diya (ab sirf make-admin script).
- `npm run lint` → 0 errors. `npm run build` → pass.


## Update (Part 3 — Admin only for ADMIN_EMAILS) ✅
- `lib/adminAuth.ts`: server helper — admin access requires email in `ADMIN_EMAILS` AND profile role=admin.
- `/admin` layout ab `notFound()` (404) deta hai for anyone not on the allowlist (unauthenticated → /sign-in). Middleware role-redirect hata diya (layout handle karta hai).
- `app/api/meta/admin-access` route (server-side boolean) — Sidebar aur TopBar admin link/sadh ab isi se gate hote hain, is liye non-allowed users ko admin link kabhi nahi dikhta.
- Provider sync API route ab `isAdminUser()` se gated hai. Signup kabhi role set nahi karta; make-admin script hi admin banane ka zariya.
- `.env.example` me `ADMIN_EMAILS` add; `npm run check` ab ise verify karta hai; `docs/ENV_CHECKLIST.md` (names only, Vercel reminder included).
- `npm run lint` → 0 errors. `npm run build` → pass.


## Update (Part 4 — Support Hub + floating contact icon) ✅
- Support settings DB me save hote hain (`schema_v12.sql`: support_whatsapp, support_telegram, support_email, working_hours, working_tz, support_welcome). Merged + db:setup ✅.
- `components/support/ContactFab.tsx`: floating contact button har page par (root layout me) — animated popup, WhatsApp (wa.me) / Telegram (t.me) / Ticket cards, online/offline badge (working hours se), empty cards hidden.
- `app/support/page.tsx` (public): same cards + FAQ + working hours + contact form jo ticket banata hai (`/api/support/ticket`).
- Admin > Settings me Support fields add kiye.
- Support links: landing footer + dashboard sidebar (NAV) me add.
- `npm run lint` → 0 errors. `npm run build` → pass (includes /support).


## Update (Part 5 — Currencies + header) ✅ (partial conversion)
- Currency engine: USD/INR/PKR/CNY (symbol, flag, rate) in `lib/currencies.ts` — `formatLocalized` Intl formatting, up to 4 decimals for tiny amounts (never rounds to zero). Rates editable (schema_v13 seeds rate_INR/PKR/CNY; merged + db:setup ✅).
- `lib/currency-store.tsx` provider (selected currency from cookie + profile, rates from `/api/meta/currencies`); set via `/api/user/currency` (persists via update_profile).
- Wallet chip in header ab chosen currency me balance dikhata hai + sab 4 currencies list (tap/hover) se switch.
- Currency switcher on landing (fixed top-right) via `components/CurrencySwitcher.tsx`.
- Header user area: country flag + country name + username + email (email hidden on small screens, shown in mobile menu). User type extended (email/country).
- Admin > Settings ab Currencies editor (manual rates + auto-refresh via `/api/admin/currencies/refresh` — free open.er-api.com, server-side, gated admin, manual fallback).
- NOTE: full page-by-page price conversion (orders, add-funds, services) abhi partial hai — currency framework ready, core header/wallet/landing wired.
- `npm run lint` → 0 errors. `npm run build` → pass.


## Update (Part 6 — Mobile-friendly UI) ✅ (partial)
- Modal: bottom-sheet on phones already; now max-h 88vh + internal scroll + notch safe-area bottom.
- Bottom tab bar: safe-area bottom padding (env(safe-area-inset-bottom)).
- `globals.css`: `body` overflow-x hidden (no horizontal scroll), img/svg max-width, touch tap target >=44px helper (`@media (pointer:coarse)`), dropdown overflow guard on small screens.
- LTR + Urdu RTL are driven by `html dir` already (i18n); deep RTL layout flip for sidebar/dropdowns not fully done.
- NOTE: full "tables→cards on phones" conversion aur every page 360/768/1440 audit abhi partial hai.
- `npm run lint` → 0 errors. `npm run build` → pass.


## Update (Part 7 — Extra CSS & animation) ✅
- globals.css: `btn-glow` (glow-trail on hover), `card-tilt` (desktop-only via @media hover:hover/pointer:fine), `nav-indicator` animated active bar, `page-transition` sliding page entrance. All transform/opacity only, 150-600ms.
- Applied: Button primary + btn-glow; interactive Cards + card-tilt; Sidebar active links + nav-indicator; AppShell main + page-transition.
- Reduced-motion (prefers-reduced-motion + data-reduce-motion) globally honors; tilt/glow gated to fine-pointer devices (disabled on touch).
- OTP checkmark/pop + CountUp already existed.
- `npm run lint` → 0 errors. `npm run build` → pass.



## Update (Part 8 — Finish) ✅
- `npm run i18n:check` → pass (all keys in all 5 languages).
- `npm run check` → env/tables/RLS/build all green (Provider MOCK, Mercury unconfigured — ok).
- `npm run seed` → runs (services, announcement, loyalty, coupon, FAQ, testimonial, presets).
- FEATURES.md updated with Parts 1-8.
- Remaining manual steps for you: Supabase email template (docs/EMAIL_TEMPLATE.html), Resend SMTP + innvera.shop DNS (docs/EMAIL_SETUP.md), Vercel env `ADMIN_EMAILS` + `NEXT_PUBLIC_SITE_URL` (docs/ENV_CHECKLIST.md), set Support settings in Admin → Settings.
- End-to-end OTP test requires Resend/SMTP email delivery to be live (manual step).

## Task 2 — Part 1 (Mobile header + navigation) ✅ (tablet collapsible partial)
- `MobileNav.tsx` rebuilt as floating pill bar: role-aware (customer: Home/New Order/Orders/Wallet/More; admin: Overview/Orders/Users/Payments/More), safe-area, glass blur, glowing `layoutId` active indicator, press animation (whileTap), hide while an input is focused (translate-y), and a "More" bottom sheet (spring) with remaining items.
- AppShell passes user to MobileNav; content bottom padding already clear the bar.
- ContactFab raised above the mobile bar (bottom-24 on mobile, bottom-5 desktop).
- TopBar: added language switcher button + notifications bell; theme button hidden on very small screens; desktop user chip (flag/country/username/email) stays.
- NOTE: tablet "collapsible sidebar" (768-1024) not fully wired — phones use bottom bar, desktop full sidebar; tablet currently uses bottom bar.
- lint 0 errors, build pass.


## Task 2 — Part 2 (Custom dropdowns everywhere) ✅
- New reusable `components/ui/WazeoSelect.tsx`: theme-aware dropdown — anchored below field on tablet/desktop, full bottom sheet on phones (breakpoint sm), search for long lists (>7), keyboard (arrows/Enter/Escape), icons + badges + group headers, smooth framer-motion open/close, option badge.
- `components/ui/Select.tsx` ab WazeoSelect par delegate karta hai (same event API — no call-site changes needed). No browser-native `<select>` remains anywhere.
- Covers: OrderForm curve, AddFundsPage method, AdminCoupons type, AdminProviders mode, AdminTranslations language, plus any other Select usage.
- lint 0 errors, build pass.



## Task 2 — Part 3 (New Order redesign) ✅ (partial: natural-variation slider / Bulk-Combo)
- Step 1: platform selection ab bade icon tabs (Instagram/TikTok/YouTube) hain (ServicePicker).
- Step 2: services ab SIRF ek "Select service" WazeoSelect dropdown me hain — sirf selected platform ke, category ke hisaab se grouped, name + price per 1000 chuni hui currency me + min/max badge. Platform change se selection clear hota hai. No list outside dropdown.
- Live price summary card (chosen currency), balance after order, aur confirm modal add kiya (placeOrder tabhi chalta hai jab confirm ho).
- OrderForm currency-aware ho gaya (fmt) — est cost + balance chosen currency me.
- NOTE: natural-variation slider aur Single/Bulk/Combo modes exist nahi karte (only Instant/Drip) — partial.
- lint 0 errors, build pass.


## Task 2 — Status @ context end
- ✅ Parts 1, 2, 3 committed (mobile pill nav/header, WazeoSelect everywhere, New Order redesign).

## Task 3 — Part 1 (Mandatory email verification) ✅
- ENFORCE verification: middleware + dashboard layout ab unconfirmed users (email_confirmed_at empty) ko /verify-email par redc karte hain. API gates add: orders/place, support/ticket, user/currency (403 unverified).
- `/verify-email` page: OTP panel (auto-focus/paste/backspace/shake/checkmark), resend 60s countdown, "wrong email? change it" (inline email update + resend), sign-out, aur link-expired friendly message.
- `/auth/callback` failure ab /verify-email?error=link_used_or_expired par le jaata hai ("Enter the code instead" + resend available).
- Sign-in server action: unverified user → `{verify:true}` → page /verify-email par le jaati hai; no usable session for protected pages.
- make-admin already auto-confirms email. Admin Users: Verified badge + filter (All/Verified/Unverified) + "Mark verified" & "Resend" actions (audit-logged via new /api/admin/users/verify). Admin Overview: verification funnel card (signups/verified/first order/first deposit).
- docs/EMAIL_SETUP.md updated: Confirm email ON + OTP most-reliable note.
- lint 0 errors, build pass.


## Task 3 — Part 2 (More themes) ✅
- 4 naye accent themes (Rose, Amber, Ocean, Crimson) + "AMOLED Black" dark variant (pure black bg) — CSS variables me define, `[data-theme]` ke zariye.
- THEMES list updated (8 total); header dropdown + Settings picker automatically naye chips dikhate hain.
- Smooth color transition on surfaces (body/glass/input/button) when switching.
- Theme saved on profile (update_profile) + localStorage + cookie; preload script reads cookie fallback.
- Applied everywhere via CSS vars (admin, charts, logo, canvas, all pages). Contrast checked for dark themes; light-mode note remains.
- lint 0 errors, build pass.

- ⏭ NEXT (not built yet): Part 4 currency refresh everywhere, Part 5 support logos SVG, Part 6 deposit by country + demo safety, Part 7 starter services seed, Part 8 graphs everywhere, Part 9 admin panel power, Part 10 finish (locales/seeds/docs/push).

## Handover pass — Block A (Access Key System) — progress
- ✅ `schema_v14` (access key columns) merged into `supabase/ALL_IN_ONE.sql` (access_codes: email/hash/last4/mode/note/used_by/used_at/revoked; profiles: access_key_id/must_change_password/password_temp_set; transactions type `credit` allowed). **Apply with `npm run db:setup`.**
- ✅ Fixed TypeScript errors in pre-existing `/api/admin/keys` + `/api/auth/key-redeem` routes (replaced illegal `.catch()` on Supabase builders with try/catch).
- ✅ NEW `/admin/keys` page (`app/admin/keys/page.tsx` + `components/admin/AdminKeys.tsx`): generate single/bulk (label, expiry 7d default, starting balance, note, mode self/admin), list with filters/search, revoke/regenerate/delete-expired, CSV export, counters + status chart (Chart.js), invite-only toggle, multiple key shown once with Copy + "Copy ready-to-send message".
- ✅ Customer sign-in key flow: sign-in page now has two options ("Create an account" → signup, "I have an access key" → redeem). New `components/auth/AccessKeyRedeem.tsx`: key + email + username + password strength bar + country + phone → `/api/auth/key-redeem` → redirect to `/verify-email`. "Request a key" → WhatsApp/Telegram links from Admin > Settings > Support.
- ✅ `npm run lint` → 0 errors (38 warnings). `npm run build` → pass. `npm run i18n:check` → pass.
- ⏭ NEXT / manual: apply `npm run db:setup` (schema_v14); live-test key flow; admin Users page key-origin display; automated key tests.


## Item 1 — Mobile/Desktop layout mix-up (FIXED)
Root cause: admin `AdminShell`/`AdminSidebar` rendered a fixed desktop sidebar with no responsive CSS gating (no `hidden lg:`/`md:`), so it opened on phones via a JS-state hamburger; customer had two separate nav systems (desktop `Sidebar` + `MobileNav`) both mounted, with no tablet rail and inconsistent breakpoints.
Fix: one shared shell `components/shell/AppShell.tsx` for BOTH dashboard and admin; layout mode is decided only by Tailwind breakpoints (phone <768 = bottom pill bar + More bottom sheet; tablet 768–1023 = icon-rail that expands; desktop ≥1024 = full sidebar). No JS device detection. Legacy shell components removed (`git rm`). Added `npm run check:layout` (fails on `window.innerWidth`/`userAgent`/`matchMedia`-except-reduce-motion and if shell gates missing). `npm run lint` 0 errors, `npm run build` pass, `npm run check:layout` pass.
Remaining for Item 1 (PARTIAL): admin page tables→cards on phones, filters bottom-sheet, full width-sweep visual audit (320/360/390/430/600/768/1024/1280, portrait/landscape, LTR/RTL).



## Review-pass enhancements (this session)
- ✅ Starter demo services (Item 3): `scripts/seed.mjs` now idempotently inserts 16 Instagram + 8 TikTok + 8 YouTube very-cheap starter services (`is_demo=true`, min 10, markup 30%). Ran `npm run seed` → 32 added. Fixed a bug (module-level `now`).
- ✅ All checks green: lint 0 errors, build pass, `i18n:check` pass, `check:layout` pass, `check` pass (env OK, RLS on, tables present).
- ⚠️ Remaining from earlier history (not yet done): Bulk/Combo order modes + natural-variation slider; deposit country-tabs/methods demo-complete; graphs everywhere; admin KPI trends/health/broadcast/notification-center; demo-unorderable-when-live enforcement in place_order SQL/API + "Selling below cost" admin warning; admin tables→cards on phones; new visible text into 5 locale files.

- ✅ schema_v14 applied via `npm run db:setup` (access_codes columns + profiles.access_key_id live).
- ✅ Admin Users page now shows a "🔑 Key" badge for key signups and, in the profile drawer, "Signed up with key" with the key label (from access_codes).
- Code-path review of redeem: constant-time compare, atomic claim `eq(uses,0)`, generic error text, rate-limit 5/10-min per IP+email, temp-password mode, invite-only gate, audit logs — all present. Full key never logged.
- ⚠️ Live E2E (wrong email / expired / revoked / reused / invite on-off / temp-password forced-change / unverified blocked until OTP) still needs working email/SMTP to deliver OTP; routes reviewed, no bug found.
- `npm run lint` 0 errors, `npm run build` pass.

---

## Item 0 — Safety Review (DONE)

**What the removed features were (5 lines):**
1. **Organic engine** — generated a delivery plan (curve shapes → micro-steps) and scored it for how "natural"/safe it looked.
2. **50-pattern library** — a list of named delivery-shape presets used to pick "organic-looking" curves.
3. **Re-roll** — automatically retried plan seeds until the risk score fell under target 22 (avoiding detection).
4. **risk_config** — a DB table storing hard caps + risk-scoring weights ("bot-likelihood"/"detection safety" tuning knobs).
5. **Risk-monitor** — an edge function that flagged/paused schedules whose slices exceeded bot-detection caps.

**What we kept:** plain delivery scheduling only — curves (Steady, Slow start, Bell peak, Natural wave) + natural-variation slider, and operational monitors (provider failures, low balance, duplicate/abusive orders, stuck chunks via the cron routes). Risk scoring, re-roll, the pattern library, risk_config, and the risk-monitor were removed from code, UI, schema (schema_v18 drops `risk_config` + risk columns), and edge functions.

**Item 0.2:** app runs fully without any Supabase edge function — Next.js cron routes (`/api/cron/process`, `/api/cron/balance`) + GitHub Actions `cron.yml` do scheduled work. Edge functions kept only as optional reference files with a short note (`supabase/functions/README.md`); `risk-monitor` removed.

**Item 0.3:** custom-plugin install modal replaced by a **Modules** page (admin/plugins) that only toggles built-in modules (Combo, Bulk, Growth, Likes, Scheduler, Referral, Daily reward, Coupons, AI, Live chat, Blog, API access, Reviews) and stores JSON settings. No code upload/execution anywhere.

**Item 0.4:** impersonation is now **read-only "view as user"** — admin-only, audit-logged (start + exit), visible banner, and a proxy.ts guard blocks all non-GET /api calls while impersonating (except exit). No passwords are ever displayed or stored.

**Checks:** `npm run lint` → 0 errors; `npm run build` → pass.


---

## Item 1 — Sign-up & OTP reliability (DONE)

- **Per-email limits in DB:** 5 wrong attempts / 10 min per email (via `email_otps.locked_until`), friendly wait message. Correct codes are never rejected because of other users.
- **Generous IP limit:** 60 / 10 min; correct codes never count against it (`rateLimitCheck` vs `rateLimitHit`).
- **Removed local expiry check:** let Supabase `verifyOtp` decide; errors mapped to clear messages (expired / invalid / already used). Resend area shows "Use the newest code — a new code cancels the old one."
- **OTP length from `NEXT_PUBLIC_OTP_LENGTH`** (default 6, allowed 4–10); spaces/non-digits stripped on paste; email trimmed + lowercased; type "signup" with fallback to "email".
- **`npm run test:otp`** added (`scripts/test-otp.mjs`): creates a temp user, uses `admin.generateLink` to obtain a token, calls the verification route, reports OK/FAIL, then deletes the test user. Structured 4xx (invalid/expired) proves the route is alive; live OTP delivery needs real SMTP.
- **Checks:** `npm run lint` → 0 errors; `npm run build` → pass.


## Update (prompt 23 � Part A foundation)
- Tag stable-before-prompt23 created + pushed.
- Design tokens: light-mode accent variants (AA), radius/shadow/glass tokens (--radius-*, --shadow-*, .glass-strong, --glass-*) added.
- New shared components: Chip, ProgressRing, Stepper, Drawer, Table (phone-card mode).
- npm run lint -> 0 errors; npm run build -> pass.
- Item A page redesign + responsive audit + rest of A-K: TASKS.md me checkboxes.

## Update (prompt 23 — Item C scheduler)
- lib/schedule.ts rewritten as deterministic seeded generator (mulberry32 PRNG, order-id seed, exact sums, per-run min, non-decreasing, no overlap, variation clamped 0-30, maxRuns cap). Backward compatible with existing 4-arg buildSchedule callers.
- Added lagRuns() for likes/comments lagging components.
- Added `npm run test:schedule` (2007 assertions) — all pass.
- lint 0 errors, build pass.

## Update (prompt 24 — P0 stability)
- Tag stable-before-prompt24 created + pushed.
- `npm run db:setup` FAIL: `relation "public.engagement_orders" does not exist` (live DB schema purana hai; ALL_IN_ONE.sql mein organic-era reference). Recorded; rest continue.
- P0 checks: lint 0 errors (35 warnings baseline), build pass, i18n:check pass, check pass (RLS ON; provider MOCK; Mercury unconfigured → fallback), check:layout pass, test:schedule 2007 PASS.
- `npm run test:otp` fix: token extraction ab `action_link`/`redirect_to`/`email_otp`/regex fallback handle karta hai. Full live OTP E2E abhi bhi SMTP + chalte huye server (TEST_BASE_URL) chahta hai.
- Native `<select>`/`<datalist>` sab WazeoSelect se replace (sign-up country, AccessKeyRedeem country, LanguageSwitcher, AppShell lang, AdminPaymentMethods/Providers/Settings/Users).
- Splash: animated logo + spinning ring, koi text nahi, 900ms (>=600ms) — theek.

