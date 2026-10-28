-- ============================================================
-- Wazeo - schema_v13 (currency rates)
-- Manual fallback rates (units per 1 USD). Editable in Admin > Settings.
-- ============================================================

insert into public.settings (key, value) values
  ('rate_INR', '83.5'),
  ('rate_PKR', '278'),
  ('rate_CNY', '7.2')
on conflict (key) do nothing;

-- ============================================================
-- End of schema_v13
-- ============================================================
