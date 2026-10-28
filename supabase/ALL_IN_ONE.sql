-- ============================================================
-- Wazeo - Supabase schema
-- How to use:
--   1. Go to https://supabase.com -> open your project.
--   2. In the left sidebar click "SQL Editor".
--   3. Click "+ New query".
--   4. Paste this WHOLE file into the editor.
--   5. Click "Run" (or press Ctrl+Enter).
--   6. You should see "Success. No rows returned" for each statement.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Helper: current user role (safe to use inside policies)
-- ------------------------------------------------------------
create or replace function public.get_current_role()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return (select role from public.profiles where id = auth.uid());
end;
$$;

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  role text not null default 'user' check (role in ('user','admin')),
  balance numeric not null default 0 check (balance >= 0),
  theme text not null default 'purple',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- ------------------------------------------------------------
-- services
-- ------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  provider_service_id text not null unique,
  platform text not null check (platform in ('instagram','tiktok','youtube')),
  category text not null default 'other',
  name text not null,
  provider_rate numeric not null default 0,
  markup_percent numeric not null default 30,
  min numeric not null default 1,
  max numeric not null default 100000,
  active boolean not null default true,
  ai_score numeric not null default 0,
  created_at timestamptz not null default now()
);
alter table public.services enable row level security;
-- ------------------------------------------------------------
-- orders
-- ------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  service_id uuid not null references public.services(id),
  link text not null,
  quantity numeric not null,
  charge numeric not null default 0,
  status text not null default 'pending',
  mode text not null default 'instant' check (mode in ('instant','drip')),
  duration_minutes integer,
  curve text check (curve in ('steady','slow_start','bell_peak','natural_wave')),
  provider_order_id text,
  created_at timestamptz not null default now()
);
create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);
alter table public.orders enable row level security;

-- ------------------------------------------------------------
-- order_chunks
-- ------------------------------------------------------------
create table if not exists public.order_chunks (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  run_at timestamptz not null,
  quantity numeric not null,
  status text not null default 'pending' check (status in ('pending','sent','done','failed')),
  retries integer not null default 0,
  provider_order_id text,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists idx_chunks_due on public.order_chunks(status, run_at);
alter table public.order_chunks enable row level security;
-- ------------------------------------------------------------
-- transactions
-- ------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('deposit','order','refund')),
  amount numeric not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_tx_user on public.transactions(user_id);
alter table public.transactions enable row level security;

-- ------------------------------------------------------------
-- payments
-- ------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null,
  method text not null,
  proof_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
alter table public.payments enable row level security;
-- ------------------------------------------------------------
-- tickets
-- ------------------------------------------------------------
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
alter table public.tickets enable row level security;

-- ------------------------------------------------------------
-- ticket_messages
-- ------------------------------------------------------------
create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  sender text not null check (sender in ('user','admin','ai')),
  message text not null,
  created_at timestamptz not null default now()
);
alter table public.ticket_messages enable row level security;

-- ------------------------------------------------------------
-- settings
-- ------------------------------------------------------------
create table if not exists public.settings (
  key text primary key,
  value text
);
alter table public.settings enable row level security;
-- ------------------------------------------------------------
-- Trigger: create a profile automatically on signup
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), 'user_' || left(new.id::text, 8))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- Function: place order + deduct balance atomically
-- ------------------------------------------------------------
create or replace function public.place_order(
  p_service_id uuid,
  p_link text,
  p_quantity numeric,
  p_mode text default 'instant',
  p_duration_minutes integer default null,
  p_curve text default null
) returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_service public.services%rowtype;
  v_user public.profiles%rowtype;
  v_charge numeric;
  v_order_id uuid;
  v_balance numeric;
