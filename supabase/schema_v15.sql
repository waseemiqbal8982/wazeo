-- ============================================================
-- Wazeo — schema_v15
-- Adds: email_otps (OTP policy store), payment_methods (admin-
-- controlled deposit methods), and new settings keys (OAuth,
-- branding/SEO/SMTP, maintenance, default theme, owner page).
-- Backward-compatible: all statements are idempotent.
-- ============================================================

-- ------------------------------------------------------------
-- email_otps — server-side OTP policy (cooldown / attempts)
-- Used by /api/auth/verify-otp and /api/auth/resend-code to
-- enforce resend cooldown, attempt limits and expiry messaging.
-- ------------------------------------------------------------
create table if not exists public.email_otps (
  email text primary key,
  purpose text not null default 'signup',
  last_sent_at timestamptz,
  attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.email_otps enable row level security;

drop policy if exists "Otp admin all" on public.email_otps;
create policy "Otp admin all" on public.email_otps
  for all using (public.get_current_role() = 'admin');

-- ------------------------------------------------------------
-- payment_methods — admin-controlled deposit methods
-- ------------------------------------------------------------
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null,
  country text not null default 'GLOBAL' check (country in ('IN','PK','GLOBAL')),
  enabled boolean not null default true,
  logo_url text,
  account_name text,
  account_number text,
  min_deposit numeric not null default 1,
  max_deposit numeric not null default 10000,
  fee_percent numeric not null default 0,
  instructions text,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.payment_methods enable row level security;

-- Everyone can read enabled methods; only admins can manage.
drop policy if exists "PayMethods read enabled" on public.payment_methods;
create policy "PayMethods read enabled" on public.payment_methods
  for select using (enabled = true or public.get_current_role() = 'admin');

drop policy if exists "PayMethods admin all" on public.payment_methods;
create policy "PayMethods admin all" on public.payment_methods
  for all using (public.get_current_role() = 'admin');

-- Seed demo payment methods (IN + PK). Dummy account numbers are
-- clearly marked as demo; replace from admin later.
insert into public.payment_methods (slug, name, country, account_name, account_number, min_deposit, max_deposit, fee_percent, instructions, sort) values
  ('upi',        'UPI',           'IN', 'Wazeo (Demo)',        'wazeo@upi-demo',        1, 5000, 0, 'Send via any UPI app to wazeo@upi-demo (DEMO) and upload proof.', 1),
  ('phonepe',    'PhonePe',        'IN', 'Wazeo (Demo)',        'wazeo@phonepe-demo',    1, 5000, 0, 'Send via PhonePe to wazeo@phonepe-demo (DEMO).', 2),
  ('gpay',       'Google Pay',     'IN', 'Wazeo (Demo)',        'wazeo@gpay-demo',       1, 5000, 0, 'Send via Google Pay to wazeo@gpay-demo (DEMO).', 3),
  ('paytm',      'Paytm',          'IN', 'Wazeo (Demo)',        '1234567890@paytm-demo', 1, 5000, 0, 'Send via Paytm (DEMO).', 4),
  ('netbanking', 'Net Banking',    'IN', 'Wazeo (Demo)',        'DEMO-IFSC-0000000',     5, 10000, 0, 'Use demo bank account details; real details will be added later.', 5),
  ('cards',      'Cards',          'IN', 'Wazeo (Demo)',        'DEMO-CARD-LAST4-0000',  5, 10000, 1, 'Card payments incur a 1% fee (DEMO).', 6),
  ('jazzcash',   'JazzCash',       'PK', 'Wazeo (Demo)',        '0300-0000000',          1, 5000, 0, 'Send to JazzCash 0300-0000000 (DEMO).', 10),
  ('easypaisa',  'Easypaisa',      'PK', 'Wazeo (Demo)',        '0300-0000000',          1, 5000, 0, 'Send to Easypaisa 0300-0000000 (DEMO).', 11),
  ('hbl',        'HBL',            'PK', 'Wazeo (Demo)',        'DEMO-HBL-0000000000',   1, 10000, 0, 'Bank transfer to HBL demo account.', 12),
  ('ubl',        'UBL',            'PK', 'Wazeo (Demo)',        'DEMO-UBL-0000000000',   1, 10000, 0, 'Bank transfer to UBL demo account.', 13),
  ('meezan',     'Meezan Bank',    'PK', 'Wazeo (Demo)',        'DEMO-MEEZAN-0000000000', 1, 10000, 0, 'Bank transfer to Meezan demo account.', 14),
  ('alfalah',    'Bank Alfalah',   'PK', 'Wazeo (Demo)',        'DEMO-ALFALAH-0000000000', 1, 10000, 0, 'Bank transfer to Alfalah demo account.', 15),
  ('mcb',        'MCB',            'PK', 'Wazeo (Demo)',        'DEMO-MCB-0000000000',   1, 10000, 0, 'Bank transfer to MCB demo account.', 16)
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- New settings keys (modern admin config)
-- ------------------------------------------------------------
insert into public.settings (key, value) values
  ('oauth_google_client_id', ''),
  ('oauth_google_client_secret', ''),
  ('oauth_twitter_client_id', ''),
  ('oauth_twitter_client_secret', ''),
  ('oauth_github_client_id', ''),
  ('oauth_github_client_secret', ''),
  ('maintenance_mode', 'false'),
  ('maintenance_message', 'We are performing scheduled maintenance. Please check back soon.'),
  ('default_theme', 'purple'),
  ('default_theme_mode', 'dark'),
  ('site_logo_url', ''),
  ('site_favicon_url', ''),
  ('seo_title', ''),
  ('seo_description', ''),
  ('smtp_host', 'smtp.resend.com'),
  ('smtp_port', '465'),
  ('smtp_user', 'resend'),
  ('smtp_pass', ''),
  ('smtp_from', 'support@innvera.shop'),
  ('owner_name', ''),
  ('owner_bio', ''),
  ('owner_skills', '[]'),
  ('owner_projects', '[]'),
  ('owner_contact', ''),
  ('owner_email', ''),
  ('verify_email_method', 'otp'),
  ('otp_expiry_seconds', '300'),
  ('otp_resend_cooldown_seconds', '60'),
  ('otp_max_attempts', '5')
on conflict (key) do nothing;
