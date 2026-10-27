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
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
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
