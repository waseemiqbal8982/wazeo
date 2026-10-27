# 🧪 TEST_CHECKLIST — Wazeo (Roman Urdu)

Local test ke liye: `npm run dev` → http://localhost:3000

## 30 clicks / checks

1. Landing page khulti hai (hero + 3 features).
2. Header me language switcher dikhta hai → **English** select karo.
3. **اردو (Urdu)** select karo → poora landing **RTL** flip ho jata hai (side se).
4. **हिन्दी** select karo → Hindi text.
5. **Français** select karo → French text.
6. **中文** select karo → Chinese text.
7. Sign up karo (username/email/password) → email verify.
8. Sign in karo.
9. `/dashboard` → balance + stats + recent orders.
10. Services page → browse + favorite toggle.
11. New Order (Instant) → service, link, quantity → Place order → balance katta hai.
12. New Order (Drip) → duration + curve → preview graph dikhta hai.
13. Order detail → timeline + planned-vs-delivered chart + chunks.
14. Manual Refresh → status update.
15. Add Funds → screenshot upload hota hai.
16. Settings → language switch (wapsi) → theme switch → reduce animations → password change.
17. Tendts → new ticket kholo → AI reply aata hai.
18. Admin → Sync services (mock list).
19. Admin → Users → adjust balance (audit log ban't hai).
20. Admin → Payments → approve → balance add hota hai.
21. Admin → Orders → refund → balance wapsi.
22. Admin → Settings → payment_methods save.
23. Public tracker: `/tracker` me order ID daalo → status + progress.
24. Public price list: `/services` (without login) search karo.
25. Admin → Translations page (agar bani) → key search + edit.
26. Maintenance mode on/off (admin setting) → site pe message.
27. Staff role limits (permissions) — bana ho to check.
28. Coupon field on Add Funds (agar bana ho).
29. Loyalty progress bar on dashboard (agar bana ho).
30. `npm run lint`, `npm run build`, `npm run i18n:check`, `npm run check` → sab green.

> 📌 Jo features "agar bana ho" likhe hain — wo is stage me partial/ya mock test hain.
