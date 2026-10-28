-- ============================================================
-- Wazeo — schema_v17
-- Adds: risk_config table (single source for every risk/tuning
-- numeric constant; nothing is hardcoded in engine code), RLS,
-- and a seed mirroring lib/organic defaults.
-- Re-runnable / idempotent.
-- ============================================================

create table if not exists public.risk_config (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

alter table public.risk_config enable row level security;

drop policy if exists "risk_config read" on public.risk_config;
create policy "risk_config read" on public.risk_config
  for select using (true);

drop policy if exists "risk_config admin write" on public.risk_config;
create policy "risk_config admin write" on public.risk_config
  for all using (public.get_current_role() = 'admin');

insert into public.risk_config (key, value, description) values
('hard_caps', '{"maxMicroStepsPerRun":220,"maxEvents":6000,"maxChartPoints":1500,"maxGapMinutes":45,"maxJumpPercentPerMinute":2,"endDumpWindowPercent":10,"endDumpLastPercent":25,"slowStartMinutes":60,"slowStartMinPercent":3,"slowStartMaxPercent":8,"roundJitterPercent":5,"placementMinScore":30}'::jsonb, 'Engine hard caps (guardrails)'),
('risk_weights', '{"maxSliceFractionCap":22,"flatGapPenalty":3,"endDumpPenalty":4,"engagementDeviation":3,"firstHourPenalty":5,"offHoursPenalty":3,"roundNumberPenalty":2,"serviceQualityPenalty":2,"organicBase":55,"dipChanceWeight":20,"burstChanceWeight":15,"pauseChanceWeight":15,"microStepsWeight":15,"minOrganicScore":55,"maxOrganicScore":99}'::jsonb, 'Risk scoring weights (these are the tune knobs)'),
('session_types', '{"megaBurst":{"prob":0.06,"intervalMult":0.2,"qtyMult":3},"burst":{"prob":0.18,"intervalMult":0.35,"qtyMult":2},"normal":{"prob":0.48,"intervalMult":1,"qtyMult":1},"slow":{"prob":0.18,"intervalMult":2.2,"qtyMult":0.6},"pause":{"prob":0.07,"intervalMult":4,"qtyMult":0.35},"deadZone":{"prob":0.03,"intervalMult":8,"qtyMult":0.2}}'::jsonb, 'Session probability / interval / quantity multipliers'),
('timing_views', '{"min":15,"max":120,"jitter":40,"chaos":2.2}'::jsonb, 'Views timing jitter'),
('variance_views', '{"min":100,"max":250,"variance":0.65,"spikeMax":350,"hardCap":400}'::jsonb, 'Views variance / spike caps'),
('hour_multipliers', '[0.06,0.05,0.04,0.05,0.07,0.12,0.18,0.25,0.32,0.4,0.5,0.6,0.7,0.8,0.9,1,1.12,1.24,1.38,1.55,1.72,1.6,1.3,0.9]'::jsonb, 'Diurnal hour-of-day multipliers (index=hour)'),
('weekday_multipliers', '[0.9,0.9,0.9,0.9,0.9,1,1,1,1.05,1.05,1.05,1.05,1.05,1.05,1.05,1.05,1.05,1.05,1,1,1,1,1,0.95]'::jsonb, 'Weekday multipliers'),
('risk_bands', '{"high":15,"medium":25,"low":35,"designTarget":22}'::jsonb, 'Risk band boundaries (score ranges) + design target')
on conflict (key) do update set value = excluded.value, description = excluded.description, updated_at = now();

-- ============================================================
-- End of schema_v17
-- ============================================================
