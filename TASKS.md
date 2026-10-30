# TASKS — Wazeo (Roman Urdu)

## Prompt "master-plan" — Parts A–G
### Part A — Audit before changing (DONE → written in AUDIT_START.md)
- [x] Wrote AUDIT_START.md with exact root cause (old prod 405 on POST key-redeem + frontend WZ-WZ7A mangle) in two lines.
- [x] Listed last-3-days changes + risk flags (key_sessions, full-key admin decrypt, duplicate uncommitted key modules).
- [x] Baseline checks: lint 0 errors/48 warnings; build pass; test:key 78 pass; test:license 9 pass; test:adminsec 24 pass; test:session fails (fetch failed — live/network).

## Prompt 32b — Keys: admin sees full key / customer experience / bulk tools
### Item 1 — Admin can see every key in full (DONE)
- [x] Schema v25 (`supabase/schema_v25.sql` + appended to `ALL_IN_ONE.sql`, applied via `npm run db:setup`): `access_codes` += `encrypted_key`, `key_hash`, `legacy` (default true) + indexes.
- [x] `lib/keyEncryption.ts`: AES-256-GCM encrypt/decrypt + keyed HMAC-SHA256 hash, key = `KEY_ENCRYPTION_SECRET` (server-only).
- [x] `KEY_ENCRYPTION_SECRET` generated into `.env.local` if missing (not printed); name added to `.env.example`, MANUAL_STEPS.md, ADMIN_GUIDE.md (Vercel step noted).
- [x] Generation stores `encrypted_key` + `key_hash` + `legacy=false` (single + bulk + regenerate).
- [x] Existing hash-only rows auto-marked legacy (unrecoverable); Admin > Keys shows "Legacy" badge + one-click **Regenerate** (revokes old → creates new full key).
- [x] Redeem lookup switched to keyed hash (`key_hash`); legacy keys don't redeem until regenerated.
- [x] Admin > Keys table: full key in monospace column on every row with a copy button; only admins (Admin PIN gate) see it — never customer browser, never server logs.
- [x] One audit entry per keys-list view (`admin_keys_view`, no full keys in log).
- [x] `npm run test:key` extended (encryption round-trip, keyed hash) — 78 pass; lint 0 errors; build pass.

### Item 2 — Customer key experience (PARTIAL — server-side silent sign-in done)
- [x] Server-side password-less sign-in in `POST /api/auth/key-redeem` (`action=bind`): `admin.generateLink` (magiclink, no email sent) → `verifyOtp({token_hash})` on server → normal auth cookies set; `STAY_SIGNED_IN_COOKIE` set (maxAge 400 days) on the response. Frontend already redirects to dashboard when `needsVerify=false`; OTP fallback kept if magiclink verify fails.
- [x] Email binding: binds to the first email entered; read-only prefill when admin bound it (existing). Re-sign-in on a new device via same key+email path.
- [x] `key_sessions` table (schema_v26) records device/session per key (ip_hash + user-agent) for future device-cap enforcement; audit `key_bind_session` event.
- [ ] Validation animation: orbiting-ring spinner ≥1.2s → success morph (drawing checkmark, ripple/glow, shimmering "Key validated" badge, confetti on Full-effects tier, haptic on phones) — CSS/SVG, 150–1200ms, respects reduced motion. (Frontend has basic validating/validated popup; fancy animations pending.)
- [ ] "Already activated? Enter your key and email again to sign in on this device" line.
- [ ] Settings → "Add a password" (normal sign-in path).
- [ ] Device cap enforcement (default 2) + oldest-session sign-out + Admin "Reset devices" button.
- [ ] Revoke/expire ends sessions immediately; per-key history timeline UI.

