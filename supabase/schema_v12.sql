-- ============================================================
-- Wazeo - schema_v12 (support hub settings)
-- Defaults for the Support Hub + floating contact widget.
-- Re-runnable. Values are stored in the `settings` table (never hardcoded).
-- ============================================================

insert into public.settings (key, value) values
  ('support_whatsapp', ''),
  ('support_telegram', ''),
  ('support_email', 'support@innvera.shop'),
  ('working_hours', '09:00-18:00'),
  ('working_tz', 'Asia/Karachi'),
  ('support_welcome', 'Welcome! How can we help you today?')
on conflict (key) do nothing;

-- ============================================================
-- End of schema_v12
-- ============================================================
