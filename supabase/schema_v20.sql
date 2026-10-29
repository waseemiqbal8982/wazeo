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

-- Login methods (default: all social providers OFF, email+password ON).
insert into public.settings (key, value) values
  ('login_google_enabled', 'false'),
  ('login_twitter_enabled', 'false'),
  ('login_github_enabled', 'false'),
  ('login_email_password_enabled', 'true')
on conflict (key) do nothing;

-- Per-service delivery run-size bounds (optional overrides of quantity min/max).
alter table public.services add column if not exists run_min numeric;
alter table public.services add column if not exists run_max numeric;

-- Minimum delivery duration (minutes) for gradual orders (default 15).
insert into public.settings (key, value) values
  ('min_delivery_duration', '15')
on conflict (key) do nothing;

-- Allow the custom (drawn) curve value in stored orders.
alter table public.orders drop constraint if exists orders_curve_check;
alter table public.orders add constraint orders_curve_check check (curve in ('steady','slow_start','bell_peak','natural_wave','custom'));