## Prompt 31 — Heavy upgrade (PARTIAL — Item 1 foundation done)
### Item 1 — Light mode visibility (PARTIAL)
- [x] Semantic light palette rebuilt in `app/globals.css`: separate surface levels (--surface/2/3), text levels (--text/1/2/3), border + border-input, divider, icon, chart tokens (--chart-grid, tooltip bg/text), focus ring, overlay, and status tokens (success/warning/danger text/bg/border). Light values meet WCAG AA (4.5:1 text, 3:1 input borders). Glass in light uses stronger tint + border; shadows replace glow.
- [x] Neutral theme added (dark + light accent) + added to `THEMES` (lib/constants.ts) and the inline preload list (app/layout.tsx).
- [x] Three-way mode Light / Dark / Auto (follows system): `ThemeProvider` upgraded (modePref + resolved mode + matchMedia listener); inline preload script resolves `auto` to system before first paint (no flash); persisted to localStorage + cookie. Toggle UI: new shared `components/ui/ThemeModeToggle.tsx` in AppShell; HomeHeader icon button cycles dark→light→auto.
- [x] `ChartShell` light palette: token-driven gridlines, tooltip bg/text/border, card surface, status colors (no hardcoded dark rgba).
- [x] `Input`/`Chip`/`Badge` now use semantic tokens (readable placeholders, disabled states, status chips in light).
- [x] `npm run test:contrast` harness created (`scripts/test-contrast.mjs`): Playwright + axe-core color-contrast rule + custom input-border (3:1) check, over landing/sign-in/dashboard/new-order/orders/services/wallet/support/settings + admin pages, in light+dark, for all 9 themes. FAST smoke mode via `CONTRAST_FAST=1`. Lint + build pass.
- [ ] Full contrast scan executed to zero violations across every page×theme×mode (harness written; comprehensive live run pending in this session — app’s Supabase realtime/live indicator connections make networkidle stalls; verified up to harness launch/navigation).
- [x] Three-way toggle surfaced on the Settings page (ThemeModeToggle in Appearance card) + AppShell header + HomeHeader.

## Prompt 30 — Admin lockout rescue + admin security + key gen + more
### Item 1 — Admin lockout rescue & admin security (PARTIAL)
- [x] Rescue script `npm run admin:reset-2fa -- [email]` (service role): removes every Supabase MFA factor (auth.admin.mfa listFactors/deleteFactor), clears admin_2fa row (enabled=false) and sets require_admin_2fa=false; no-arg uses first ADMIN_EMAILS (or falls back to first role='admin' profile). RAN + confirmed (admin_2fa enabled rows = 0).
- [x] Email/TOTP 2FA hidden & disabled by default (AdminSystem card replaced). App never demands a second factor unless a verified working factor exists.
- [x] Admin PIN (6–8 digit, salted scrypt slow hash) — `lib/adminPin.ts`, `/api/admin/pin`, `verify`, `confirm`; proxy enforces once per device session + after 12h inactivity; 5 wrong tries → 15 min lock (in DB); no email for PIN.
- [x] Recovery: 8 one-time codes shown once, stored hashed; setup completes only after typing one code back (consumed). `npm run admin:reset-pin -- [email]` (service role).
- [x] `npm run test:adminsec` passes (24 assertions).
- [~] Optional switches (trusted devices / admin login alerts / country allowlist) settings keys seeded; full UI + audit wiring pending.

### Item 2 — Key generation error (DONE)
- [x] Root cause: server `generate` handler skipped any input without a valid email (`if (!email || !regex) continue;`), so a zero-required-fields form produced no keys. Fixed: email now optional (empty → unbound key, binds on first use); invalid non-empty email is logged to `error_logs` + audit.
- [x] Defaults when empty: access 30 days (was permanent/null), plan Standard, redemption valid 30 days (was null), starting balance 0, mode self.
- [x] Layout rebuilt: big "Generate key" button on top, optional fields inside "Advanced options" accordion, quick chips for 7/30/90/365 days and Permanent, key shown once with Copy + copy ready-to-send message (handles unbound email text).
- [x] `npm run test:key` extended (empty-form defaults + bulk parsing) → 35 passed. lint 0 errors, build pass.

