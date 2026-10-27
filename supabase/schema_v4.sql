-- ============================================================
-- Wazeo - schema_v4 (advanced features)
-- Safe to re-run: IF NOT EXISTS / create or replace.
-- ============================================================

alter table public.profiles add column if not exists language text not null default 'en';
alter table public.profiles add column if not exists permissions jsonb not null default '{}'::jsonb;

create table if not exists public.translation_overrides (
  lang text not null,
  key text not null,
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (lang, key)
);
alter table public.translation_overrides enable row level security;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_created on public.audit_logs(created_at desc);
alter table public.audit_logs enable row level security;

create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  api_url text,
  api_key text,
  active boolean not null default true,
  priority integer not null default 0,
  mode text not null default 'mock' check (mode in ('mock','live')),
  meta jsonb,
  created_at timestamptz not null default now()
);
alter table public.providers enable row level security;

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('percent','fixed')),
  value numeric not null default 0,
  min_order numeric not null default 0,
  max_uses integer,
  uses integer not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.coupons enable row level security;

create table if not exists public.loyalty_levels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  min_spent numeric not null default 0,
  discount_percent numeric not null default 0,
  sort integer not null default 0
);
alter table public.loyalty_levels enable row level security;

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  prefix text not null,
  key_hash text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists idx_apikeys_user on public.api_keys(user_id);
alter table public.api_keys enable row level security;

create table if not exists public.daily_checkin (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  reward numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);
alter table public.daily_checkin enable row level security;
create table if not exists public.cms_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  lang text not null default 'en',
  title text not null,
  content text not null,
  updated_at timestamptz not null default now(),
  unique (slug, lang)
);
alter table public.cms_pages enable row level security;

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  lang text not null default 'en',
  question text not null,
  answer text not null,
  sort integer not null default 0,
  active boolean not null default true
);
alter table public.faqs enable row level security;

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  author text not null,
  rating integer not null default 5,
  text text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.testimonials enable row level security;

create table if not exists public.popups (
  id uuid primary key default gen_random_uuid(),
  title text,
  message text not null,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.popups enable row level security;

create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'error',
  source text,
  message text not null,
  stack text,
  created_at timestamptz not null default now()
);
create index if not exists idx_errorlogs_created on public.error_logs(created_at desc);
alter table public.error_logs enable row level security;
-- ============================================================
-- RLS policies (schema_v4)
-- ============================================================

drop policy if exists "TrOverrides read" on public.translation_overrides;
create policy "TrOverrides read" on public.translation_overrides
  for select using (true);
drop policy if exists "TrOverrides admin" on public.translation_overrides;
create policy "TrOverrides admin" on public.translation_overrides
  for all using (public.get_current_role() = 'admin');

drop policy if exists "Audit admin" on public.audit_logs;
create policy "Audit admin" on public.audit_logs
  for all using (public.get_current_role() = 'admin');

drop policy if exists "Providers admin" on public.providers;
create policy "Providers admin" on public.providers
  for all using (public.get_current_role() = 'admin');

drop policy if exists "Coupons read active" on public.coupons;
create policy "Coupons read active" on public.coupons
  for select using (active = true or public.get_current_role() = 'admin');
drop policy if exists "Coupons admin" on public.coupons;
create policy "Coupons admin" on public.coupons
  for all using (public.get_current_role() = 'admin');

drop policy if exists "Loyalty read" on public.loyalty_levels;
create policy "Loyalty read" on public.loyalty_levels
  for select using (true);
drop policy if exists "Loyalty admin" on public.loyalty_levels;
create policy "Loyalty admin" on public.loyalty_levels
  for all using (public.get_current_role() = 'admin');

drop policy if exists "ApiKeys own select" on public.api_keys;
create policy "ApiKeys own select" on public.api_keys
  for select using (user_id = auth.uid());
drop policy if exists "ApiKeys own insert" on public.api_keys;
create policy "ApiKeys own insert" on public.api_keys
  for insert with check (user_id = auth.uid());
drop policy if exists "ApiKeys own delete" on public.api_keys;
create policy "ApiKeys own delete" on public.api_keys
  for delete using (user_id = auth.uid());
drop policy if exists "ApiKeys admin" on public.api_keys;
create policy "ApiKeys admin" on public.api_keys
  for all using (public.get_current_role() = 'admin');

drop policy if exists "Checkin own select" on public.daily_checkin;
create policy "Checkin own select" on public.daily_checkin
  for select using (user_id = auth.uid());
drop policy if exists "Checkin own insert" on public.daily_checkin;
create policy "Checkin own insert" on public.daily_checkin
  for insert with check (user_id = auth.uid());
