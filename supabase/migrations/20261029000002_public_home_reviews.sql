-- Wazeo — public home + reviews (prompt 27)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  text text not null default '',
  show_first_name boolean not null default true,
  author_display text,
  link text,
  status text not null default 'pending' check (status in ('pending','approved','hidden')),
  created_at timestamptz not null default now()
);
alter table public.reviews enable row level security;

create index if not exists idx_reviews_status on public.reviews(status);
create index if not exists idx_reviews_order on public.reviews(order_id);

drop policy if exists "Reviews public read approved" on public.reviews;
create policy "Reviews public read approved" on public.reviews
  for select using (status = 'approved');

drop policy if exists "Reviews customer create own" on public.reviews;
create policy "Reviews customer create own" on public.reviews
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid() and o.status = 'completed'
    )
  );

drop policy if exists "Reviews customer view own" on public.reviews;
create policy "Reviews customer view own" on public.reviews
  for select using (auth.uid() = user_id or status = 'approved');

drop policy if exists "Reviews admin all" on public.reviews;
create policy "Reviews admin all" on public.reviews
  for all using (public.get_current_role() = 'admin');

insert into public.settings (key, value) values
  ('home_content', '{"heroTitle":"Grow on Instagram, TikTok & YouTube with gradual delivery.","heroSubtitle":"Wazeo delivers your orders slowly and naturally over time. Draw your own curve, watch the graph live, and keep your growth looking organic.","ctaStart":"Get started","ctaPrices":"View prices","howTitle":"How it works","featuresTitle":"Why Wazeo","showHero":true,"showStats":true,"showHow":true,"showServices":true,"showFeatures":true,"showDemo":true,"showReviews":true,"showTrust":true,"showFaq":true,"showTicker":true}'::jsonb),
  ('counter_thresholds', '{"orders":100,"services":3,"platforms":0,"supports":0}'::jsonb),
  ('footer_links', '[{"label":"About","href":"/about"},{"label":"How it works","href":"/how-it-works"},{"label":"FAQ","href":"/faq"},{"label":"Order Tracker","href":"/tracker"},{"label":"API Documentation","href":"/api-docs"},{"label":"Terms","href":"/terms"},{"label":"Privacy","href":"/privacy"},{"label":"Refund Policy","href":"/refund-policy"},{"label":"Owner","href":"/owner"}]'::jsonb)
on conflict (key) do nothing;

insert into public.settings (key, value) values
  ('support_whatsapp', ''), ('support_telegram', ''), ('support_email', ''),
  ('working_hours', ''), ('working_tz', 'UTC'), ('support_welcome', '')
on conflict (key) do nothing;
