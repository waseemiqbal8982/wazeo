# MANUAL_STEPS — Wazeo (Roman Urdu)

Manually verify / configure things that need a live project or a human.

---

## Item 1 — Users stay signed in

### Supabase Auth sessions (check these)
1. Supabase Dashboard → **Authentication → Sessions**.
2. Make sure there is **no** "Inactivity timeout" set (it should be 0 / off).
3. Make sure there is **no** "Time-box" / max session duration set (it should be off).
   - If either is set, users will be signed out automatically after that window —
     that would override the app's "Stay signed in" cookies.
4. Optional: set **Access Token lifetime** to a comfortable value (default 3600s is fine).

### App-level check
- Sign in, check the box "Keep me signed in" (default is ON), close the browser,
  reopen it, and confirm you are still signed in.
- Leave the tab open for 1.5–2 hours; confirm you are NOT signed out (cookies are
  renewed through the proxy).

---

## Item 2 — No email at sign-up (switch OFF)

### Admin Settings → Security
1. Admin → **Settings → Security**.
2. **Require email verification at sign-up** — default OFF. When OFF, sign-up
   creates a confirmed user (admin API, `email_confirm` true), no verification email
   is sent, and the user lands signed-in on the dashboard.
3. **Mark all existing users as verified** — bulk action (audit-logged); use it
   when turning the switch off so previously-unverified users aren't stuck.
4. **Disposable email domains** — comma-separated list; sign-ups using these are
   blocked (always on).

### Supabase Redirect URLs
1. Supabase Dashboard → **Authentication → URL Configuration → Redirect URLs**.
2. Add your site URL (e.g. `https://wazeo.vercel.app`).
3. Add `https://wazeo.vercel.app/reset-password` (and the same for localhost in dev).
   - The reset email link goes through `/auth/callback?next=/reset-password`, so
     `/auth/callback` must also be allowed (it is).

### Reset password email template
1. Supabase Dashboard → **Authentication → Email Templates → Reset Password**.
2. Paste the contents of `docs/EMAIL_TEMPLATE_RESET.html` into the template.
   - The template uses `{{ .ConfirmationURL }}` — keep that placeholder.
3. Save.

### Test password reset
- "Forgot password" → generic "If this email exists, we sent a link" message.
- Rate limit: 3 requests per hour per email.
- Open the link → it opens `/reset-password` through `/auth/callback`.
- Set a new password, strength bar shows, user is signed in → dashboard.

---

## General deployment note
- Run `npm run db:setup` on the live Supabase project after SQL schema changes
  (e.g. the new `settings` rows for security/login-method switches and delivery
  minimums/maximums).
