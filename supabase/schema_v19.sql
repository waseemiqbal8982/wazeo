-- ============================================================
-- Wazeo - schema_v19 (access plans: days / permanent / features)
-- Extends access_codes + profiles for the new access-key redeem flow.
-- Re-runnable. Full keys are NEVER stored - only SHA-256 hash + last 4.
-- ============================================================

-- access_codes: plan + feature metadata
alter table public.access_codes add column if not exists access_days integer;
alter table public.access_codes add column if not exists plan_name text;
alter table public.access_codes add column if not exists features jsonb not null default '[]'::jsonb;
alter table public.access_codes add column if not exists redemption_expires_at timestamptz;
alter table public.access_codes add column if not exists starting_balance numeric not null default 0;

-- profiles: mirror of the redeemed plan so the shell can show "Access left"
alter table public.profiles add column if not exists access_expires_at timestamptz;
alter table public.profiles add column if not exists plan text;
alter table public.profiles add column if not exists features jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists access_key_id uuid;
create index if not exists idx_profiles_access_key on public.profiles(access_key_id) where access_key_id is not null;
create index if not exists idx_profiles_access_expires on public.profiles(access_expires_at) where access_expires_at is not null;

-- Admin setting: force OTP for every key account (default OFF)
insert into public.settings (key, value) values
  ('require_key_email_verify', 'false')
on conflict (key) do nothing;
