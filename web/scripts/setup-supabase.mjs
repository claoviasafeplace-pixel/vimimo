/**
 * Setup Supabase tables for VIMIMO
 * Connects directly to Supabase PostgreSQL via postgres.js
 * Run: node scripts/setup-supabase.mjs
 */

import postgres from "postgres";

// Supabase direct connection (pooler mode)
// Format: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("Usage: DATABASE_URL=postgresql://... node scripts/setup-supabase.mjs");
  console.error("");
  console.error("Find your connection string in Supabase Dashboard:");
  console.error("  Project Settings → Database → Connection string → URI");
  console.error("");
  console.error("Example:");
  console.error("  DATABASE_URL='postgresql://postgres.gjndjutzpumdzkqwkzny:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres' node scripts/setup-supabase.mjs");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: "require" });

async function main() {
  console.log("Setting up Supabase tables for VIMIMO...\n");

  // Users
  await sql`
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
    )
  `;
  console.log("  ✓ users");

  // Accounts
  await sql`
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
    )
  `;
  console.log("  ✓ accounts");

  // Verification tokens
  await sql`
    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier TEXT NOT NULL,
      token TEXT NOT NULL,
      expires TIMESTAMPTZ NOT NULL,
      UNIQUE(identifier, token)
    )
  `;
  console.log("  ✓ verification_tokens");

  // Credit transactions
  await sql`
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
    )
  `;
  console.log("  ✓ credit_transactions");

  // Subscriptions
  await sql`
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
    )
  `;
  console.log("  ✓ subscriptions");

  // Projects (pipeline state as JSONB)
  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      data JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log("  ✓ projects");

  // Indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts("userId")`;
  await sql`CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_credit_tx_stripe ON credit_transactions(stripe_session_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_stripe ON users(stripe_customer_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id)`;
  console.log("  ✓ indexes");

  // RLS
  await sql`ALTER TABLE users ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE accounts ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE projects ENABLE ROW LEVEL SECURITY`;
  console.log("  ✓ RLS enabled");

  // Policies (idempotent)
  const tables = ["users", "accounts", "verification_tokens", "credit_transactions", "subscriptions", "projects"];
  for (const table of tables) {
    const existing = await sql`
      SELECT 1 FROM pg_policies WHERE tablename=${table} AND policyname='Service role full access'
    `;
    if (existing.length === 0) {
      await sql.unsafe(`CREATE POLICY "Service role full access" ON ${table} FOR ALL USING (true)`);
    }
  }
  console.log("  ✓ RLS policies");

  // Verify
  const result = await sql`
    SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename
  `;
  console.log("\nTables created:", result.map((r) => r.tablename).join(", "));

  await sql.end();
  console.log("\nDone!");
}

main().catch(async (err) => {
  console.error("Error:", err.message);
  await sql.end();
  process.exit(1);
});
