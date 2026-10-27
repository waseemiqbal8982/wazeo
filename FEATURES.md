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
