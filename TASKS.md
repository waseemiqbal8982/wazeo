# TASKS — Wazeo (Roman Urdu)

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
- [ ] **Item 4 — No instant orders, draw your own delivery curve**
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
