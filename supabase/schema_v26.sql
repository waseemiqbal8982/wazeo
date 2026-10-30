-- ============================================================
-- Wazeo - schema_v26 (key sessions for per-key device tracking)
-- Tracks which device/email-bound session activated a given key so
-- admins can see the device count and enforce a per-key device cap.
-- Re-runnable.
-- ============================================================

create table if not exists public.key_sessions (
  id uuid primary key default gen_random_uuid(),
  key_id uuid references public.access_codes(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  ip_hash text,
  device_label text default '',
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

create index if not exists idx_key_sessions_key on public.key_sessions(key_id);
create index if not exists idx_key_sessions_user on public.key_sessions(user_id);