drop policy if exists "Checkin admin" on public.daily_checkin;
create policy "Checkin admin" on public.daily_checkin
  for all using (public.get_current_role() = 'admin');

drop policy if exists "Cms read" on public.cms_pages;
create policy "Cms read" on public.cms_pages
  for select using (true);
drop policy if exists "Cms admin" on public.cms_pages;
create policy "Cms admin" on public.cms_pages
  for all using (public.get_current_role() = 'admin');

drop policy if exists "Faqs read active" on public.faqs;
create policy "Faqs read active" on public.faqs
  for select using (active = true or public.get_current_role() = 'admin');
drop policy if exists "Faqs admin" on public.faqs;
create policy "Faqs admin" on public.faqs
  for all using (public.get_current_role() = 'admin');

drop policy if exists "Testimonials read active" on public.testimonials;
create policy "Testimonials read active" on public.testimonials
  for select using (active = true or public.get_current_role() = 'admin');
drop policy if exists "Testimonials admin" on public.testimonials;
create policy "Testimonials admin" on public.testimonials
  for all using (public.get_current_role() = 'admin');

drop policy if exists "Popups read active" on public.popups;
create policy "Popups read active" on public.popups
  for select using (active = true or public.get_current_role() = 'admin');
drop policy if exists "Popups admin" on public.popups;
create policy "Popups admin" on public.popups
  for all using (public.get_current_role() = 'admin');

drop policy if exists "ErrorLogs admin" on public.error_logs;
create policy "ErrorLogs admin" on public.error_logs
  for all using (public.get_current_role() = 'admin');
-- ============================================================
-- Audit writes inside key admin functions
-- ============================================================
create or replace function public.approve_payment(p_payment_id uuid, p_approve boolean)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_first_deposit boolean;
  v_referral public.referrals%rowtype;
  v_bonus numeric;
begin
  if public.get_current_role() <> 'admin' then
    raise exception 'Only admins can approve payments';
  end if;
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if v_payment.status <> 'pending' then raise exception 'Payment already processed'; end if;

  if p_approve then
    update public.payments set status = 'approved' where id = v_payment.id;
    update public.profiles set balance = balance + v_payment.amount where id = v_payment.user_id;
    insert into public.transactions (user_id, type, amount, note)
    values (v_payment.user_id, 'deposit', v_payment.amount, 'Payment approved ' || v_payment.id::text);

    select not exists (
      select 1 from public.payments p
      where p.user_id = v_payment.user_id and p.status = 'approved' and p.id <> v_payment.id
    ) into v_first_deposit;

    if v_first_deposit then
      select * into v_referral from public.referrals where referred_id = v_payment.user_id and bonus_paid = false;
      if found then
        v_bonus := round(v_payment.amount * (v_referral.bonus_percent / 100), 2);
        if v_bonus > 0 then
          update public.profiles set balance = balance + v_bonus where id = v_referral.referrer_id;
          insert into public.transactions (user_id, type, amount, note)
          values (v_referral.referrer_id, 'deposit', v_bonus, 'Referral bonus ' || v_referral.referred_id::text);
          update public.referrals set bonus_paid = true where id = v_referral.id;
          perform public.send_notification(v_referral.referrer_id, 'You earned a referral bonus of $' || v_bonus::text);
        end if;
      end if;
    end if;
  else
    update public.payments set status = 'rejected' where id = v_payment.id;
  end if;

  insert into public.audit_logs (user_id, action, details)
  values (auth.uid(), 'payment_' || case when p_approve then 'approved' else 'rejected' end,
          jsonb_build_object('payment_id', v_payment.id));
end;
$$;

create or replace function public.admin_adjust_balance(p_user_id uuid, p_amount numeric, p_note text default null)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if public.get_current_role() <> 'admin' then
    raise exception 'Only admins can adjust balances';
  end if;
  if p_amount = 0 then return; end if;
  update public.profiles set balance = balance + p_amount where id = p_user_id;
  insert into public.transactions (user_id, type, amount, note)
  values (p_user_id, case when p_amount > 0 then 'deposit' else 'refund' end, p_amount, coalesce(p_note, 'Admin adjustment'));
  insert into public.audit_logs (user_id, action, details)
  values (auth.uid(), 'balance_adjust', jsonb_build_object('user_id', p_user_id, 'amount', p_amount));
end;
$$;

grant execute on function public.approve_payment(uuid, boolean) to authenticated;
grant execute on function public.admin_adjust_balance(uuid, numeric, text) to authenticated;

-- ============================================================
-- End of schema_v4
-- ============================================================
