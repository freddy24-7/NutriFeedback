-- NutriApp — Development Seed Data
-- Run with: psql $DATABASE_URL_UNPOOLED < neon/seed.sql
-- Apply after: npx drizzle-kit migrate
-- WARNING: These are DEVELOPMENT codes only. Never use in production.

-- Development beta codes (unlimited use, no expiry)
INSERT INTO discount_codes (code, type, uses_remaining, expires_at, trial_days)
VALUES
  ('BETA2024',   'beta',       NULL, NULL,                 NULL),
  ('TESTER01',   'beta',       NULL, NULL,                 NULL),
  ('TESTER02',   'beta',       NULL, NULL,                 NULL),
  ('DEVACCESS',  'beta',       NULL, NULL,                 NULL)
ON CONFLICT (code) DO NOTHING;

-- Influencer codes (limited uses, tracked)
INSERT INTO discount_codes (code, type, uses_remaining, expires_at, trial_days)
VALUES
  ('FRIEND10',   'influencer', 10,   '2025-12-31 23:59:59+00', NULL),
  ('PARTNER05',  'influencer', 5,    '2025-06-30 23:59:59+00', NULL)
ON CONFLICT (code) DO NOTHING;

-- Timed trial codes (30 days free access after activation)
INSERT INTO discount_codes (code, type, uses_remaining, expires_at, trial_days)
VALUES
  ('TRIAL30',    'timed',      100,  '2025-12-31 23:59:59+00', 30),
  ('EARLYBIRD',  'timed',      50,   '2025-09-01 23:59:59+00', 60)
ON CONFLICT (code) DO NOTHING;
