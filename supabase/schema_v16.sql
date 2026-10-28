-- ============================================================
-- Wazeo — schema_v16
-- Adds: login_history, provider_logs, plugin_executions,
-- admin_2fa, public_links, support role, payment-logo bucket.
-- Re-runnable / idempotent.
-- ============================================================

-- Extend roles to include support.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user','admin','support'));

-- Login history (every successful login).
create table if not exists public.login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  method text not null default 'password',
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.login_history enable row level security;
create index if not exists idx_login_history_user on public.login_history(user_id, created_at desc);
create index if not exists idx_login_history_created on public.login_history(created_at desc);

drop policy if exists "Login history admin" on public.login_history;
create policy "Login history admin" on public.login_history
  for select using (public.get_current_role() in ('admin','support'));

-- Provider API logs.
create table if not exists public.provider_logs (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid,
  action text not null,
  ok boolean not null default true,
  http_status integer,
  retries integer not null default 0,
  duration_ms integer,
  error text,
  response_masked text,
  created_at timestamptz not null default now()
);
alter table public.provider_logs enable row level security;
create index if not exists idx_provider_logs_created on public.provider_logs(created_at desc);

drop policy if exists "Provider logs admin" on public.provider_logs;
create policy "Provider logs admin" on public.provider_logs
  for all using (public.get_current_role() in ('admin','support'));

-- Plugin hook executions.
create table if not exists public.plugin_executions (
  id uuid primary key default gen_random_uuid(),
  plugin_id text not null,
  hook text not null,
  ok boolean not null default true,
  error text,
  duration_ms integer,
  created_at timestamptz not null default now()
);
alter table public.plugin_executions enable row level security;
create index if not exists idx_plugin_executions_created on public.plugin_executions(created_at desc);

drop policy if exists "Plugin executions admin" on public.plugin_executions;
create policy "Plugin executions admin" on public.plugin_executions
  for all using (public.get_current_role() in ('admin','support'));

-- Admin 2FA.
create table if not exists public.admin_2fa (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default false,
  method text not null default 'email',
  code_hash text,
  code_expires_at timestamptz,
  recovery_hash text,
  updated_at timestamptz not null default now()
);
alter table public.admin_2fa enable row level security;

drop policy if exists "Admin 2fa owner" on public.admin_2fa;
create policy "Admin 2fa owner" on public.admin_2fa
  for all using (auth.uid() = user_id or public.get_current_role() = 'admin');

-- Public order tracker links (plugin).
create table if not exists public.public_links (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  token text unique not null,
  created_at timestamptz not null default now()
);
alter table public.public_links enable row level security;
drop policy if exists "Public links admin" on public.public_links;
create policy "Public links admin" on public.public_links
  for all using (public.get_current_role() = 'admin');

-- Storage bucket for payment method logos.
insert into storage.buckets (id, name, public)
values ('payment-logos','payment-logos', true)
on conflict (id) do nothing;

-- ============================================================
-- End of schema_v16
-- ============================================================
