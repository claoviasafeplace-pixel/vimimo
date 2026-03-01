import { NextResponse } from "next/server";
import { requireProjectOwner } from "@/lib/api-auth";
import { generateDescription } from "@/lib/services/openai";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`description:${ip}`, RATE_LIMITS.DESCRIPTION);
    if (rl.limited) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans quelques instants." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const { id } = await params;
    const result = await requireProjectOwner(id);
    if (result.error) return result.error;

    const { project } = result;

    if (project.phase !== "done") {
      return NextResponse.json(
        { error: "Le projet doit être terminé" },
        { status: 400 }
      );
    }

    const description = await generateDescription(project);

    return NextResponse.json(description);
  } catch (error) {
    console.error("Description generation error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération de la description" },
      { status: 500 }
    );
  }
}
