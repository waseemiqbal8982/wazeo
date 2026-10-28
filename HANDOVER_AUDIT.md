# 🩺 HANDOVER AUDIT — Wazeo
# Roman Urdu me — code parh kar verily kiya gaya (STATUS.md par bharosa karke NAHI)

> Ye audit Step-1 ka deliverable hai. Har item code me dekh kar DONE / PARTIAL / MISSING
> mark kiya gaya hai. `npm run lint` (0 errors, 38 warnings) aur `npm run build` pass hain.

## Qual: aur environment
- `npm run lint` → 0 errors / 38 warnings (unused imports + exhaustive-deps).
- `npm run build` → pass (Compiled successfully).
- `npm run check` → env/tables/RLS green (provider MOCK, Mercury unconfigured).
- Git: branch `master`, origin/master connected. Uncommitted kaam maujood:
  `app/api/admin/keys/`, `app/api/auth/key-redeem/`, `supabase/schema_v14.sql`,
  signup route + AdminSidebar changes (guzishta session se — abhi tak push NAHI hua).
- ⚠️ `supabase/schema_v14.sql` (access_codes columns + profiles.access_key_id) **ALL_IN_ONE.sql me merge NAHI hua** — db:setup ke baad DB me ye columns nahi honge.

## Checklist (code parh kar verily)

| # | Feature | Halat | Note (kahan dekh kar) |
|---|---|---|---|
| A | Access Key System | **PARTIAL** | Backend admin API (`/api/admin/keys`: generate/bulk/revoke/regenerate/deleteExpired/setInvite/CSV) + redeem route (`/api/auth/key-redeem`: constant-time compare, rate-limit 5/10min, atomic claim `eq(uses,0)`, generic error, temp-password mode, audit) **maujood hain**. Lekin: (1) `schema_v14` merge NAHI hua; (2) **`/admin/keys` page MISSING** (sidebar link hai, page nahi → 404); (3) **customer sign-in par key flow + invite-only UI MISSING**; (4) admin Users par key origin display verily nahi kiya. Tests (test:login/keys) nahi bane. |
| B | Email verification end-to-end | **DONE** (code) | `/verify-email` OTP panel (auto-focus/paste/shake/checkmark), `/auth/callback` link flow, `resend-code` 60s cooldown, `verify-otp` wrong-attempt limit, middleware + layouts + API gating (unverified redirect), admin Verified badge/filter/Mark-verified/Resend + Overview verification funnel — sab maujood. Live E2E digest abhi SMTP/Resend manual setup par depend karta hai (docs/EMAIL_SETUP.md). |
| C | Support Hub | **PARTIAL** | `ContactFab` (floating, every page) + public `/support` page + `lib/support.ts` maujood. Admin Support settings (WhatsApp/Telegram/email/working hours/welcome stored in DB) — AdminSettings me confirm nahi kiya, "online/offline badge" derive karne ka mechanism verily nahi. |
| D | Currency | **PARTIAL** | One shared context/store (`lib/currency-store.tsx`), Intl formatter, header/wallet/landing switcher, admin editable rates (auto-refresh API) maujood. Lekin page-by-page conversion (orders/add-funds/services/admin figures) abhi partial hai per STATUS. |
| E | Deposit page by country | **PARTIAL** | `AddFundsPage` exists (screenshot upload + history + DEMO banner + disabled submit). Countries tabs (PK/IN/BD/CN/Crypto/Bank/Other), method logo badges (JazzCash/UPI/bKash/Alipay/USDT/PayPal...), proof/TXID flow + status tracker + receipts, admin methods manager + approve/reject queue — abhi verify/complete nahi. |
| F | Starter services | **MISSING** | Seed sirf 9 services insert karta hai (na ki 15–20 IG + 8 TT + 8 YT cheap starter services) aur sirf jab services table khali ho (`count>0 → skip`). is_demo flag schema me hai, lekin seed demo flag + drip min-10 + cheap PKR/INR pricing ke sath starter set nahi deta. |
| G | New Order page | **PARTIAL** | Platform icon tabs + grouped service dropdown (currency-aware) + live price summary + confirm modal + Instant/Drip modes — DONE. **Bulk + Combo modes MISSING** (sirf Instant/Drip hain). Natural-variation slider bhi nahi. |
| H | Themes | **DONE** | 8 accent themes (purple/cyan/emerald/rose/amber/ocean/crimson/AMOLED black) + light, saved on profile + cookie + localStorage, reduce-motion honored. |
| I | Admin panel power | **PARTIAL** | Menu items par **distinct SVG icons nahi** (sirf dot), animated Wazeo logo in admin bar nahi. Overview (KPI trends/charts/live feed/needs-attention/quick actions/health/notes-goals/show-hide/reorder) basic hai. Users CSV + key origin + temp-password + sign-out-everywhere partial. Payment methods CRUD nahi. Tickets canned replies nahi. Services bulk tools nahi. Global search (Ctrl+K) admin shell me hai. Broadcast scheduling/country targeting nahi. Maintenance switch nahi. Run-cron-now nahi. System page (audit log + JSON export) hai. |
| J | Graphs everywhere | **PARTIAL** | Admin Overview me verification funnel card hai; OrderDetail me chart hai. Lazy-load + empty-state zero-baseline caption + draw-in + touch/hover tooltips + all required charts (customer: views/likes over time, views-vs-likes, orders/day, spend, platform split; admin: revenue vs profit, orders/day, new users, users by country, top services, deposits/method, keys generated-vs-used, tickets over time) — **mukammal nahi**. |
| K | Mobile | **PARTIAL** | Floating bottom pill nav, header (avatar/flag/country/username/email/lang), WazeoSelect everywhere, 44px targets, reduce-motion, contact fab above bar — hain. Tables→cards conversion + 360/390/768/1440 full audit + Urdu RTL deep flip (sidebar/dropdowns) partial. |

## Khaas tech debt / risks
1. `schema_v14` merge nahi → access key tables/columns DB me nahi milenge (Block A ka sab se pehla fix).
2. `app/admin/keys` aur `app/admin/cms` sidebar me hain lekin pages maujood nahi → 404.
3. Uncommitted Block-A backend kaam push nahi hua — commit + push zaroori.
4. Admin/keys route main `hashKey`/`last4` helpers hash + store karte hain; key full-kabhi/ kahi log nahi hota (achie).
5. Email E2E live test ke liye Resend/SMTP + DNS manual setup chahiye (docs/EMAIL_SETUP.md).
