# 📧 Wazeo — Email Setup (Supabase + Resend) in Roman Urdu

Is guide me hum batayenge ke Wazeo ke signup confirmation emails (6-digit OTP) ko
Supabase se **Resend** ke zariye kaise send karein. Is se emails real honge, spam
me nahi jayenge, aur confirmation links bhi kaam karenge.

> ⚠️ Zaroori: Agar aap ye setup nahi karte, to Supabase ki default emails use
> hoti hain (slow, limit). Resend setup karne ke baad aap apna branded dark
> template (see `EMAIL_TEMPLATE.html`) use kar sakte hain.

---

## 1. Free Resend account banaein

1. Kholen: https://resend.com aur **Sign up** karein (email ya GitHub se).
2. Dashboard me jayen, left sidebar me **API Keys** par click karein.
3. **Create API Key** dabayen. Name likhen (masalan `supabase-smtp`) aur
   permission **Full access** rakhen.
4. API key copy karke mehfooz jagah rakhen (ye sirf ek baar dikhti hai!).

---

## 2. Domain verify karein (innvera.shop) — Hostinger me DNS records

1. Resend me left sidebar se **Domains** → **Add Domain** par click karein.
2. Apna domain likhen: `innvera.shop` aur **Add** dabayen.
3. Resend aapko kuch DNS records dikhayega. Inhe copy kar lein:
   - **SPF** (TXT record)
   - **DKIM** (TXT record, 3 values)
   - **MX** (agar kaha jaye)
   - **Return-Path** (CNAME) — optional lekin recommended
4. Ab **Hostinger** me jayen (https://hpanel.hostinger.com) → apna account →
   **Domains** → `innvera.shop` → **DNS / Nameservers** → **DNS records**.
5. Wahan **Add record** karke har Resend record ko exactly waise hi dalen:
   - Type: `TXT` → Name: (jaisa Resend bole) → Value: (Resend ki value)
   - Type: `CNAME` ya `MX` agar Resend ne bola ho.
6. Sab records dalne ke baad Resend me wapas jayen aur **Verify** dabayen.
   DNS propagate hone me 5 min se 24 ghante lag sakte hain. Jab sab green ho
   jayen to domain verified hai.

> 💡 Hint: Agar Resend "Pending" dikhata rahe to thodi der wait karein ya
> `dig TXT innvera.shop` (ya online DNS checker) se confirm karein.

---

## 3. API key / SMTP credentials

Resend do tareeqe deta hai — dono chalenge:

- **Option A (API key):** Jo key upar banayi thi wahi use karein.
- **Option B (SMTP):** Resend ke **SMTP** page se:
  - Host: `smtp.resend.com`
  - Port: `465` (TLS) ya `587` (STARTTLS)
  - Username: `resend`
  - Password: (aapki API key)

---

## 4. Supabase me SMTP Settings

1. Supabase Dashboard kholen → apna project → left sidebar me **Authentication** →
   **Email Templates** (ya **Settings → Auth → SMTP**).
2. **SMTP Settings** me **Enable custom SMTP** ON karein.
3. Ye fields bharein:
   - **Host:** `smtp.resend.com`
   - **Port:** `465` (ya `587`)
   - **Username:** `resend`
   - **Password:** (Resend ki API key)
   - **Sender email:** `support@innvera.shop` (ya koi verified sender)
   - **Sender name:** `Wazeo`
4. **Save** karein. Supabase **Send test email** ka button deta hai — usse check
   karein ke email aata hai.

---

## 5. Confirm signup template lagaen

1. Supabase → **Authentication** → **Email Templates** → **Confirm signup**.
2. **Subject:** likhen — `Confirm your signup — Wazeo`
3. **HTML content:** me apne `docs/EMAIL_TEMPLATE.html` ka poora HTML paste
   karein.
4. **Save** karein.

> ✅ Template me `{{ .Token }}` use hota hai jo 6-digit OTP dikhata hai.
> Link wala button `{{ .ConfirmationURL }}` use karta hai — dono kaam karte hain.

---

## 6. OTP expiration = 600 seconds

1. Supabase → **Authentication** → **Sign In / Up** → **Email OTP expiration**.
2. **600** set karein (10 minutes) → Save.

---

## 7. Test

1. Wazeo ki `/sign-up` page se ek naya account banaein.
2. "Check your email" panel aayega. Inbox me 6-digit code check karein.
3. Code dalein — verify ho kar dashboard par redirect hona chahiye.
4. Link wala button bhi test karein (email me "Verify my account") — ye bhi
   verify karke dashboard par le aana chahiye.
5. Agar email nahi aata: spam folder check karein, SMTP settings phir se dekhein,
   aur Resend dashboard me **Logs** → **Emails** se status dekhein.

---

## Troubleshooting

| Problem | Hal |
| --- | --- |
| Email nahi aata | Spam check karein, SMTP settings verify karein, Supabase test email bhejein |
| "Pending" DNS | 24 ghante tak wait karein, DNS records dobara check karein |
| Code expired | OTP expiration 600 set karein, resend button use karein |
| Link kaam nahi karta | `NEXT_PUBLIC_SITE_URL` Vercel me sahi set karein (auth/callback route par le jaata hai) |
