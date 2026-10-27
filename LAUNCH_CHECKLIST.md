# 🚀 WAZEO — LAUNCH CHECKLIST (Roman Urdu)

Jab aap live-jane ke liye tayyar ho, to ye checklist tareeqe se follow karo.

---

## 1. Vercel import

1. https://vercel.com → **Add New Project** → GitHub se `wazeo` repo select karo.
2. Framework khud detect hoga (Next.js). Kuch change mat karo.
3. **Environmental Variables** me ye exact names paste karo (values `.env.local` se copy karo):

| Name | Value kahan se |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` (secret) |
| `PROVIDER_API_URL` | `.env.local` (khali = mock) |
| `PROVIDER_API_KEY` | `.env.local` |
| `MERCURY_BASE_URL` | `.env.local` |
| `MERCURY_API_KEY` | `.env.local` |
| `MERCURY_MODEL` | `.env.local` |
| `CRON_SECRET` | `.env.local` se (wohi value) |

4. **Deploy** dabao. URL milega `https://wazeo-xxxx.vercel.app`.

---

## 2. Supabase Auth redirects

Supabase → **Authentication → URL Configuration**:
- Site URL: `https://wazeo-xxxx.vercel.app`
- Redirect URLs:
  - `https://wazeo-xxxx.vercel.app`
  - `http://localhost:3000`

---

## 3. GitHub Actions (5-min cron)

GitHub repo → **Settings → Secrets and variables → Actions**:
- **Secret:** Name `CRON_SECRET` → value `.env.local` ke `CRON_SECRET=` se copy karo.
- **Variable:** Name `DEPLOYMENT_URL` → value `https://wazeo-xxxx.vercel.app`.

---

## 4. Live site par 15-point test

- [ ] 1. Landing page khulti hai
- [ ] 2. Sign up kaam karta hai (email verification link aata hai)
- [ ] 3. Sign in kaam karta hai
- [ ] 4. `/dashboard` balance + stats dikhte hain
- [ ] 5. Services browse + favorite toggle
- [ ] 6. New Order (instant) place hota hai — balance katta hai
- [ ] 7. New Order (drip) — schedule preview graph dikhta hai
- [ ] 8. Orders list + search + filter
- [ ] 9. Order detail — timeline + graph + chunks table
- [ ] 10. Manual "Refresh" order status update karta hai
- [ ] 11. Add Funds — screenshot upload hota hai
- [ ] 12. Admin → Sync services (mock list aati hai)
- [ ] 13. Admin → Payment approve/reject balance add karta hai
- [ ] 14. Tickets — open karo, AI reply aata hai
- [ ] 15. Settings — theme switch + reduce animations + password change

---

## 5. ⚠️ Going live se PEHLE — keys ROTATE karo

Live hone se pehle **Supabase service_role key aur database password naya (rotate) karo**:

- **service_role key:** Supabase → **Settings → API** → `service_role` ke aage **"Rotate"** dikhao / naya generate karo.
- **Database password:** Supabase → **Settings → Database** → **Reset database password**.
- Phir nayi values `.env.local` **aur** Vercel dono me update karo.

> 🎉 When sab green ho jaye — you are live!