begin
  select * into v_service from public.services where id = p_service_id for update;
  if not found then
    raise exception 'Service not found';
  end if;
  if not v_service.active then
    raise exception 'Service is inactive';
  end if;
  if p_quantity < v_service.min or p_quantity > v_service.max then
    raise exception 'Quantity is outside the allowed range for this service';
  end if;
  if p_mode = 'drip' and (p_duration_minutes is null or p_duration_minutes <= 0) then
    raise exception 'Drip-feed requires a positive duration';
  end if;

  select * into v_user from public.profiles where id = auth.uid() for update;
  if not found then
    raise exception 'Profile not found';
  end if;

  v_charge := round((p_quantity * v_service.provider_rate * (1 + v_service.markup_percent / 100)), 2);

  if v_user.balance < v_charge then
    raise exception 'Insufficient balance';
  end if;

  update public.profiles set balance = balance - v_charge where id = v_user.id;
  v_balance := v_user.balance - v_charge;

  insert into public.orders (user_id, service_id, link, quantity, charge, mode, duration_minutes, curve)
  values (v_user.id, v_service.id, p_link, p_quantity, v_charge, p_mode, p_duration_minutes, p_curve)
  returning id into v_order_id;

  insert into public.transactions (user_id, type, amount, note)
  values (v_user.id, 'order', -v_charge, 'Order placed ' || v_order_id::text);

  return jsonb_build_object(
    'order_id', v_order_id,
    'charge', v_charge,
    'balance', v_balance
  );
end;
$$;

revoke all on function public.place_order(uuid, text, numeric, text, integer, text) from public;
grant execute on function public.place_order(uuid, text, numeric, text, integer, text) to authenticated;
-- ------------------------------------------------------------
-- Function: user updates their own username / theme only
-- ------------------------------------------------------------
create or replace function public.update_profile(p_username text default null, p_theme text default null)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if p_username is not null then
    update public.profiles set username = p_username where id = auth.uid();
  end if;
  if p_theme is not null then
    update public.profiles set theme = p_theme where id = auth.uid();
  end if;
end;
$$;

grant execute on function public.update_profile(text, text) to authenticated;

-- ------------------------------------------------------------
-- Function: admin approves / rejects a payment
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
  else
    update public.payments set status = 'rejected' where id = v_payment.id;
  end if;
end;
$$;

grant execute on function public.approve_payment(uuid, boolean) to authenticated;

-- ------------------------------------------------------------
-- Function: admin adjusts a user balance
-- ------------------------------------------------------------
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
end;
$$;

grant execute on function public.admin_adjust_balance(uuid, numeric, text) to authenticated;
-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- profiles ----------------------------------------------------
drop policy if exists "Profiles own select" on public.profiles;
create policy "Profiles own select" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Profiles admin all" on public.profiles;
create policy "Profiles admin all" on public.profiles
  for all using (public.get_current_role() = 'admin');

-- services ----------------------------------------------------
drop policy if exists "Services read active" on public.services;
create policy "Services read active" on public.services
  for select using (active = true or public.get_current_role() = 'admin');

drop policy if exists "Services admin write" on public.services;
create policy "Services admin write" on public.services
  for all using (public.get_current_role() = 'admin');

-- orders ------------------------------------------------------
drop policy if exists "Orders own select" on public.orders;
create policy "Orders own select" on public.orders
  for select using (user_id = auth.uid());

drop policy if exists "Orders admin all" on public.orders;
create policy "Orders admin all" on public.orders
  for all using (public.get_current_role() = 'admin');

-- order_chunks ------------------------------------------------
drop policy if exists "Chunks own select" on public.order_chunks;
create policy "Chunks own select" on public.order_chunks
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

drop policy if exists "Chunks admin all" on public.order_chunks;
create policy "Chunks admin all" on public.order_chunks
  for all using (public.get_current_role() = 'admin');

-- transactions ------------------------------------------------
drop policy if exists "Tx own select" on public.transactions;
create policy "Tx own select" on public.transactions
  for select using (user_id = auth.uid());

drop policy if exists "Tx admin all" on public.transactions;
create policy "Tx admin all" on public.transactions
  for all using (public.get_current_role() = 'admin');

-- payments ----------------------------------------------------
drop policy if exists "Payments own select" on public.payments;
create policy "Payments own select" on public.payments
  for select using (user_id = auth.uid());

drop policy if exists "Payments own insert" on public.payments;
create policy "Payments own insert" on public.payments
  for insert with check (user_id = auth.uid());

