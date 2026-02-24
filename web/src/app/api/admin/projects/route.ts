import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const result = await requireAdmin();
  if ("error" in result && result.error) return result.error;

  const { searchParams } = request.nextUrl;
  const phase = searchParams.get("phase") || undefined;
  const search = searchParams.get("search") || undefined;
  const mode = searchParams.get("mode") || undefined;
  const stuck = searchParams.get("stuck") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const offset = (page - 1) * limit;

  const db = getSupabase();

  // If search is provided, find matching user IDs first
  let searchUserIds: string[] | undefined;
  if (search) {
    // Escape SQL wildcards to prevent injection via % and _
    const sanitizedSearch = search.replace(/[%_\\]/g, "\\$&");
    const { data: matchingUsers } = await db
      .from("users")
      .select("id")
      .ilike("email", `%${sanitizedSearch}%`);
    searchUserIds = matchingUsers?.map((u) => u.id) || [];
    // If no users match the search, return empty results immediately
    if (searchUserIds.length === 0) {
      return NextResponse.json({
        projects: [],
        total: 0,
        page,
        totalPages: 0,
      });
    }
  }

  // Active phases for stuck filter
  const activePhases = [
    "cleaning", "analyzing", "generating_options", "generating_videos",
    "rendering", "rendering_montage", "auto_staging", "triaging",
  ];
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  // Build count query
  let countQuery = db
    .from("projects")
    .select("id", { count: "exact", head: true });

  if (phase) {
    countQuery = countQuery.eq("data->>phase", phase);
  }
  if (mode) {
    countQuery = countQuery.eq("data->>mode", mode);
  }
  if (searchUserIds) {
    countQuery = countQuery.in("user_id", searchUserIds);
  }
  if (stuck) {
    countQuery = countQuery.in("data->>phase", activePhases).lt("created_at", thirtyMinAgo);
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
  if (mode) {
    dataQuery = dataQuery.eq("data->>mode", mode);
  }
  if (searchUserIds) {
    dataQuery = dataQuery.in("user_id", searchUserIds);
  }
  if (stuck) {
    dataQuery = dataQuery.in("data->>phase", activePhases).lt("created_at", thirtyMinAgo);
  }

  const { data: rows } = await dataQuery;

  // Fetch user emails for the returned projects
  const projectUserIds = [...new Set((rows || []).map((r) => r.user_id).filter(Boolean))];
  const userEmailMap: Record<string, string> = {};
  if (projectUserIds.length > 0) {
    const { data: users } = await db
      .from("users")
      .select("id, email")
      .in("id", projectUserIds);
    if (users) {
      for (const u of users) {
        userEmailMap[u.id] = u.email;
      }
    }
  }

  const projects = (rows || []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    userEmail: row.user_id ? userEmailMap[row.user_id] || null : null,
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
