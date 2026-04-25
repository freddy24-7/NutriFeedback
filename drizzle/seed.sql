-- NutriApp dev seed — discount codes
-- Run after migration: psql $DATABASE_URL < drizzle/seed.sql
-- Safe to re-run (ON CONFLICT DO NOTHING)

INSERT INTO discount_codes (code, type, uses_remaining, expires_at, trial_days, created_at)
VALUES
  -- Beta access: permanent comped, unlimited uses, never expires
  ('BETA2024',      'beta',       NULL, NULL,                       NULL, NOW()),
  ('EARLYBIRD',     'beta',       NULL, NULL,                       NULL, NOW()),

  -- Influencer codes: comped access, limited to 5 uses each
  ('INFLUX01',      'influencer', 5,    NULL,                       NULL, NOW()),
  ('INFLUX02',      'influencer', 5,    NULL,                       NULL, NOW()),

  -- Timed trial extension: 30 extra days, limited to 10 uses, expires 2025-12-31
  ('TRIAL30',       'timed',      10,   '2025-12-31 23:59:59+00',   30,   NOW()),

  -- Zero-uses code (already exhausted — for testing rejection)
  ('USED_UP',       'influencer', 0,    NULL,                       NULL, NOW()),

  -- Expired code (for testing rejection)
  ('EXPIRED_CODE',  'timed',      NULL, '2020-01-01 00:00:00+00',   30,   NOW())

ON CONFLICT (code) DO NOTHING;