drop policy if exists "Payments admin all" on public.payments;
create policy "Payments admin all" on public.payments
  for all using (public.get_current_role() = 'admin');

-- tickets -----------------------------------------------------
drop policy if exists "Tickets own select" on public.tickets;
create policy "Tickets own select" on public.tickets
  for select using (user_id = auth.uid());

drop policy if exists "Tickets own insert" on public.tickets;
create policy "Tickets own insert" on public.tickets
  for insert with check (user_id = auth.uid());

drop policy if exists "Tickets admin all" on public.tickets;
create policy "Tickets admin all" on public.tickets
  for all using (public.get_current_role() = 'admin');

-- ticket_messages ---------------------------------------------
drop policy if exists "Messages own select" on public.ticket_messages;
create policy "Messages own select" on public.ticket_messages
  for select using (
    exists (select 1 from public.tickets t where t.id = ticket_id and t.user_id = auth.uid())
  );

drop policy if exists "Messages own insert" on public.ticket_messages;
create policy "Messages own insert" on public.ticket_messages
  for insert with check (
    sender = 'user' and exists (select 1 from public.tickets t where t.id = ticket_id and t.user_id = auth.uid())
  );

drop policy if exists "Messages admin all" on public.ticket_messages;
create policy "Messages admin all" on public.ticket_messages
  for all using (public.get_current_role() = 'admin');

-- settings ----------------------------------------------------
drop policy if exists "Settings read all" on public.settings;
create policy "Settings read all" on public.settings
  for select using (true);

drop policy if exists "Settings admin write" on public.settings;
create policy "Settings admin write" on public.settings
  for all using (public.get_current_role() = 'admin');

-- ============================================================
-- End of schema
-- ============================================================

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
-- ============================================================
-- Extra indexes (safe, additive)
-- ============================================================
create index if not exists idx_orders_service on public.orders(service_id);
create index if not exists idx_orders_created on public.orders(created_at);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_tickets_user on public.tickets(user_id);
create index if not exists idx_ticket_messages_ticket on public.ticket_messages(ticket_id);
create index if not exists idx_services_active_platform on public.services(active, platform);

-- ============================================================
-- update_profile extended (language)
-- ============================================================
create or replace function public.update_profile(p_username text default null, p_theme text default null, p_language text default null)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if p_username is not null then
    update public.profiles set username = p_username where id = auth.uid();
  end if;
  if p_theme is not null then
    update public.profiles set theme = p_theme where id = auth.uid();
  end if;
  if p_language is not null then
    update public.profiles set language = p_language where id = auth.uid();
  end if;
end;
$$;

grant execute on function public.update_profile(text, text, text) to authenticated;

-- ============================================================
-- End of ALL_IN_ONE
-- ============================================================


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

-- ============================================================
-- Wazeo - schema_v6
-- ============================================================

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists last_login_at timestamptz;
alter table public.profiles add column if not exists signup_ip_hash text;

create index if not exists idx_profiles_phone on public.profiles(phone) where phone is not null;

-- handle_new_user extended: store phone + signup ip hash from auth meta
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
  insert into public.profiles (id, username, phone, signup_ip_hash, referral_code)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), 'user_' || left(new.id::text, 8)),
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'ip_hash', ''),
    public.gen_referral_code()
  )
  on conflict (id) do update set phone = excluded.phone where profiles.phone is null;

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

-- ============================================================
-- End of schema_v6
-- ============================================================

-- ============================================================
-- Wazeo - schema_v7 (login loop fix: profile backfill)
-- ============================================================

-- Safe backfill: create a profile row for any auth user that lacks one.
-- This is the root-cause fix for the sign-in loop (dashboard/admin layouts
-- redirect to /sign-in when no profile row exists).
insert into public.profiles (id, username, referral_code)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data->>'username', ''), 'user_' || left(u.id::text, 8)),
  public.gen_referral_code()
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- ============================================================
-- End of schema_v7
-- ============================================================

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

-- ============================================================
-- Wazeo - schema_v9 (demo services flag)
-- ============================================================

alter table public.services add column if not exists is_demo boolean not null default false;
create index if not exists idx_services_demo on public.services(is_demo) where is_demo = true;

