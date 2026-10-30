-- ============================================================
-- Wazeo - schema_v27 (NEW key system: wz_keys, wz_key_devices, wz_key_events)
-- One source of truth. RLS enabled, NO client policies (only the service role
-- touches these tables). "Expired" is computed from dates, never stored.
-- Full code is stored in `code` (normalized, unique) so the owner can see it;
-- the table is unreachable from browsers.
-- Re-runnable.
-- ============================================================

create table if not exists public.wz_keys (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                      -- normalized 12-char body
  plan text not null default 'Standard',
  features jsonb not null default '[]'::jsonb,
  access_days integer,                            -- null = permanent
  redeem_until timestamptz,                       -- null = never
  bound_email text,
  label text,
  note text,
  starting_balance numeric not null default 0,
  max_devices integer not null default 2,
  status text not null default 'unused' check (status in ('unused','active','revoked')),
  created_by text,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  activated_user_id uuid,
  access_expires_at timestamptz,
  last_used_at timestamptz
);

create index if not exists idx_wz_keys_status on public.wz_keys(status);
create index if not exists idx_wz_keys_code on public.wz_keys(code);
create index if not exists idx_wz_keys_bound_email on public.wz_keys(bound_email);

alter table public.wz_keys enable row level security;
-- NO client policies. Only service-role (bypasses RLS) can read/write.

create table if not exists public.wz_key_devices (
  id uuid primary key default gen_random_uuid(),
  key_id uuid not null references public.wz_keys(id) on delete cascade,
  device_id text not null,
  label text default '',
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  revoked boolean not null default false,
  unique (key_id, device_id)
);

create index if not exists idx_wz_key_devices_key on public.wz_key_devices(key_id);
alter table public.wz_key_devices enable row level security;

create table if not exists public.wz_key_events (
  id uuid primary key default gen_random_uuid(),
  key_id uuid not null references public.wz_keys(id) on delete cascade,
  type text not null,
  actor text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_wz_key_events_key on public.wz_key_events(key_id);
alter table public.wz_key_events enable row level security;

-- Helper: append a key event (service-role only safe RLS).
create or replace function public.wz_key_event(p_key uuid, p_type text, p_actor text, p_details jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.wz_key_events (key_id, type, actor, details)
  values (p_key, p_type, p_actor, p_details);
end;
$$;
