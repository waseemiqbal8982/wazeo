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
