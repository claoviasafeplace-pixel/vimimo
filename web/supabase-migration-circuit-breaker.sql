-- Circuit Breaker State table
-- Persists circuit breaker state across Vercel cold starts
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS circuit_breaker_state (
  service TEXT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'closed' CHECK (state IN ('closed', 'open', 'half_open')),
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  last_alert_at TIMESTAMPTZ,
  failure_reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the 4 services
INSERT INTO circuit_breaker_state (service) VALUES
  ('openai'),
  ('replicate'),
  ('replicate_video'),
  ('remotion')
ON CONFLICT (service) DO NOTHING;
