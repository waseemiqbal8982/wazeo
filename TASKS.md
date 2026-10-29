# TASKS — Wazeo (Roman Urdu)

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
