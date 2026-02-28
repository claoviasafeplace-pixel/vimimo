import { nanoid } from "nanoid";
import { getSupabase } from "./supabase";
import type {
  Project,
  CreditTransaction,
  CreditTransactionType,
  OrderStatus,
  AdminKanbanStatus,
} from "./types";

// =============================================
// Projects — Supabase (JSON column, persistent)
// =============================================

export async function getProject(id: string): Promise<Project | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from("projects")
    .select("data")
    .eq("id", id)
    .single();
  // PGRST116 = row not found — that's a valid null, any other error should throw
  if (error && error.code !== "PGRST116") throw error;
  return data?.data ?? null;
}

export async function saveProject(project: Project): Promise<void> {
  const db = getSupabase();
  const { error } = await db.from("projects").upsert({
    id: project.id,
    user_id: project.userId ?? null,
    data: project,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function updateProject(
  id: string,
  updates: Partial<Project>
): Promise<Project> {
  const db = getSupabase();

  // Atomic JSONB merge via RPC — no read-then-write race condition
  const { error: rpcError } = await db.rpc("update_project_data", {
    p_id: id,
    p_partial: updates as Record<string, unknown>,
  });

  if (rpcError) {
    // Fallback: read-then-write (for envs where RPC isn't deployed yet)
    console.warn("update_project_data RPC failed, falling back:", rpcError.message);
    const project = await getProject(id);
    if (!project) throw new Error(`Project ${id} not found`);
    const updated = { ...project, ...updates };
    await saveProject(updated);
    return updated;
  }

  // Re-read merged result
  const merged = await getProject(id);
  if (!merged) throw new Error(`Project ${id} not found after update`);
  return merged;
}

// Atomic update for order/kanban status (updates both JSONB data + indexed columns)
export async function updateProjectStatus(
  id: string,
  orderStatus: OrderStatus,
  kanbanStatus: AdminKanbanStatus,
  extraUpdates?: Partial<Project>,
): Promise<Project> {
  const db = getSupabase();

  // Update indexed columns
  await db
    .from("projects")
    .update({
      order_status: orderStatus,
      kanban_status: kanbanStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  // Merge into JSONB data
  const jsonbUpdates: Partial<Project> = {
    orderStatus,
    kanbanStatus,
    ...extraUpdates,
  };

  return updateProject(id, jsonbUpdates);
}

// Get orders grouped by kanban status (for admin Kanban board)
export async function getOrdersByKanbanStatus(): Promise<
  Record<AdminKanbanStatus, ProjectSummary[]>
> {
  const db = getSupabase();
  const { data: rows } = await db
    .from("projects")
    .select("id, data, created_at")
    .not("order_status", "is", null)
    .order("created_at", { ascending: false });

  const result: Record<AdminKanbanStatus, ProjectSummary[]> = {
    a_traiter: [],
    en_generation: [],
    a_valider: [],
    livre: [],
  };

  if (!rows) return result;

  for (const row of rows) {
    const data = row.data as Record<string, unknown> | null;
    const rooms = data?.rooms as Array<Record<string, unknown>> | undefined;
    const photos = data?.photos as Array<Record<string, unknown>> | undefined;
    const kanbanStatus = (data?.kanbanStatus as AdminKanbanStatus) || "a_traiter";

    let thumbnailUrl: string | null = null;
    if (rooms?.length) {
      const room = rooms[0];
      const options = room.options as Array<Record<string, unknown>> | undefined;
      const selectedIdx = (room.selectedOptionIndex as number) ?? 0;
      if (options?.[selectedIdx]?.url) {
        thumbnailUrl = options[selectedIdx].url as string;
      }
    }
    if (!thumbnailUrl && photos?.length) {
      thumbnailUrl = (photos[0].originalUrl as string) || null;
    }

    const summary: ProjectSummary = {
      id: row.id,
      phase: (data?.phase as string) || "unknown",
      mode: (data?.mode as string) || "staging_piece",
      styleLabel: (data?.styleLabel as string) || "",
      roomCount: Array.isArray(rooms) ? rooms.length : 0,
      thumbnailUrl,
      finalVideoUrl: (data?.finalVideoUrl as string) || null,
      studioMontageUrl: (data?.studioMontageUrl as string) || null,
      createdAt: (data?.createdAt as number) || new Date(row.created_at).getTime(),
      error: (data?.error as string) || null,
      orderStatus: (data?.orderStatus as string) || null,
      kanbanStatus: (data?.kanbanStatus as string) || null,
      clientEmail: (data?.clientEmail as string) || null,
      ambiance: (data?.ambiance as string) || null,
      deliveredAt: (data?.deliveredAt as number) || null,
    };

    if (result[kanbanStatus]) {
      result[kanbanStatus].push(summary);
    }
  }

  return result;
}

export interface ProjectSummary {
  id: string;
  phase: string;
  mode: string;
  styleLabel: string;
  roomCount: number;
  thumbnailUrl: string | null;
  finalVideoUrl: string | null;
  studioMontageUrl: string | null;
  createdAt: number;
  error: string | null;
  orderStatus?: string | null;
  kanbanStatus?: string | null;
  clientEmail?: string | null;
  ambiance?: string | null;
  deliveredAt?: number | null;
}

export async function getUserProjects(userId: string, limit = 50): Promise<ProjectSummary[]> {
  const db = getSupabase();
  const { data: rows } = await db
    .from("projects")
    .select("id, data, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!rows) return [];

  return rows.map((row) => {
    const data = row.data as Record<string, unknown> | null;
    const rooms = data?.rooms as Array<Record<string, unknown>> | undefined;
    const photos = data?.photos as Array<Record<string, unknown>> | undefined;

    // Get thumbnail: first room's selected option, or first photo
    let thumbnailUrl: string | null = null;
    if (rooms?.length) {
      const room = rooms[0];
      const options = room.options as Array<Record<string, unknown>> | undefined;
      const selectedIdx = (room.selectedOptionIndex as number) ?? 0;
      if (options?.[selectedIdx]?.url) {
        thumbnailUrl = options[selectedIdx].url as string;
      }
    }
    if (!thumbnailUrl && photos?.length) {
      thumbnailUrl = (photos[0].originalUrl as string) || null;
    }

    return {
      id: row.id,
      phase: (data?.phase as string) || "unknown",
      mode: (data?.mode as string) || "staging_piece",
      styleLabel: (data?.styleLabel as string) || "",
      roomCount: Array.isArray(rooms) ? rooms.length : 0,
      thumbnailUrl,
      finalVideoUrl: (data?.finalVideoUrl as string) || null,
      studioMontageUrl: (data?.studioMontageUrl as string) || null,
      createdAt: data?.createdAt as number || new Date(row.created_at).getTime(),
      error: (data?.error as string) || null,
      orderStatus: (data?.orderStatus as string) || null,
      kanbanStatus: (data?.kanbanStatus as string) || null,
      deliveredAt: (data?.deliveredAt as number) || null,
    };
  });
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

  const { error } = await db.from("credit_transactions").insert({
    id: tx.id,
    user_id: tx.userId,
    type: tx.type,
    amount: tx.amount,
    balance: tx.balance,
    project_id: tx.projectId ?? null,
    stripe_session_id: tx.stripeSessionId ?? null,
    description: tx.description,
  });
  if (error) throw error;

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
  const db = getSupabase();

  // Idempotency: don't deduct twice for same project
  const { data: existingTx } = await db
    .from("credit_transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .eq("type", "deduction")
    .single();

  if (existingTx) {
    return (await getUserById(userId))!;
  }

  // Atomic decrement via RPC
  const { data: rpcResult, error: rpcError } = await db.rpc("decrement_credits", {
    p_user_id: userId,
    p_amount: amount,
  });

  let updatedUser: DbUser;
  if (rpcError) {
    // Fallback: read-check-write (less safe but functional)
    const user = await getUserById(userId);
    if (!user) throw new Error(`User ${userId} not found`);
    if (user.credits < amount) throw new Error("Insufficient credits");
    updatedUser = await updateUser(userId, { credits: user.credits - amount });
  } else {
    // RPC returns new balance, -1 means insufficient
    if (rpcResult === -1) throw new Error("Insufficient credits");
    updatedUser = (await getUserById(userId))!;
  }

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
  const db = getSupabase();

  // Idempotency guard: check if refund already exists for this project
  const { data: existingRefund } = await db
    .from("credit_transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .eq("type", "refund")
    .single();

  if (existingRefund) {
    console.warn(`Refund already exists for project ${projectId}, skipping`);
    return (await getUserById(userId))!;
  }

  // Atomic increment via RPC
  const { error: rpcError } = await db.rpc("increment_credits", {
    user_id: userId,
    delta: amount,
  });

  let updatedUser: DbUser;
  if (rpcError) {
    const user = await getUserById(userId);
    if (!user) throw new Error(`User ${userId} not found`);
    updatedUser = await updateUser(userId, { credits: user.credits + amount });
  } else {
    updatedUser = (await getUserById(userId))!;
  }

  try {
    await recordTransaction(userId, "refund", amount, updatedUser.credits, description, {
      projectId,
    });
  } catch (txError) {
    // Unique index violation = concurrent duplicate refund — safe to ignore
    console.warn(`Refund transaction insert conflict for project ${projectId}:`, txError);
  }

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

// =============================================
// Prediction Map — Replicate webhook routing
// =============================================

export interface PredictionMapEntry {
  predictionId: string;
  projectId: string;
  predictionType: "clean" | "staging" | "video";
  roomIndex?: number;
}

export async function savePredictionMap(entry: PredictionMapEntry): Promise<void> {
  const db = getSupabase();
  await db.from("prediction_map").upsert({
    prediction_id: entry.predictionId,
    project_id: entry.projectId,
    prediction_type: entry.predictionType,
    room_index: entry.roomIndex ?? null,
  });
}

export async function getPredictionMap(predictionId: string): Promise<PredictionMapEntry | null> {
  const db = getSupabase();
  const { data } = await db
    .from("prediction_map")
    .select("*")
    .eq("prediction_id", predictionId)
    .single();

  if (!data) return null;
  return {
    predictionId: data.prediction_id,
    projectId: data.project_id,
    predictionType: data.prediction_type,
    roomIndex: data.room_index ?? undefined,
  };
}
