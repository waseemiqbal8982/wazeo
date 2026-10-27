-- ============================================================
-- Wazeo - schema_v2 (extra features)
-- How to use:
--   1. Supabase -> SQL Editor -> + New query
--   2. Paste this WHOLE file -> Run
-- ============================================================

-- ------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_user on public.notifications(user_id, read);
alter table public.notifications enable row level security;

-- ------------------------------------------------------------
-- announcements
-- ------------------------------------------------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
-- ------------------------------------------------------------
-- referrals
-- ------------------------------------------------------------
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null unique references public.profiles(id) on delete cascade,
  bonus_percent numeric not null default 5,
  bonus_paid boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.referrals enable row level security;

-- ------------------------------------------------------------
-- favorites
-- ------------------------------------------------------------
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, service_id)
);
alter table public.favorites enable row level security;

-- ------------------------------------------------------------
-- extend profiles
-- ------------------------------------------------------------
alter table public.profiles add column if not exists referral_code text;
create unique index if not exists idx_profiles_referral on public.profiles(referral_code) where referral_code is not null;
alter table public.profiles add column if not exists banned boolean not null default false;
-- ------------------------------------------------------------
-- helpers
-- ------------------------------------------------------------
create or replace function public.gen_referral_code()
returns text
language sql
volatile
security definer
set search_path = public
as $$
  select upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
$$;

create or replace function public.send_notification(p_user_id uuid, p_message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, message) values (p_user_id, p_message);
end;
$$;

create or replace function public.toggle_favorite(p_service_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  select exists(
    select 1 from public.favorites where user_id = auth.uid() and service_id = p_service_id
  ) into v_exists;
  if v_exists then
    delete from public.favorites where user_id = auth.uid() and service_id = p_service_id;
    return false;
  else
    insert into public.favorites (user_id, service_id) values (auth.uid(), p_service_id);
    return true;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- signup trigger: set referral code + record referral
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral text;
  v_referrer uuid;
  v_percent numeric;
begin
  insert into public.profiles (id, username, referral_code)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), 'user_' || left(new.id::text, 8)),
    public.gen_referral_code()
  )
  on conflict (id) do nothing;

  v_referral := new.raw_user_meta_data->>'referral';
  if v_referral is not null and v_referral <> '' then
    select id into v_referrer from public.profiles where referral_code = upper(btrim(v_referral));
    if v_referrer is not null and v_referrer <> new.id then
      select coalesce(nullif(value,'')::numeric, 5) into v_percent from public.settings where key='referral_percent';
      insert into public.referrals (referrer_id, referred_id, bonus_percent)
      values (v_referrer, new.id, coalesce(v_percent, 5))
      on conflict (referred_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
-- ------------------------------------------------------------
-- cancel_and_refund: restore balance + mark order refunded
-- ------------------------------------------------------------
create or replace function public.cancel_and_refund(p_order_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.status in ('completed','refunded') then raise exception 'Order cannot be refunded'; end if;

  update public.orders set status = 'refunded' where id = v_order.id;
  update public.profiles set balance = balance + v_order.charge where id = v_order.user_id;
  insert into public.transactions (user_id, type, amount, note)
  values (v_order.user_id, 'refund', v_order.charge, 'Auto refund for order ' || v_order.id::text);
  update public.order_chunks set status = 'failed', error = 'refunded' where order_id = v_order.id and status = 'pending';
end;
$$;

-- ------------------------------------------------------------
-- approve_payment: approve + crediting + referral bonus
-- ------------------------------------------------------------
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

    -- referral bonus on first approved deposit
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
end;
$$;
-- ============================================================
-- RLS policies for new tables
-- ============================================================

-- notifications ----------------------------------------------
drop policy if exists "Notif own select" on public.notifications;
create policy "Notif own select" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "Notif own update" on public.notifications;
create policy "Notif own update" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Notif admin all" on public.notifications;
create policy "Notif admin all" on public.notifications
  for all using (public.get_current_role() = 'admin');

-- announcements ------------------------------------------------
drop policy if exists "Ann read all" on public.announcements;
create policy "Ann read all" on public.announcements
  for select using (true);

drop policy if exists "Ann admin all" on public.announcements;
create policy "Ann admin all" on public.announcements
  for all using (public.get_current_role() = 'admin');

-- referrals ----------------------------------------------------
drop policy if exists "Referrals own select" on public.referrals;
create policy "Referrals own select" on public.referrals
  for select using (referrer_id = auth.uid());

drop policy if exists "Referrals admin all" on public.referrals;
create policy "Referrals admin all" on public.referrals
  for all using (public.get_current_role() = 'admin');

-- favorites ----------------------------------------------------
drop policy if exists "Fav own select" on public.favorites;
create policy "Fav own select" on public.favorites
  for select using (user_id = auth.uid());

drop policy if exists "Fav own insert" on public.favorites;
create policy "Fav own insert" on public.favorites
  for insert with check (user_id = auth.uid());

drop policy if exists "Fav own delete" on public.favorites;
create policy "Fav own delete" on public.favorites
  for delete using (user_id = auth.uid());

drop policy if exists "Fav admin all" on public.favorites;
create policy "Fav admin all" on public.favorites
  for all using (public.get_current_role() = 'admin');

-- ============================================================
-- Storage bucket for payment proofs
-- ============================================================
insert into storage.buckets (id, name, public)
values ('payments', 'payments', false)
on conflict (id) do nothing;

drop policy if exists "Payments proof read" on storage.objects;
create policy "Payments proof read" on storage.objects
  for select using (bucket_id = 'payments');

drop policy if exists "Payments proof upload" on storage.objects;
create policy "Payments proof upload" on storage.objects
  for insert with check (
    bucket_id = 'payments' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Payments proof admin" on storage.objects;
create policy "Payments proof admin" on storage.objects
  for all using (public.get_current_role() = 'admin');

-- ============================================================
-- Seed settings
-- ============================================================
insert into public.settings (key, value) values
  ('site_name', 'Wazeo'),
  ('markup_percent', '30'),
  ('referral_percent', '5'),
  ('payment_methods', '[]'),
  ('currency', 'USD')
on conflict (key) do nothing;

-- ============================================================
-- Grant execute on new functions
-- ============================================================
grant execute on function public.gen_referral_code() to authenticated;
grant execute on function public.send_notification(uuid, text) to service_role;
grant execute on function public.toggle_favorite(uuid) to authenticated;
grant execute on function public.cancel_and_refund(uuid) to service_role;
grant execute on function public.approve_payment(uuid, boolean) to authenticated;

-- ============================================================
-- End of schema_v2
-- ============================================================