## Prompt 28 — Admin/Customer mobile shell + control center + charts + glass/cursor/interactions
### Item 1 — Mobile shell (PARTIAL)
- [~] Floating centered glass pill bottom nav (admin + customer): max-w 420px, inset-x-3, bottom gap 12px + safe-area, rounded-full, accent glow + blur, glowing indicator glides (framer layoutId), hides while an input is focused (focusin) and shows on blur; main content pb-28 so nothing hides behind it.
- [~] More bottom sheet (glass): search box filtering grouped admin menu (Operations/Customers/Money/Content/System), large tap targets (min-h 64px), closes on navigation.
- [~] Slim glass top header: logo (mobile), page title, admin search, wallet/currency, theme, notifications bell + dropdown, avatar menu.
- [ ] Full 320–430px page-by-page mobile audit (tables→cards, filters bottom sheet, sticky save bar, sticky bulk action bar, no horizontal scroll, safe-area modals, RTL) across Overview/Users/Orders/Services/Providers/Payments/Deposit methods/Tickets/Keys/Coupons/Content/Settings/Modules/Logs/System.
- [x] check:layout extended — fails if bottom pill touches screen edge (inset-x-0 bottom-0) or missing centered/cap/gap gates; still passes.
### Item 2 — Control center + staff/permissions (MISSING)
### Item 3 — Live charts (PARTIAL)
- [x] Shared chart module `components/charts/ChartShell.tsx` (Chart.js + react-chartjs-2, lazy client component): theme-aware (reads --accent / data-mode; 8-accent palette + light), 320px-safe responsive, smooth draw-in animation, rich tooltips + index crosshair interaction, clickable legend to hide/show series, date-range chips (Today/7d/30d/90d), compare-with-previous % delta, drag-to-zoom with Reset, PNG + CSV export, skeleton loading + empty state with zero baseline ("Your chart will grow with your first order"), and a pulsing "Live" badge with 20s poll that pauses when the tab is hidden.
- [x] Integrated into Admin Overview (`/admin`) with real order data: Orders-per-day (last 7 days) line + Order-status bar chart.
- [ ] Remaining: wire remaining admin charts (revenue vs profit, new users, signup funnel, users-by-country flags, platform split, top services, deposits per method, provider failure rate, tickets over time, keys generated vs used) and customer charts (views/likes per platform tabs, spend, planned vs delivered); Supabase Realtime subscription for live data.
### Item 4 — Glass look + live cursor (PARTIAL)
- [x] Custom cursor `components/Cursor.tsx` (desktop only via `(hover:hover) and (pointer:fine)`; disabled on touch + `prefers-reduced-motion`): soft ring + dot follow pointer with easing in one rAF loop, transform-only, pointer-events none; re-colors to current accent (reads `--accent`); grows/colours over buttons/links, text-bar over inputs, shrinks on press, small ripple on click, stays over modals, paused while tab hidden, native cursor kept visible.
- [~] Glass design tokens already exist in globals.css (--glass-*, .glass-strong, .glass-glow, --glow) and are applied to the pill/More sheet/modals/dropdowns; backend `backdrop-filter` fallback + low-power device detection (hardwareConcurrency/deviceMemory) for cheap phones still pending.
### Item 5 — Interactive elements (PARTIAL)
- [x] Button click ripple (transform/opacity only, respects reduced motion + pointer:fine), animated Toggle switch (`components/ui/Toggle.tsx`), existing active:scale press feedback.
- [ ] Remaining: magnetic hover on primary buttons (desktop), animated checkboxes, expandable cards, drag-and-drop reordering, swipe-to-reveal rows, animated tabs/segmented controls, progress/success animations, hover tilt on desktop cards.
### Item 6 — Finish (MISSING)

