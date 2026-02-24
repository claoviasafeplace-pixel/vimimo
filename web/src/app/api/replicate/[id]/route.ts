import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getPredictionStatus } from "@/lib/services/replicate";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(_request);
    const rl = checkRateLimit(`replicate:${ip}`, RATE_LIMITS.REPLICATE_POLL);
    if (rl.limited) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans quelques instants." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const { id } = await params;
    const status = await getPredictionStatus(id);
    return NextResponse.json(status);
  } catch (error) {
    console.error("Replicate status error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification" },
      { status: 500 }
    );
  }
}
