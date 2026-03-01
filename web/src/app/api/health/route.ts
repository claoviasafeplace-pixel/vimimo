import { NextResponse } from "next/server";
import { runHealthCheck } from "@/lib/circuit-breaker";
import { auth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

async function isAdmin(): Promise<boolean> {
  try {
    const session = await auth();
    if (!session?.user?.id) return false;
    const db = getSupabase();
    const { data } = await db
      .from("users")
      .select("is_admin")
      .eq("id", session.user.id)
      .single();
    return data?.is_admin === true;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const report = await runHealthCheck();
    const admin = await isAdmin();

    if (!admin) {
      // SEC-2.1: Non-admin users only see healthy/unhealthy status
      return NextResponse.json(
        { healthy: report.healthy },
        { status: report.healthy ? 200 : 503, headers: { "Cache-Control": "no-cache" } },
      );
    }

    return NextResponse.json(report, {
      status: report.healthy ? 200 : 503,
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (e) {
    const admin = await isAdmin();
    const body = admin
      ? {
          healthy: false,
          timestamp: new Date().toISOString(),
          services: {},
          error: e instanceof Error ? e.message : "Health check failed",
        }
      : { healthy: false };

    return NextResponse.json(body, {
      status: 503,
      headers: { "Cache-Control": "no-cache" },
    });
  }
}
