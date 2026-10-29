-- ============================================================
-- Wazeo — schema_v22 (Admin PIN security)
-- Adds: admin_pins, admin_recovery_codes + security option settings.
-- Re-runnable: IF EXISTS guards on every statement.
-- ============================================================

-- Admin PIN (6-8 digit, stored as salted slow hash).
create table if not exists public.admin_pins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  pin_hash text not null,
  salt text not null,
  algo text not null default 'scrypt',
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  last_verified_at timestamptz,
  setup_pending boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.admin_pins enable row level security;
drop policy if exists "Admin pins owner" on public.admin_pins;
create policy "Admin pins owner" on public.admin_pins
  for all using (auth.uid() = user_id or public.get_current_role() in ('admin','support'));

-- One-time recovery codes (stored hashed, consumed once).
create table if not exists public.admin_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_admin_recovery_user on public.admin_recovery_codes(user_id);
alter table public.admin_recovery_codes enable row level security;
drop policy if exists "Recovery codes owner" on public.admin_recovery_codes;
create policy "Recovery codes owner" on public.admin_recovery_codes
  for all using (auth.uid() = user_id or public.get_current_role() in ('admin','support'));

-- Optional security switches (default OFF).
insert into public.settings (key, value) values
  ('admin_pin_trusted_devices_enabled', 'false'),
  ('admin_login_alerts_enabled', 'false'),
  ('admin_country_allowlist', '')
on conflict (key) do nothing;
