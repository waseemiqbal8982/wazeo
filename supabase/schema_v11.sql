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
