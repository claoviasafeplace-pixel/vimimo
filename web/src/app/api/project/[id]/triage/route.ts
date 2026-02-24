import { NextResponse } from "next/server";
import { saveProject } from "@/lib/store";
import { requireProjectOwner } from "@/lib/api-auth";
import { inngest } from "@/lib/inngest/client";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { triageConfirmSchema } from "@/lib/validations";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`triage:${ip}`, RATE_LIMITS.AI_PIPELINE);
    if (rl.limited) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans quelques instants." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const { id } = await params;

    const ownerResult = await requireProjectOwner(id);
    if (ownerResult.error) return ownerResult.error;

    const project = ownerResult.project;

    if (project.phase !== "reviewing") {
      return NextResponse.json(
        { error: "Le projet n'est pas en phase de révision" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = triageConfirmSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Données invalides";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { confirmedPhotos } = parsed.data;

    const includedCount = confirmedPhotos.filter((p) => p.included).length;
    if (includedCount < 2) {
      return NextResponse.json(
        { error: "Il faut au moins 2 photos incluses" },
        { status: 400 }
      );
    }

    project.confirmedPhotoOrder = confirmedPhotos;
    project.phase = "auto_staging";
    await saveProject(project);

    if (process.env.USE_INNGEST === "true") {
      await inngest.send({
        name: "project/triage.confirmed",
        data: { projectId: project.id },
      });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Triage confirmation error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la confirmation du triage" },
      { status: 500 }
    );
  }
}
