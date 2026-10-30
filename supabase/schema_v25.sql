-- ============================================================
-- Wazeo - schema_v25 (access-key encryption at rest)
-- Full keys are now stored ENCRYPTED (AES-256-GCM) via
-- lib/keyEncryption.ts (KEY_ENCRYPTION_SECRET) so admins can show
-- them in full to authorized staff. Lookup uses a keyed HMAC hash
-- (key_hash). Existing hash-only rows have no encrypted_key -> legacy.
-- Re-runnable.
-- ============================================================

alter table public.access_codes add column if not exists encrypted_key text;
alter table public.access_codes add column if not exists key_hash text;
alter table public.access_codes add column if not exists legacy boolean not null default true;

create index if not exists idx_access_codes_key_hash on public.access_codes(key_hash) where key_hash is not null;
create index if not exists idx_access_codes_legacy on public.access_codes(legacy) where legacy;
