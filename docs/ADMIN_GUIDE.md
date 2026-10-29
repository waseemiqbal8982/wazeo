# 📘 ADMIN GUIDE — Wazeo (simple Roman Urdu)

Ye guide admin ke liye hai. Har step aasan hai.

## 1. Admin kis tarah login karta hai
- Admin sirf woh emails hain jo `ADMIN_EMAILS` env me hain (aur `role = admin`).
- Vercel par env `ADMIN_EMAILS` me apne emails comma se alga karke daalo.
- Login karo → `/admin` par jaoge. Baki sab ko 404 milega.

## 2. Access Keys — key kaise banayein, kya bhejein, customer kya dekhta hai
- `/admin/keys` page par jao.

### Generate form ke fields
- **Email** (optional band binding ke liye), **Label**, **Plan name** (e.g. Starter/Pro).
- **Access days**: 7 / 30 / 90 / 365 / **Permanent** / Custom (number).
- **Features** (chip button se): modules jo key unlock karta hai (Combo, Bulk, Growth, Likes, Scheduler, Referral, etc).
- **Starting balance (USD)**: redeem par customer ke wallet me credit hota hai.
- **Redemption deadline** (key kabb tak redeem ho sakti hai), **Redemption expiry (din)**, **Note**.
- Naya key **sirf ek baar** dikhta hai — "Copy key" ya "Copy ready-to-send message" dabao aur customer ko bhejo. Message me key + plan + days hote hain.

### Customer kya dekhta hai (sign-in → "I have an access key")
1. Ek chhota box: key daalo (auto-uppercase + auto-format WZ-XXXX-XXXX-XXXX) → Continue.
2. Popup: "Validating your key..." (≥1.2s) → success: plan name, "Access: N days / Permanent", date until it works, feature chips.
3. Doosra compact step: sirf **email + password** (strength bar). Agar key kisi email se bound hai to woh email pre-filled + read-only hai.
4. "Activate my access" → account banta hai, key used mark hoti hai, `access_expires_at = now + access_days`, plan/features save hote hain.

### Verification rule
- Agar key email se **bound** hai aur customer ne wohi email daala → account verified (admin ne key usi ko di thi). No OTP.
- Agar key **unbound** hai → OTP bheja jata hai (verify before dashboard).
- Admin > Settings > **"Require email verification code for key accounts"** switch (default OFF) → ON karo to har key account par force OTP.

### Key statuses
Active / Used / Expired / Revoked. Admin **Revoke / Regenerate** kar sakta hai.

### Per-user access (Access left)
- Dashboard header + sidebar me **"Access left: N days / Unlimited"** dikhta hai.
- Access expire hone par sirf **naye orders block** hote hain; history + "Renew with a new key" rehti hai.
- Admin > Users drawer / Actions me **Extend access** (days ya Permanent) aur **Revoke access** kisi bhi user ke liye.

### Invite-only
- Toggle ON → plain signup band, sirf key walay account bana sakenge.

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
