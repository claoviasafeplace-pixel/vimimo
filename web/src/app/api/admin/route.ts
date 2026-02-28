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

  // Revenue by month (last 6 months)
  const EUR_PER_CREDIT = 7; // approximate average: 3cr=24.99€, 10cr=69.99€, 25cr=149.99€
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: purchaseHistory } = await db
    .from("credit_transactions")
    .select("amount, created_at")
    .eq("type", "purchase")
    .gte("created_at", sixMonthsAgo.toISOString())
    .order("created_at", { ascending: true });

  const revenueMap: Record<string, number> = {};
  if (purchaseHistory) {
    for (const tx of purchaseHistory) {
      const month = new Date(tx.created_at).toISOString().slice(0, 7); // YYYY-MM
      revenueMap[month] = (revenueMap[month] || 0) + (tx.amount || 0);
    }
  }

  const revenueByMonth = Object.entries(revenueMap).map(([month, credits]) => ({
    month,
    credits,
    estimatedEur: Math.round(credits * EUR_PER_CREDIT * 100) / 100,
  }));

  const totalRevenueEur = revenueByMonth.reduce((sum, m) => sum + m.estimatedEur, 0);

  // AI cost stats — aggregate from project JSONB data
  const { data: costRows } = await db
    .from("projects")
    .select("data->apiCostUsd, data->phase, data->rooms, created_at");

  let totalAiCostUsd = 0;
  let totalAiProjects = 0;
  const costByMonth: Record<string, number> = {};
  const costByPhase: Record<string, { count: number; cost: number }> = {};
  const topCostProjects: { id: string; cost: number; rooms: number; phase: string; date: string }[] = [];

  if (costRows) {
    for (const row of costRows) {
      const cost = Number((row as Record<string, unknown>).apiCostUsd) || 0;
      if (cost > 0) {
        totalAiCostUsd += cost;
        totalAiProjects++;
        const month = new Date(row.created_at).toISOString().slice(0, 7);
        costByMonth[month] = (costByMonth[month] || 0) + cost;
      }
      const phase = String((row as Record<string, unknown>).phase || "unknown");
      if (!costByPhase[phase]) costByPhase[phase] = { count: 0, cost: 0 };
      costByPhase[phase].count++;
      costByPhase[phase].cost += cost;
    }
  }

  // Also pull individual project costs for top spenders
  const { data: topCostRows } = await db
    .from("projects")
    .select("id, data, created_at")
    .not("data->>apiCostUsd", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (topCostRows) {
    for (const row of topCostRows) {
      const data = row.data as Record<string, unknown> | null;
      const cost = Number(data?.apiCostUsd) || 0;
      if (cost > 0) {
        const rooms = Array.isArray(data?.rooms) ? (data.rooms as unknown[]).length : 0;
        topCostProjects.push({
          id: row.id,
          cost,
          rooms,
          phase: String(data?.phase || "unknown"),
          date: row.created_at,
        });
      }
    }
    topCostProjects.sort((a, b) => b.cost - a.cost);
  }

  const aiCostStats = {
    totalUsd: Math.round(totalAiCostUsd * 100) / 100,
    totalProjects: totalAiProjects,
    avgPerProject: totalAiProjects > 0 ? Math.round((totalAiCostUsd / totalAiProjects) * 100) / 100 : 0,
    byMonth: Object.entries(costByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, cost]) => ({ month, costUsd: Math.round(cost * 100) / 100 })),
    topProjects: topCostProjects.slice(0, 10),
    costPerService: {
      "gpt-4o-vision": 0.03,
      "gpt-4o-text": 0.01,
      "flux-kontext-pro": 0.05,
      "kling-v2.1-pro": 0.50,
    },
  };

  // Stuck projects (active phase + created > 30 min ago)
  const activePhases = [
    "cleaning", "cleaned", "analyzing", "generating_options", "generating_videos",
    "rendering", "rendering_montage", "auto_staging", "triaging",
  ];
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data: stuckRows } = await db
    .from("projects")
    .select("id, user_id, data, created_at")
    .in("data->>phase", activePhases)
    .lt("created_at", thirtyMinAgo)
    .order("created_at", { ascending: true });

  const stuckProjects = {
    count: stuckRows?.length || 0,
    projects: (stuckRows || []).map((row) => ({
      id: row.id,
      phase: ((row.data as Record<string, unknown>)?.phase as string) || "unknown",
      userId: row.user_id,
      createdAt: row.created_at,
    })),
  };

  // Active projects (currently in any active phase)
  const { data: activeRows } = await db
    .from("projects")
    .select("id, user_id, data, created_at")
    .in("data->>phase", activePhases)
    .order("created_at", { ascending: false });

  const activeProjects = {
    count: activeRows?.length || 0,
    projects: (activeRows || []).map((row) => {
      const data = row.data as Record<string, unknown> | null;
      const rooms = data?.rooms as unknown[] | undefined;
      return {
        id: row.id,
        phase: (data?.phase as string) || "unknown",
        userId: row.user_id,
        roomCount: Array.isArray(rooms) ? rooms.length : 0,
        createdAt: row.created_at,
      };
    }),
  };

  return NextResponse.json({
    projectsByPhase,
    recentProjects: recentProjects.map((p) => ({
      ...p,
      userEmail: p.user_id ? userEmailMap[p.user_id] || null : null,
    })),
    creditStats,
    subscriptionStats,
    totalUsers: totalUsers || 0,
    revenueByMonth,
    totalRevenueEur,
    stuckProjects,
    activeProjects,
    aiCostStats,
  });
}
