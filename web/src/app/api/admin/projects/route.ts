import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const result = await requireAdmin();
  if ("error" in result && result.error) return result.error;

  const { searchParams } = request.nextUrl;
  const phase = searchParams.get("phase") || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const offset = (page - 1) * limit;

  const db = getSupabase();

  // Build count query
  let countQuery = db
    .from("projects")
    .select("id", { count: "exact", head: true });

  if (phase) {
    countQuery = countQuery.eq("data->>phase", phase);
  }

  const { count: total } = await countQuery;

  // Build data query
  let dataQuery = db
    .from("projects")
    .select("id, user_id, data, created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (phase) {
    dataQuery = dataQuery.eq("data->>phase", phase);
  }

  const { data: rows } = await dataQuery;

  const projects = (rows || []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    data: row.data,
    created_at: row.created_at,
  }));

  const totalCount = total || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return NextResponse.json({
    projects,
    total: totalCount,
    page,
    totalPages,
  });
}
