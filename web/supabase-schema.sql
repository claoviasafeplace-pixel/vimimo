-- ============================================
-- VIMIMO — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Users (NextAuth compatible + custom fields)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  "emailVerified" TIMESTAMPTZ,
  image TEXT,
  credits INTEGER NOT NULL DEFAULT 0,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Accounts (NextAuth OAuth — Google, etc.)
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, "providerAccountId")
);

-- Verification tokens (NextAuth magic links)
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  UNIQUE(identifier, token)
);

-- Credit transactions (audit trail)
CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'deduction', 'refund', 'manual')),
  amount INTEGER NOT NULL,
  balance INTEGER NOT NULL,
  project_id TEXT,
  stripe_session_id TEXT UNIQUE,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscriptions (Stripe recurring)
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_price_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  credits_per_period INTEGER NOT NULL DEFAULT 0,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects (pipeline state, JSONB)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin column
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Password hash (for email/password auth — nullable for OAuth/magic-link users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Prediction map (for Replicate webhooks)
CREATE TABLE IF NOT EXISTS prediction_map (
  prediction_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  prediction_type TEXT NOT NULL,
  room_index INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts("userId");
CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_stripe ON credit_transactions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_map_project ON prediction_map(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_phase ON projects ((data->>'phase'));
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects (created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_map ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS. These policies are for extra safety.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='Service role full access') THEN
    CREATE POLICY "Service role full access" ON users FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='accounts' AND policyname='Service role full access') THEN
    CREATE POLICY "Service role full access" ON accounts FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='verification_tokens' AND policyname='Service role full access') THEN
    CREATE POLICY "Service role full access" ON verification_tokens FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='credit_transactions' AND policyname='Service role full access') THEN
    CREATE POLICY "Service role full access" ON credit_transactions FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscriptions' AND policyname='Service role full access') THEN
    CREATE POLICY "Service role full access" ON subscriptions FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='projects' AND policyname='Service role full access') THEN
    CREATE POLICY "Service role full access" ON projects FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='prediction_map' AND policyname='Service role full access') THEN
    CREATE POLICY "Service role full access" ON prediction_map FOR ALL USING (true);
  END IF;
END $$;

-- ============================================
-- RPC: Atomic JSONB merge for projects (PERF-01)
-- Merges partial JSON into existing data column
-- ============================================
CREATE OR REPLACE FUNCTION update_project_data(p_id TEXT, p_partial JSONB)
RETURNS VOID AS $$
BEGIN
  UPDATE projects
  SET data = data || p_partial,
      updated_at = NOW()
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project % not found', p_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Unique index for refund idempotency (PAY-05)
-- Prevents double refund for the same project
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_tx_refund_unique
  ON credit_transactions (user_id, project_id)
  WHERE type = 'refund';

-- ============================================
-- CHECK constraint: credits can never go negative (PAY-11)
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'credits_non_negative'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT credits_non_negative CHECK (credits >= 0);
  END IF;
END $$;
