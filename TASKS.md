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
- [ ] Rewrite lib/schedule.ts deterministic seeded generator (exact sums, mins, determinism, no overlap, one pending chunk/link)
- [ ] Likes/comments lagging components of same window
- [ ] `npm run test:schedule` + passing
- [ ] Ask Wazeo AI box (lib/ai.ts, safe fallback, cached, validates against real services) → strict JSON + estimate explanation
- [ ] Admin > Integrations shows AI status (calls/errors/fallback)

## D. Splash, Login, Access Keys
- [ ] Splash: animated logo, spinning ring, no text, ≥600ms
- [ ] Sign-in glass card, round method buttons (Google/X/GitHub/Email, "Not set up yet" if unconfigured), provider-verified emails count verified, invite-only key gate
- [ ] docs/OAUTH_SETUP.md (Roman Urdu)
- [ ] Invitation key flow: validating spinner, result card (plan, days/Permanent, features chips), "Key validated" popup, name/email(bound)/password strength/profile/OTP/animated welcome
- [ ] Generic errors, rate limit 5/10min; keys get access_days/plan_name/features/bind-on-first-use; profiles access_expires_at/plan/features; header/sidebar "Access left"; expired blocks new orders with "Renew with a new key"; admin create/extend/revoke

## E. Native Popups & Services Menu
- [ ] Replace remaining native datalist/select/browser popups with WazeoSelect
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
