import { NextResponse } from "next/server";
import { runHealthCheck } from "@/lib/circuit-breaker";

export async function GET() {
  try {
    const report = await runHealthCheck();

    return NextResponse.json(report, {
      status: report.healthy ? 200 : 503,
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (e) {
    return NextResponse.json(
      {
        healthy: false,
        timestamp: new Date().toISOString(),
        services: {},
        error: e instanceof Error ? e.message : "Health check failed",
      },
      { status: 503, headers: { "Cache-Control": "no-cache" } },
    );
  }
}