## Prompt 27 — Public site + home page + admin content
- [x] **Item 1 — New home page (/):** full rebuild. Server-rendered (`force-dynamic`), lazy + inline SVG/CSS only. Sticky header (logo, menu, lang/currency switchers, Sign in / Get started, mobile full-screen menu, dark/light toggle). Hero with animated example curve (morphs Steady/Slow start/Bell peak/Natural wave) + platform chips. Live numbers from DB with count-up + admin-editable hide thresholds. How it works (3 steps). Services showcase (real "from" price per platform → /services?platform=). Honest feature grid. Interactive delivery demo (duration slider + curve picker, example-only). Reviews carousel showing ONLY approved reviews; empty state + guarantee strip when none; average shown only when ≥5 approved. Trust section (HTTPS, encrypted passwords, policies, real support channels + hours). FAQ accordion (admin-editable). Real-activity ticker (anonymized recent orders, hidden unless ≥10 in 7 days). Per-visit random accent theme (saved after first choice; respects reduce-motion).
- [x] **Item 2 — Logo / back nav / access everywhere:** logo in headers/footers/auth/public/dashboard/admin (already present, links home). Back arrow + Home link on auth pages and public sub-pages (44px tap target on phones); browser back works. Floating Sign in / Dashboard button on mobile (bottom-left, doesn't overlap ContactFab).
- [x] **Item 3 — Footer & public pages:** full footer (logo, description, social/support from settings when present, lang/currency, link columns). New pages: /services (searchable price list w/ platform filters + currency switcher), /pricing, /how-it-works, /faq, /tracker (by order ID, no personal data), /api-docs, /about, /owner. Terms/Privacy/Refund labelled as templates. sitemap.xml + public/robots.txt, OpenGraph/twitter metadata, friendly 404 (already existed).
- [x] **Item 4 — Admin content:** new AdminContent component at /admin/cms (tabs: Home toggles+headline, Reviews moderation approve/hide/delete, FAQ manager add/edit/reorder/toggle, Footer links, Counter thresholds). All saves write audit_logs. New `reviews` table (re-runnable SQL, RLS: customer creates only for own completed orders, public reads only approved). "Rate this order" on completed orders (OrderDetail) — 1–5 stars, text, show-first-name, auto display name. Schema applied to live DB (separate migration; full db:setup still fails on pre-existing organic-era `engagement_orders` reference).
- [x] **Item 5 — Liveliness & style:** animated gradient accents, glow/floating shapes, scroll-reveal (IntersectionObserver), animated underlines/hover (desktop), tap feedback, marquee ticker, transform/opacity-only animations, reduce-motion + prefers-reduced-motion handling.
- [x] **Item 6 — Mobile-first & speed:** sections built mobile-first (360px) and scale up; 44px tap targets; no horizontal scroll; floating auth button; minimal JS; server-rendered home. Lighthouse: not measured locally (no Chrome/CLI available) — estimated from build output (no big images, inline SVG/CSS, next/font subset not added to avoid offline build break).
- [x] **Item 7 — Suggestions:** cookie notice (accept/decline, localStorage), Share Wazeo (referral link via navigator.share/copy, dashboard header), "Why gradual delivery" explainer section, dark/light toggle in header, status strip (shows only when maintenance_mode or provider_issue active).
- [~] **Item 8 — Finish (PARTIAL):** lint 0 errors, build pass, i18n:check pass, check pass, check:layout pass. New UI text is currently hardcoded English (home sections, public pages) — not yet added to the 5 locale files. Seed FAQ defaults added (skipped because FAQ table non-empty). STATUS/FEATURES/ADMIN_GUIDE updated.

## Prompt 26 — Items 1–6
- [x] **Item 1 — Users stay signed in:** root cause (session cookies, no long maxAge,
      no explicit persistSession/autoRefreshToken) fixed with official @supabase/ssr
      pattern; `lib/sessionCookie.ts`; 400-day maxAge; "Keep me signed in" checkbox
      (default ON); token refresh in proxy returns renewed cookies; `npm run test:session`
      added. lint 0 errors, build pass.
- [x] **Item 2 — No email at sign-up, email only for password reset:** admin Settings→Security
      "Require email verification at sign-up" switch (default OFF) + "Mark all existing
      users as verified" (audit-logged) + editable disposable-domain list. Switch OFF:
      sign-up creates a confirmed user via admin API (`email_confirm` true), signs in,
      opens dashboard (no email). All gates (proxy, dashboard layout, actions, orders/place,
      support/ticket, user/currency) read the setting. Abuse protection always on: 5
      sign-ups/hr per IP hash, honeypot, min fill-time (2s), disposable-domain reject.
      Password reset: generic "If this email exists" message, 3/hr per email rate limit,
      link goes through /auth/callback → /reset-password with strength bar, signs in.
      `docs/EMAIL_TEMPLATE_RESET.html` added; MANUAL_STEPS updated. lint 0 errors, build pass.
- [x] **Item 3 — Login methods controlled from admin:** Google/X/GitHub buttons hidden by default.
      Admin Settings → Login methods: per-provider switches (all OFF default) with a status note
      (keys configured / not configured) + "Email and password" switch (default ON). A provider's
      button shows only when enabled AND keys configured. `app/api/meta/oauth` returns enabled+configured
      + emailPassword; SocialLogin filters buttons; sign-in page hides email form / create-account when
      email+password disabled. `docs/OAUTH_SETUP.md` added (Roman Urdu). lint 0 errors, build pass.
- [~] **Item 4 — No instant orders, draw your own delivery curve (PARTIAL):** instant mode removed from
      New Order UI and API (`place_order` forces gradual; old orders keep stored mode). Admin setting
      `min_delivery_duration` (default 15) + per-service `run_min`/`run_max` columns. New Order controls:
      duration (15m–72h), start delay, natural variation 0–30%, min/max per run, preset curve AND "Draw
      my curve" touch canvas editor (6–12 points, undo/reset/smooth/snap) feeding `lib/schedule.ts`
      (custom curve + maxRun redistribute; exact total, min, cumulative non-decreasing, no overlap).
      Live preview: cumulative line + bars + "about every X to Y minutes, finishing in about Z hours"
      summary + price. `npm run test:schedule` extended for custom curves + maxRun (2512 assertions PASS).
      Remaining: live real-data graphs on order page / dashboard (Realtime + 20s polling), admin min
      duration + per-service run-size settings UI wiring. lint 0 errors, build pass.
- [ ] **Item 5 — Complete UI redesign**
- [ ] **Item 6 — Finish (locales, tests, docs, seed)**

## Prompt 23 — (previous)
# TASKS — Wazeo prompt 23 (Roman Urdu)

Workflow: tag `stable-before-prompt23` ✅ (created + pushed). Har item ke baad `npm run lint` + `npm run build`, tick, STATUS.md update, commit.

## A. Design System & UI Redesign
- [x] Design tokens: 8 accents + light variants (AA contrast), radius, shadows, glass levels (font via next/font noted — skipped to avoid offline-build break)
- [~] Shared components rebuild: Chip, ProgressRing, Stepper, Drawer, Table (phone cards) NAY; Button/Card/Input/Modal/Tabs/Badge/Skeleton/EmptyState/StatCard/Toast/WazeoSelect pehle se hain; page redesign baaki
- [ ] Redesign: landing, sign-in, sign-up, dashboard, New Order, Orders, Order detail, Services, Wallet+Add Funds, Support, Settings, admin shells
- [ ] Motion 150–500ms, transform/opacity only, reduced-motion
- [ ] Single AppShell retained
- [ ] Responsive verify: 320/360/390/430/768/1024/1280px LTR + Urdu RTL, no horizontal scroll, 44px targets

## B. Order Experience (time, estimates, live graphs)
- [ ] New Order live price + estimate line + min/max qty + animated cumulative-delivery preview (views + likes/comments line)
- [ ] Growth Package ratio control (default 3%, min 10)
- [ ] Advanced delivery details accordion (run-by-run)
- [ ] Controls: duration 15m–72h, curves (Steady/Slow start/Bell peak/Natural wave), variation 0–30%, start delay, per-run limits
- [ ] Order detail: progress ring, ETA countdown, timeline, live Planned vs Delivered graph (Realtime + 20s polling), Pause/Resume/Cancel (refund undelivered)
- [ ] Orders list sparkline + progress
- [ ] Customer min 10 merged up to provider min with message

## C. Math Scheduler + AI Assist
- [x] Rewrite lib/schedule.ts deterministic seeded generator (exact sums, mins, determinism, no overlap, seeded variation, maxRuns cap, window cap)
- [~] Likes/comments lagging components of same window (lagRuns helper added; UI wiring baaqi)
- [x] `npm run test:schedule` + passing (2007 assertions)
- [ ] Ask Wazeo AI box (lib/ai.ts, safe fallback, cached, validates against real services) → strict JSON + estimate explanation
- [ ] Admin > Integrations shows AI status (calls/errors/fallback)

## D. Splash, Login, Access Keys
- [x] Splash: animated logo, spinning ring, no text, ≥600ms
- [x] Sign-in glass card, round method buttons (Google/X/GitHub/Email, "Not set up yet" if unconfigured), provider-verified emails count verified, invite-only key gate
- [ ] docs/OAUTH_SETUP.md (Roman Urdu)
- [x] Invitation key flow: validating spinner, result card (plan, days/Permanent, features chips), "Key validated" popup, email(bound)/password strength/OTP/animated welcome
- [x] Generic errors, rate limit 5/10min; keys get access_days/plan_name/features/bind-on-first-use; profiles access_expires_at/plan/features; header/sidebar "Access left"; expired blocks new orders with "Renew with a new key"; admin create/extend/revoke
- [x] Simpler normal signup: sirf email/password/confirm + terms; username auto-generated; country server-side; referral via /r/<code> cookie

## E. Native Popups & Services Menu
- [x] Replace remaining native datalist/select/browser popups with WazeoSelect (sign-up country, AccessKeyRedeem country, LanguageSwitcher, AppShell lang, AdminPaymentMethods/Providers/Settings/Users)
- [ ] Platform logo cards (Instagram/TikTok/YouTube inline SVG) → animated accordion categories/services on phones

## F. Payment Methods & Deposit
- [ ] Admin payment methods manager (add/edit/reorder/enable/logo/country/currency/rate/min/max/bonus/instructions/QR + approve/reject queue + proof preview/history)
- [ ] Seed logo badges, inactive until real details
- [ ] Country groups: India(UPI/PhonePe/GPay/Paytm/Bank), Pakistan(JazzCash/Easypaisa/SadaPay/NayaPay/Meezan/HBL/UBL/Bank), Bangladesh(bKash/Nagad/Rocket), China(Alipay/WeChat), Global(Binance/USDT TRC20/BEP20/BTC/PayPal/Payoneer/Other)
- [ ] Deposit page: country tabs (detected first), minimums 10 INR/1 USD/10 PKR, live conversion, DEMO placeholder + banner "Deposits are not enabled yet. Do NOT send any money." + disabled submit until real details

## G. Order Modes, Demo Rules, Currency
- [ ] Bulk Add (one link per line, per-line validation) + Combo (views/likes/comments + optional shares/saves) in New Order
- [ ] is_demo services unorderable when provider LIVE unmapped (place_order SQL + API), admin banner, "Selling below cost" warning
- [ ] One shared currency formatter; every figure updates on switch

## H. Admin & Providers
- [ ] Overview upgrade: KPI cards+trends, live activity feed, needs-attention one-click, quick actions, system health, notes
- [ ] Users: notes, custom discount, CSV export, verification + key origin, view-as-user banner
- [ ] Payment queue, tickets inbox (replies/canned), global search Ctrl+K, notification center, broadcast (schedule + country targeting)
- [ ] Modules page (on/off switches only)
- [ ] Provider settings: URL, masked key, test connection, services sync, order status, refill, cancel, balance, retries, markup, priority, fallback, low-balance alerts, mock/live

## I. Graphs Always Visible
- [ ] Customer: views over time, likes over time, views vs likes, orders/day, spend, platform split
- [ ] Admin: revenue vs profit, orders/day, new users, verification funnel, countries, platforms, top services, deposits/method, keys, tickets
- [ ] Zero baseline + "Your chart will grow with your first order"; draw-in, touch/hover tooltips, theme aware, lazy-loaded

## J. Pages, Maintenance, Support
- [ ] Privacy/Refund/Owner as editable Admin > Content with default text (template labels); owner page blocks for later fill
- [ ] Working /maintenance page with admin bypass + Settings switch
- [ ] Support hub: Admin > Settings (WhatsApp/Telegram/email/hours) → floating button + /support inline SVG logos + online/offline badge

## K. Finish & Publish
- [ ] Add all new text to 5 locales (en/ur/hi/fr/zh)
- [ ] Run lint, build, i18n:check, check, check:layout, test:schedule, test:otp — fix all failures
- [ ] Update seed, STATUS.md, FEATURES.md, docs/ADMIN_GUIDE.md, write MANUAL_STEPS.md (Roman Urdu)
- [ ] Commit + push master; Vercel deploys

## Status legend
- [x] DONE  ·  [~] PARTIAL  ·  [ ] MISSING
