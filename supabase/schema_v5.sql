-- ============================================================
-- Wazeo - schema_v5
-- ============================================================

alter table public.profiles add column if not exists discount_percent numeric not null default 0;
alter table public.profiles add column if not exists custom_rates jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists notes text;

create table if not exists public.package_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  platform text not null default 'instagram',
  views_qty numeric not null default 0,
  likes_qty numeric not null default 0,
  comments_qty numeric not null default 0,
  duration_minutes integer not null default 60,
  curve text not null default 'steady',
  discount_percent numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.package_presets enable row level security;

create table if not exists public.comment_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  comments text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.comment_sets enable row level security;

alter table public.orders add column if not exists package_id uuid references public.package_presets(id) on delete set null;
alter table public.orders add column if not exists scheduled_for timestamptz;
alter table public.orders add column if not exists growth_json jsonb;

create table if not exists public.webhook_configs (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  url text not null,
  active boolean not null default true,
  last_status integer,
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.webhook_configs enable row level security;
-- ============================================================
-- RLS policies (schema_v5)
-- ============================================================

drop policy if exists "Presets read active" on public.package_presets;
create policy "Presets read active" on public.package_presets
  for select using (active = true or public.get_current_role() = 'admin');
drop policy if exists "Presets admin" on public.package_presets;
create policy "Presets admin" on public.package_presets
  for all using (public.get_current_role() = 'admin');

drop policy if exists "CommentSets read active" on public.comment_sets;
create policy "CommentSets read active" on public.comment_sets
  for select using (active = true or public.get_current_role() = 'admin');
drop policy if exists "CommentSets admin" on public.comment_sets;
create policy "CommentSets admin" on public.comment_sets
  for all using (public.get_current_role() = 'admin');

drop policy if exists "Webhook admin" on public.webhook_configs;
create policy "Webhook admin" on public.webhook_configs
  for all using (public.get_current_role() = 'admin');

-- ============================================================
-- Seed settings
-- ============================================================
insert into public.settings (key, value) values
  ('daily_checkin_reward', '0.25'),
  ('drip_default_curve', 'steady'),
  ('growth_default_likes', '10'),
  ('growth_default_views', '10'),
  ('growth_default_comments', '10'),
  ('likes_lag_percent', '10'),
  ('refund_guarantee', 'Delivery depends on the platform. No hard guarantee.'),
  ('maintenance_mode', 'false'),
  ('registration_enabled', 'true'),
  ('min_deposit', '5')
on conflict (key) do nothing;

-- ============================================================
-- End of schema_v5
-- ============================================================
