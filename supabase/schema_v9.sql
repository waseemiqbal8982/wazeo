-- ============================================================
-- Wazeo - schema_v9 (demo services flag)
-- ============================================================

alter table public.services add column if not exists is_demo boolean not null default false;
create index if not exists idx_services_demo on public.services(is_demo) where is_demo = true;

-- ============================================================
-- End of schema_v9
-- ============================================================
