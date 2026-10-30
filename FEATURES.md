# ✨ FEATURES — Wazeo (Roman Urdu)

Marking: ✅ WORKING · 🟡 PARTIAL (mock/limited) · ❌ NOT BUILT

## Customer side
- ✅ Auth (signup/signin/reset/verify, rate limits)
- ✅ Landing (3 platforms, features, FAQ, footer)
- ✅ Dashboard (stats count-up, announcements, notifications, recent orders)
- ✅ Services browse + favorites
- ✅ New Order — Instant (atomic balance, auto-refund on provider fail)
- 🟡 New Order — Drip (schedule preview, curve) — UI bana hai, package/growth combo nahi
- ✅ Orders list + detail (timeline, chart, chunks, refresh)
- ✅ Add Funds (upload proof) + history
- ✅ Tickets + AI support route (transient reply)
- ✅ Settings (theme, reduce motion, language switch, password, referral code)
- ❌ Public price list (no login) — nahi bana
- ❌ Public order tracker — nahi bana
- ❌ Daily check-in, loyalty progress bar, referral dashboard — tables hain, UI nahi
- ❌ Mass Order / Repeat / Schedule-later — nahi bana
- ❌ "Ask Wazeo AI" order assistant — nahi bana
- ❌ Command palette, onboarding tour, PWA, API key page — nahi bane

## Admin side
- ✅ Admin shell: grouped collapsible sidebar, top bar search (Ctrl+K), breadcrumbs
- ✅ Overview (stats)
- ✅ Users (adjust/ban/make-admin)
- ✅ Access Keys (admin /admin/keys): generate single/bulk, expiry, starting balance, mode self/admin, revoke/regenerate/delete-expired, filters/search, CSV export, counters + chart, invite-only switch, full key shown once with copy + ready-to-send message — NEW
- ✅ Customer key redeem: sign-in "I have an access key" flow (key, email, password strength, username, country, phone) → /verify-email; "Request a key" → WhatsApp/Telegram — NEW
- ✅ Orders (refund, refresh)
- ✅ Services (sync, markup, active)
- ✅ Payments (approve/reject + proof)
- ✅ Tickets reply
- ✅ Announcements
- ✅ Settings (basic)
- ✅ Providers (add/edit/disable, masked key, mock/live) — NEW
- ✅ Coupons & Loyalty (coupons CRUD + levels) — NEW
- ✅ Translations (override per language, reset, missing report) — NEW
- ✅ System (status, audit log, error log, JSON export) — NEW
- ✅ Audit logging on key admin actions (via RPC + audit())
- ❌ Users: notes, discount/rates per user, CSV export — nahi
- ❌ Orders: bulk actions, profit, flagged queue — nahi
- ❌ Services categories tree + drag reorder + CSV import/export — nahi
- ❌ Payments methods manager UI (table hai, UI nahi), receipts — nahi
- ❌ Content CMS (About/FAQ/Terms editor), testimonials manager UI — fehri hain, UI nahi
- ❌ Appearance/Branding (logo/favicon/SEO/custom CSS) — nahi
- ❌ Integrations (Mercury settings UI, webhooks, SMTP) — nahi

## i18n
- 🟡 5 languages system + RTL (Urdu) + switcher (landing/settings) + i18n:check ✅
- 🟡 Coverage: landing + nav + common + settings translated; dashboard/orders/wallet/admin zyada tar English (fallback)

## Quality (abhi)
- ✅ `npm run lint` → 0 errors
- ✅ `npm run build` → pass
- ✅ `npm run i18n:check` → pass
- ✅ `npm run check` → env/tables/RLS/build all green (provider MOCK, Mercury unconfigured)
- ✅ `npm run db:setup` → pass (schema_v1..v5 merged)

## Latest updates (Parts 1-8)
- ✅ Email OTP verification: signup → animated "Check your email" panel with 6-box OTP (auto-focus/advance/paste/backspace, shake on wrong), 60s resend countdown, "wrong email?" link, 5 wrong per 10-min limit, expiry message, success checkmark + redirect. Verification link via `/auth/callback` also works. `docs/EMAIL_TEMPLATE.html` + `docs/EMAIL_SETUP.md` (Resend/Hostinger/forabase SMTP).
- ✅ Save ALL signup data: profiles me username, email, phone, country (+flag), language, currency, referral_used, signup time, last login. schema_v11 backfill; Admin Users table + profile drawer show every field.
- ✅ Admin gating: `/admin` + admin APIs only for emails in `ADMIN_EMAILS` AND role admin; others get 404, no admin nav shown. Signup can't set role; make-admin script only.
- ✅ Support Hub: DB-backed settings (WhatsApp/Telegram/email/working hours/welcome), floating contact button on every page with online/offline badge, public `/support` page with FAQ + contact form → ticket.
- ✅ Currencies: USD/INR/PKR/CNY (symbol+flag), Intl formatting (4 decimals for tiny), editable rates in Admin (auto-refresh via free API), switcher in header + landing, wallet chip shows chosen currency.
- ✅ Mobile/animations: modal/nav safe-area, overflow-x guard, touch tap targets, glow-trail buttons, desktop card tilt, animated sidebar indicator, sliding page transitions (reduce-motion honored).

## Latest updates (prompt 32b)
- ✅ Access keys encrypted at rest (AES-256-GCM, `KEY_ENCRYPTION_SECRET`) — admin sees the full key (monospace + copy) behind the Admin PIN gate; lookup uses a keyed HMAC hash; legacy hash-only keys marked Legacy + one-click Regenerate; each list view writes an `admin_keys_view` audit entry.
- ✅ Password-less server-side sign-in on key bind: `admin.generateLink` (magiclink, no email sent) + `verifyOtp` on the server set the normal session cookies; `STAY_SIGNED_IN_COOKIE` maxAge 400 days; OTP fallback if magic-link verification fails.
- ✅ `key_sessions` table records per-key device/ip sessions (foundation for a per-key device cap + Admin "Reset devices").

