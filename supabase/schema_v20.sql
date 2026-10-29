-- ============================================================================
-- schema_v20 — Prompt 26 Item 2: sign-up email-verification switch + disposable
-- email domain list + security defaults.
-- ============================================================================

-- Admin setting: require email verification at sign-up (default OFF).
-- OFF -> sign-up creates a confirmed user (no verification email), signs in,
--        opens the dashboard. ON -> the legacy OTP / link flow is required.
insert into public.settings (key, value) values
  ('require_email_verify_at_signup', 'false')
on conflict (key) do nothing;

-- Editable list of disposable-email domains rejected at sign-up (JSON array).
insert into public.settings (key, value) values
  ('disposable_email_domains', '["mailinator.com","10minutemail.com","guerrillamail.com","sharklasers.com","temp-mail.org","throwawaymail.com"]')
on conflict (key) do nothing;
