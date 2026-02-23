import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result && result.error) return result.error;

  const db = getSupabase();

  // Projects by phase
  const { data: allProjects } = await db
    .from("projects")
    .select("data->phase");

  const projectsByPhase: Record<string, number> = {};
  if (allProjects) {
    for (const row of allProjects) {
      const phase = (row as Record<string, unknown>).phase as string || "unknown";
      projectsByPhase[phase] = (projectsByPhase[phase] || 0) + 1;
    }
  }

  // Recent projects (last 50)
  const { data: recentRows } = await db
    .from("projects")
    .select("id, user_id, data, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const recentProjects = (recentRows || []).map((row) => {
    const data = row.data as Record<string, unknown> | null;
    const rooms = data?.rooms as unknown[] | undefined;
    return {
      id: row.id,
      user_id: row.user_id,
      phase: (data?.phase as string) || "unknown",
      mode: (data?.mode as string) || "staging_piece",
      roomCount: Array.isArray(rooms) ? rooms.length : 0,
      created_at: row.created_at,
    };
  });

  // Credit stats
  const { data: purchaseRows } = await db
    .from("credit_transactions")
    .select("amount")
    .eq("type", "purchase");

  const { data: deductionRows } = await db
    .from("credit_transactions")
    .select("amount")
    .eq("type", "deduction");

  const { data: refundRows } = await db
    .from("credit_transactions")
    .select("amount")
    .eq("type", "refund");

  const totalPurchased = (purchaseRows || []).reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalDeducted = (deductionRows || []).reduce((sum, r) => sum + Math.abs(r.amount || 0), 0);
  const totalRefunded = (refundRows || []).reduce((sum, r) => sum + (r.amount || 0), 0);

  const creditStats = {
    totalPurchased,
    totalDeducted,
    totalRefunded,
  };

  // Subscription stats
  const { data: subRows } = await db
    .from("subscriptions")
    .select("status");

  const subscriptionStats: Record<string, number> = {};
  if (subRows) {
    for (const row of subRows) {
      const status = row.status || "unknown";
      subscriptionStats[status] = (subscriptionStats[status] || 0) + 1;
    }
  }

  // Total users
  const { count: totalUsers } = await db
    .from("users")
    .select("id", { count: "exact", head: true });

  // User emails for recent projects display
  const userIds = [...new Set(recentProjects.map((p) => p.user_id).filter(Boolean))];
  const userEmailMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: users } = await db
      .from("users")
      .select("id, email")
      .in("id", userIds);
    if (users) {
      for (const u of users) {
        userEmailMap[u.id] = u.email;
      }
    }
  }

  return NextResponse.json({
    projectsByPhase,
    recentProjects: recentProjects.map((p) => ({
      ...p,
      userEmail: p.user_id ? userEmailMap[p.user_id] || null : null,
    })),
    creditStats,
    subscriptionStats,
    totalUsers: totalUsers || 0,
  });
}
