-- ============================================================
-- Wazeo — schema_v18 (safety review)
-- Removes the bot-detection / risk-scoring machinery from the
-- organic/delivery engine. Keeps plain curve-based scheduling.
-- Re-runnable: IF EXISTS guards on every statement.
-- ============================================================

-- Drop the risk_config table (bot-likelihood / detection-safety tuning).
drop table if exists public.risk_config;

-- Drop risk-scoring columns from engagement_orders (no longer used).
alter table public.engagement_orders drop column if exists risk_score;
alter table public.engagement_orders drop column if exists band;
alter table public.engagement_orders drop column if exists organic_score;
alter table public.engagement_orders drop column if exists re_rolls;