-- ============================================================
-- End of schema_v9
-- ============================================================

-- ============================================================
-- Wazeo - schema_v10 (profile country)
-- ============================================================

alter table public.profiles add column if not exists country text;
create index if not exists idx_profiles_country on public.profiles(country) where country is not null;

-- ============================================================
-- End of schema_v10
-- ============================================================
-- ============================================================
-- Wazeo - schema_v11 (save ALL signup data + backfill)
-- Adds missing profile columns, extends the signup trigger to copy
-- every metadata field, and backfills existing users from auth.users.
-- Re-runnable (idempotent). Run via `npm run db:setup`.
-- ============================================================

-- 1) Missing profile columns -------------------------------------
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists currency text not null default 'USD';
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists referral_used text;

create index if not exists idx_profiles_email on public.profiles(email) where email is not null;
create index if not exists idx_profiles_referral_used on public.profiles(referral_used) where referral_used is not null;

-- 2) Extended signup trigger: copy every signup field ------------
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
  v_lang text;
  v_currency text;
  v_country text;
begin
  v_lang := nullif(new.raw_user_meta_data->>'language', '');
  if v_lang is null or v_lang not in ('en','ur','hi','fr','zh') then
    v_lang := 'en';
  end if;
  v_currency := nullif(new.raw_user_meta_data->>'currency', '');
  if v_currency is null then v_currency := 'USD'; end if;
  v_country := upper(nullif(new.raw_user_meta_data->>'country', ''));
  if v_country is not null and length(v_country) <> 2 then v_country := null; end if;

  insert into public.profiles
    (id, username, email, phone, signup_ip_hash, country, language, currency, referral_code, referral_used, full_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), 'user_' || left(new.id::text, 8)),
    nullif(new.email, ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'ip_hash', ''),
    v_country,
    v_lang,
    v_currency,
    public.gen_referral_code(),
    nullif(new.raw_user_meta_data->>'referral', ''),
    nullif(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do update set
    email = coalesce(profiles.email, excluded.email),
    phone = coalesce(profiles.phone, excluded.phone),
    country = coalesce(profiles.country, excluded.country),
    language = coalesce(profiles.language, excluded.language),
    currency = coalesce(profiles.currency, excluded.currency),
    referral_used = coalesce(profiles.referral_used, excluded.referral_used);

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

-- 3) update_profile extended: allow saving currency/country --------
create or replace function public.update_profile(
  p_username text default null,
  p_theme text default null,
  p_language text default null,
  p_currency text default null,
  p_country text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if p_username is not null then
    update public.profiles set username = p_username where id = auth.uid();
  end if;
  if p_theme is not null then
    update public.profiles set theme = p_theme where id = auth.uid();
  end if;
  if p_language is not null then
    update public.profiles set language = p_language where id = auth.uid();
  end if;
  if p_currency is not null then
    update public.profiles set currency = p_currency where id = auth.uid();
  end if;
  if p_country is not null then
    update public.profiles set country = upper(p_country) where id = auth.uid();
  end if;
end;
$$;

grant execute on function public.update_profile(text, text, text, text, text) to authenticated;

-- 4) Backfill existing users from auth.users (re-runnable) --------
do $$
begin
  update public.profiles p
  set email = coalesce(p.email, au.email),
      phone = coalesce(p.phone, nullif(au.raw_user_meta_data->>'phone', '')),
      country = coalesce(p.country, nullif(upper(au.raw_user_meta_data->>'country'), '')),
      language = case
        when p.language is not null then p.language
        when au.raw_user_meta_data->>'language' in ('en','ur','hi','fr','zh')
          then au.raw_user_meta_data->>'language'
        else 'en' end,
      currency = coalesce(p.currency, 'USD'),
      referral_used = coalesce(p.referral_used, nullif(au.raw_user_meta_data->>'referral', '')),
      full_name = coalesce(p.full_name, nullif(au.raw_user_meta_data->>'full_name', ''))
  from auth.users au
  where au.id = p.id
    and (p.email is null or p.phone is null or p.country is null or p.currency is null);
end $$;

-- ============================================================
-- End of schema_v11
-- ============================================================
