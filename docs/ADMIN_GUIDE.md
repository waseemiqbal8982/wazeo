# 📘 ADMIN GUIDE — Wazeo (simple Roman Urdu)

Ye guide admin ke liye hai. Har step aasan hai.

## 1. Admin kis tarah login karta hai
- Admin sirf woh emails hain jo `ADMIN_EMAILS` env me hain (aur `role = admin`).
- Vercel par env `ADMIN_EMAILS` me apne emails comma se alga karke daalo.
- Login karo → `/admin` par jaoge. Baki sab ko 404 milega.

## 2. Access Keys (Block A) — admin ka kaam
- `/admin/keys` page par jao.
- **Generate keys:** ek email daalo (ya kai emails comma/space se), label, expiry (din), starting balance (USD), note, aur mode:
  - **User sets own password** → customer khud password banayega (recommended).
  - **Admin creates account (temp password)** → account bana diya jayega aur ek temporary password dikhaya jayega (sirf ek baar). Customer ko force kiya jayega password badalne par.
- **Bulk generate:** ek line par ek email paste karo → Bulk generate.
- Naya key **sirf ek baar** dikhta hai — turant "Copy key" ya "Copy ready-to-send message" dabao aur customer ko bhejo.
- **Actions:** Active/Expired key ko Revoke ya Regenerate kar sakte ho. "Delete expired" purani keys saaf karta hai.
- **Invite-only toggle:** ON karo to plain signup band ho jayega — sirf key walay account bana sakenge.
- **CSV export:** sab keys download karo.
- Customer side: sign-in page par "I have an access key" → key, email, username, password, country, phone → redeem → OTP verify → account ready.

## 3. Zaroori manual steps (copy-paste)
1. **Supabase schema apply karo** (project folder me):
   ```
   npm run db:setup
   ```
2. **Supabase email template:** `docs/EMAIL_TEMPLATE.html` — Supabase > Auth > Email Templates me confirm-email template me paste karo (OTP code + link).
3. **Resend SMTP / innvera.shop DNS:** `docs/EMAIL_SETUP.md` follow karo (email verify ke liye zaroori).
4. **Vercel env:** `ADMIN_EMAILS` aur `NEXT_PUBLIC_SITE_URL` (https://innvera.shop) set karo — `docs/ENV_CHECKLIST.md` dekh lo.
5. **Support settings:** Admin > Settings > Support me WhatsApp number, Telegram link, email, working hours, welcome message bharo. Yehi links "Request a key" button me bhi use hote hain.

## 4. Daily work
- Overview par KPI + charts; Users par balance adjust/ban/temp-password/reset-email; Orders par refund; Services par markup/active/demo; Payments approve/reject.
- Har admin action `audit_logs` me likha jata hai (Admin > System > Audit log).

## 5. Important
- Koi bhi full key store nahi hota — sirf hash + last 4. Key kho jaye to "Regenerate" karo.
- Deposit page abhi DEMO hai — payment details asli nahi hain, sirf jab admin real methods daale tab active hoga.
