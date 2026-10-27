-- ============================================================
-- Wazeo - schema_v10 (profile country)
-- ============================================================

alter table public.profiles add column if not exists country text;
create index if not exists idx_profiles_country on public.profiles(country) where country is not null;

-- ============================================================
-- End of schema_v10
-- ============================================================
