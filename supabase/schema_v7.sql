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
