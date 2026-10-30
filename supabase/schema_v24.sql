-- ============================================================
-- Wazeo - schema_v24 (license lifecycle enhancements)
-- Extends access_codes with suspension, audit, and permission fields
-- for the unbound email-binding license flow. Re-runnable.
-- Full keys are NEVER stored - only SHA-256 hash + last 4.
-- ============================================================

-- ---- suspension & admin audit ----
alter table public.access_codes add column if not exists suspended boolean not null default false;
alter table public.access_codes add column if not exists created_by uuid references public.profiles(id);
alter table public.access_codes add column if not exists last_used_at timestamptz;
alter table public.access_codes add column if not exists bound_at timestamptz;

-- ---- permission / quota metadata (stored on the license) ----
alter table public.access_codes add column if not exists permissions jsonb not null default '[]'::jsonb;
alter table public.access_codes add column if not exists quota jsonb not null default '{}'::jsonb;

-- ---- indexes ----
create index if not exists idx_access_codes_suspended on public.access_codes(suspended) where suspended;
create index if not exists idx_access_codes_created_by on public.access_codes(created_by) where created_by is not null;
create index if not exists idx_access_codes_bound_at on public.access_codes(bound_at) where bound_at is not null;
