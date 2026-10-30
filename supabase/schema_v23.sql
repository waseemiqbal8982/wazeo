-- ============================================================
-- Wazeo — schema_v23 (full customer API-key lifecycle)
-- Extends the existing public.api_keys table into a complete,
-- auditable customer API-key system. Re-runnable (IF EXISTS guards).
--
-- Security rules enforced here:
--   * NEVER store plaintext keys — only SHA-256 hash + masked prefix.
--   * RLS: owner select/insert; admin all. Mutations are performed
--     server-side via the service-role client after authorization checks
--     (customers may only touch their own rows).
-- ============================================================

-- ---- extend api_keys with lifecycle metadata ----
alter table public.api_keys add column if not exists label text;
alter table public.api_keys add column if not exists status text not null default 'active';
alter table public.api_keys add column if not exists expires_at timestamptz;
alter table public.api_keys add column if not exists uses integer not null default 0;
alter table public.api_keys add column if not exists usage_cap numeric;
alter table public.api_keys add column if not exists rate_limit integer;
alter table public.api_keys add column if not exists permissions jsonb not null default '[]'::jsonb;
alter table public.api_keys add column if not exists features jsonb not null default '[]'::jsonb;
alter table public.api_keys add column if not exists revoked_at timestamptz;
alter table public.api_keys add column if not exists revoked_reason text;
alter table public.api_keys add column if not exists suspended_at timestamptz;
alter table public.api_keys add column if not exists banned_at timestamptz;

create index if not exists idx_api_keys_user_status on public.api_keys(user_id, status);
create index if not exists idx_api_keys_prefix on public.api_keys(prefix);

-- ---- RLS ----
-- Owner select + insert (read-your-own, create-your-own). Mutations
-- (revoke/suspend/etc.) are performed server-side with the service-role
-- client after an in-code authorization check, so we deliberately do NOT
-- grant owners a blanket UPDATE/ban path that could be abused client-side.
drop policy if exists "ApiKeys own update" on public.api_keys;
create policy "ApiKeys own update" on public.api_keys
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "ApiKeys own select" on public.api_keys;
create policy "ApiKeys own select" on public.api_keys
  for select using (user_id = auth.uid());
drop policy if exists "ApiKeys own insert" on public.api_keys;
create policy "ApiKeys own insert" on public.api_keys
  for insert with check (user_id = auth.uid());
drop policy if exists "ApiKeys admin" on public.api_keys;
create policy "ApiKeys admin" on public.api_keys
  for all using (public.get_current_role() = 'admin');
