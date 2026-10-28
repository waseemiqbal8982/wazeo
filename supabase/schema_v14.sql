-- ============================================================
-- Wazeo - schema_v14 (access key system)
-- Extends access_codes for the admin-generated, single-use access keys.
-- Re-runnable. Full keys are NEVER stored - only SHA-256 hash + last 4.
-- ============================================================

alter table public.access_codes add column if not exists email text;
alter table public.access_codes add column if not exists hash text;
alter table public.access_codes add column if not exists last4 text;
alter table public.access_codes add column if not exists mode text not null default 'self';
alter table public.access_codes add column if not exists note text;
alter table public.access_codes add column if not exists must_change_password boolean not null default false;
alter table public.access_codes add column if not exists used_by uuid;
alter table public.access_codes add column if not exists used_at timestamptz;
alter table public.access_codes add column if not exists revoked boolean not null default false;

create index if not exists idx_access_codes_email on public.access_codes(email) where email is not null;
create index if not exists idx_access_codes_hash on public.access_codes(hash) where hash is not null;

-- profile: which access key created this user
alter table public.profiles add column if not exists access_key_id uuid;
create index if not exists idx_profiles_access_key on public.profiles(access_key_id) where access_key_id is not null;

-- temporary-password / forced change flags
alter table public.profiles add column if not exists must_change_password boolean not null default false;
alter table public.profiles add column if not exists password_temp_set boolean not null default false;

-- allow deposit/credit transaction types (used by access-key starting balance)
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint transactions_type_check check (type in ('order','refund','deposit','credit'));

-- ============================================================
-- End of schema_v14
-- ============================================================
