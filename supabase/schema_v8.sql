-- ============================================================
-- Wazeo - schema_v8 (scheduled steps, invite codes, vault, modules)
-- ============================================================

create table if not exists public.scheduled_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  type text not null check (type in ('views','likes','comments','shares','saves')),
  service_id uuid references public.services(id) on delete set null,
  link text not null,
  quantity numeric not null,
  run_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','placed','failed','cancelled')),
  retries integer not null default 0,
  provider_order_id text,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists idx_sched_due on public.scheduled_steps(status, run_at);
create index if not exists idx_sched_user on public.scheduled_steps(user_id);
alter table public.scheduled_steps enable row level security;

create table if not exists public.access_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text,
  expires_at timestamptz,
  usage_limit integer,
  uses integer not null default 0,
  starting_balance numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.access_codes enable row level security;

create table if not exists public.vault_saved_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  link text not null,
  platform text not null default 'instagram',
  created_at timestamptz not null default now()
);
create index if not exists idx_vault_user on public.vault_saved_links(user_id);
alter table public.vault_saved_links enable row level security;

create table if not exists public.user_module_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  modules jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_module_settings enable row level security;

insert into public.settings (key, value) values
  ('invite_only', 'false')
on conflict (key) do nothing;

drop policy if exists "Sched own select" on public.scheduled_steps;
create policy "Sched own select" on public.scheduled_steps
  for select using (user_id = auth.uid() or public.get_current_role() = 'admin');
drop policy if exists "Sched own insert" on public.scheduled_steps;
create policy "Sched own insert" on public.scheduled_steps
  for insert with check (user_id = auth.uid());
drop policy if exists "Sched own update" on public.scheduled_steps;
create policy "Sched own update" on public.scheduled_steps
  for update using (user_id = auth.uid());
drop policy if exists "Sched own delete" on public.scheduled_steps;
create policy "Sched own delete" on public.scheduled_steps
  for delete using (user_id = auth.uid());
drop policy if exists "Sched admin" on public.scheduled_steps;
create policy "Sched admin" on public.scheduled_steps
  for all using (public.get_current_role() = 'admin');

drop policy if exists "Codes admin" on public.access_codes;
create policy "Codes admin" on public.access_codes
  for all using (public.get_current_role() = 'admin');

drop policy if exists "Vault own select" on public.vault_saved_links;
create policy "Vault own select" on public.vault_saved_links
  for select using (user_id = auth.uid());
drop policy if exists "Vault own insert" on public.vault_saved_links;
create policy "Vault own insert" on public.vault_saved_links
  for insert with check (user_id = auth.uid());
drop policy if exists "Vault own delete" on public.vault_saved_links;
create policy "Vault own delete" on public.vault_saved_links
  for delete using (user_id = auth.uid());
drop policy if exists "Vault admin" on public.vault_saved_links;
create policy "Vault admin" on public.vault_saved_links
  for all using (public.get_current_role() = 'admin');

drop policy if exists "Mods own select" on public.user_module_settings;
create policy "Mods own select" on public.user_module_settings
  for select using (user_id = auth.uid());
drop policy if exists "Mods own upsert" on public.user_module_settings;
create policy "Mods own upsert" on public.user_module_settings
  for insert with check (user_id = auth.uid());
drop policy if exists "Mods own update" on public.user_module_settings;
create policy "Mods own update" on public.user_module_settings
  for update using (user_id = auth.uid());
drop policy if exists "Mods admin" on public.user_module_settings;
create policy "Mods admin" on public.user_module_settings
  for all using (public.get_current_role() = 'admin');

-- ============================================================
-- End of schema_v8
-- ============================================================
