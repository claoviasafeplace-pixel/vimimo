import { nanoid } from "nanoid";
import { getSupabase } from "./supabase";
import type { Project, CreditTransaction, CreditTransactionType } from "./types";

// =============================================
// Projects — Supabase (JSON column, persistent)
// =============================================

export async function getProject(id: string): Promise<Project | null> {
  const db = getSupabase();
  const { data } = await db
    .from("projects")
    .select("data")
    .eq("id", id)
    .single();
  return data?.data ?? null;
}

export async function saveProject(project: Project): Promise<void> {
  const db = getSupabase();
  await db.from("projects").upsert({
    id: project.id,
    user_id: project.userId ?? null,
    data: project,
    updated_at: new Date().toISOString(),
  });
}

export async function updateProject(
  id: string,
  updates: Partial<Project>
): Promise<Project> {
  const project = await getProject(id);
  if (!project) throw new Error(`Project ${id} not found`);
  const updated = { ...project, ...updates };
  await saveProject(updated);
  return updated;
}

// =============================================
// Users — Supabase (persistent)
// =============================================

interface DbUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  credits: number;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function getUserById(id: string): Promise<DbUser | null> {
  const db = getSupabase();
  const { data } = await db.from("users").select("*").eq("id", id).single();
  return data;
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const db = getSupabase();
  const { data } = await db.from("users").select("*").eq("email", email).single();
  return data;
}

export async function updateUser(
  id: string,
  updates: Partial<Pick<DbUser, "name" | "image" | "credits" | "stripe_customer_id">>
): Promise<DbUser> {
  const db = getSupabase();
  const { data, error } = await db
    .from("users")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) throw error ?? new Error(`User ${id} not found`);
  return data;
}

// =============================================
// Credits — Supabase (persistent, audit trail)
// =============================================

async function recordTransaction(
  userId: string,
  type: CreditTransactionType,
  amount: number,
  balance: number,
  description: string,
  opts?: { projectId?: string; stripeSessionId?: string }
): Promise<CreditTransaction> {
  const db = getSupabase();
  const tx: CreditTransaction = {
    id: nanoid(12),
    userId,
    type,
    amount,
    balance,
    projectId: opts?.projectId,
    stripeSessionId: opts?.stripeSessionId,
    description,
    createdAt: Date.now(),
  };

  await db.from("credit_transactions").insert({
    id: tx.id,
    user_id: tx.userId,
    type: tx.type,
    amount: tx.amount,
    balance: tx.balance,
    project_id: tx.projectId ?? null,
    stripe_session_id: tx.stripeSessionId ?? null,
    description: tx.description,
  });

  return tx;
}

export async function addCredits(
  userId: string,
  amount: number,
  description: string,
  stripeSessionId?: string
): Promise<DbUser> {
  const db = getSupabase();

  // Idempotency check for Stripe
  if (stripeSessionId) {
    const { data: existing } = await db
      .from("credit_transactions")
      .select("id")
      .eq("stripe_session_id", stripeSessionId)
      .single();

    if (existing) {
      return (await getUserById(userId))!;
    }
  }

  // Atomic increment
  const { data: user, error } = await db.rpc("increment_credits", {
    user_id: userId,
    delta: amount,
  });

  // Fallback if RPC doesn't exist yet
  let updatedUser: DbUser;
  if (error) {
    const current = await getUserById(userId);
    if (!current) throw new Error(`User ${userId} not found`);
    updatedUser = await updateUser(userId, { credits: current.credits + amount });
  } else {
    updatedUser = (await getUserById(userId))!;
  }

  await recordTransaction(userId, "purchase", amount, updatedUser.credits, description, {
    stripeSessionId,
  });

  return updatedUser;
}

export async function deductCredits(
  userId: string,
  amount: number,
  projectId: string,
  description: string
): Promise<DbUser> {
  const user = await getUserById(userId);
  if (!user) throw new Error(`User ${userId} not found`);
  if (user.credits < amount) throw new Error("Insufficient credits");

  const updatedUser = await updateUser(userId, { credits: user.credits - amount });

  await recordTransaction(userId, "deduction", -amount, updatedUser.credits, description, {
    projectId,
  });

  return updatedUser;
}

export async function refundCredits(
  userId: string,
  amount: number,
  projectId: string,
  description: string
): Promise<DbUser> {
  const user = await getUserById(userId);
  if (!user) throw new Error(`User ${userId} not found`);

  const updatedUser = await updateUser(userId, { credits: user.credits + amount });

  await recordTransaction(userId, "refund", amount, updatedUser.credits, description, {
    projectId,
  });

  return updatedUser;
}

export async function getUserTransactions(
  userId: string,
  limit = 50
): Promise<CreditTransaction[]> {
  const db = getSupabase();
  const { data } = await db
    .from("credit_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    type: row.type as CreditTransactionType,
    amount: row.amount,
    balance: row.balance,
    projectId: row.project_id ?? undefined,
    stripeSessionId: row.stripe_session_id ?? undefined,
    description: row.description,
    createdAt: new Date(row.created_at).getTime(),
  }));
}

// =============================================
// Subscriptions — Supabase
// =============================================

export interface DbSubscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  plan_id: string;
  status: string;
  credits_per_period: number;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export async function getActiveSubscription(userId: string): Promise<DbSubscription | null> {
  const db = getSupabase();
  const { data } = await db
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data;
}

export async function upsertSubscription(sub: {
  userId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  planId: string;
  status: string;
  creditsPerPeriod: number;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}): Promise<void> {
  const db = getSupabase();
  const now = new Date().toISOString();

  // Check if subscription exists
  const { data: existing } = await db
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", sub.stripeSubscriptionId)
    .single();

  if (existing) {
    await db
      .from("subscriptions")
      .update({
        status: sub.status,
        stripe_price_id: sub.stripePriceId,
        plan_id: sub.planId,
        credits_per_period: sub.creditsPerPeriod,
        current_period_end: sub.currentPeriodEnd.toISOString(),
        cancel_at_period_end: sub.cancelAtPeriodEnd,
        updated_at: now,
      })
      .eq("stripe_subscription_id", sub.stripeSubscriptionId);
  } else {
    await db.from("subscriptions").insert({
      id: nanoid(12),
      user_id: sub.userId,
      stripe_subscription_id: sub.stripeSubscriptionId,
      stripe_price_id: sub.stripePriceId,
      plan_id: sub.planId,
      status: sub.status,
      credits_per_period: sub.creditsPerPeriod,
      current_period_end: sub.currentPeriodEnd.toISOString(),
      cancel_at_period_end: sub.cancelAtPeriodEnd,
      created_at: now,
      updated_at: now,
    });
  }
}
