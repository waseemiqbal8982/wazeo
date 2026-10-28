-- ============================================================
-- Wazeo — Organic engagement engine schema (migration 1)
-- Run in Supabase SQL Editor (paste whole file, Run).
-- Creates: engagement_orders, engagement_order_items, organic_run_schedule
-- All new tables have RLS enabled with user-own + admin-all policies.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- engagement_orders — top-level organic order
-- ------------------------------------------------------------
create table if not exists public.engagement_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_link text not null,
  platform text not null default 'instagram',
  preset_id text not null default 'auto_safe',
  window_id text not null default '24h',
  window_minutes integer not null default 1440,
  variance_percent integer not null default 10,
  peak_hours boolean not null default true,
  organic_mode boolean not null default true,
  risk_score numeric not null default 0,
  band text not null default 'safe',
  organic_score numeric not null default 0,
  re_rolls integer not null default 0,
  total_qty integer not null default 0,
  algorithm_json jsonb not null default '{}'::jsonb,
  status text not null default 'scheduled'
    check (status in ('draft','scheduled','running','paused','completed','cancelled','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_eo_user on public.engagement_orders(user_id);
create index if not exists idx_eo_status on public.engagement_orders(status);
alter table public.engagement_orders enable row level security;

-- ------------------------------------------------------------
-- engagement_order_items — per engagement-type line items
-- ------------------------------------------------------------
create table if not exists public.engagement_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.engagement_orders(id) on delete cascade,
  engagement_type text not null check (engagement_type in ('views','likes','comments','saves','shares')),
  quantity integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_eoi_order on public.engagement_order_items(order_id);
alter table public.engagement_order_items enable row level security;

-- ------------------------------------------------------------
-- organic_run_schedule — micro-run timeline consumed by execute-runs
-- ------------------------------------------------------------
create table if not exists public.organic_run_schedule (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.engagement_orders(id) on delete cascade,
  item_id uuid references public.engagement_order_items(id) on delete set null,
  engagement_type text not null,
  run_at timestamptz not null,
  quantity integer not null,
  provider_ref text,
  status text not null default 'pending'
    check (status in ('pending','processing','delivered','failed','skipped')),
  error text,
  delivered_at timestamptz,
  retries integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_rs_due on public.organic_run_schedule(status, run_at);
create index if not exists idx_rs_order on public.organic_run_schedule(order_id);
alter table public.organic_run_schedule enable row level security;

-- ============================================================
-- RLS policies
-- ============================================================
-- engagement_orders: user sees/creates own; admins see all
drop policy if exists "Engagement orders own insert" on public.engagement_orders;
create policy "Engagement orders own insert" on public.engagement_orders
  for insert with check (user_id = auth.uid());

drop policy if exists "Engagement orders own select" on public.engagement_orders;
create policy "Engagement orders own select" on public.engagement_orders
  for select using (user_id = auth.uid());

drop policy if exists "Engagement orders own update" on public.engagement_orders;
create policy "Engagement orders own update" on public.engagement_orders
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Engagement orders admin all" on public.engagement_orders;
create policy "Engagement orders admin all" on public.engagement_orders
  for all using (public.get_current_role() = 'admin');

-- engagement_order_items: own via parent order OR admins
drop policy if exists "Engagement items own select" on public.engagement_order_items;
create policy "Engagement items own select" on public.engagement_order_items
  for select using (
    exists (select 1 from public.engagement_orders o where o.id = order_id and o.user_id = auth.uid())
  );

drop policy if exists "Engagement items own insert" on public.engagement_order_items;
create policy "Engagement items own insert" on public.engagement_order_items
  for insert with check (
    exists (select 1 from public.engagement_orders o where o.id = order_id and o.user_id = auth.uid())
  );

drop policy if exists "Engagement items admin all" on public.engagement_order_items;
create policy "Engagement items admin all" on public.engagement_order_items
  for all using (public.get_current_role() = 'admin');

-- organic_run_schedule: own via parent order OR admins
drop policy if exists "Run schedule own select" on public.organic_run_schedule;
create policy "Run schedule own select" on public.organic_run_schedule
  for select using (
    exists (select 1 from public.engagement_orders o where o.id = order_id and o.user_id = auth.uid())
  );

drop policy if exists "Run schedule own insert" on public.organic_run_schedule;
create policy "Run schedule own insert" on public.organic_run_schedule
  for insert with check (
    exists (select 1 from public.engagement_orders o where o.id = order_id and o.user_id = auth.uid())
  );

drop policy if exists "Run schedule admin all" on public.organic_run_schedule;
create policy "Run schedule admin all" on public.organic_run_schedule
  for all using (public.get_current_role() = 'admin');

