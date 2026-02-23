import { NextResponse } from "next/server";
import { saveProject } from "@/lib/store";
import { requireProjectOwner } from "@/lib/api-auth";
import type { ConfirmedPhoto } from "@/lib/types";
import { inngest } from "@/lib/inngest/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const { confirmedPhotos } = body as { confirmedPhotos: ConfirmedPhoto[] };

    if (!confirmedPhotos?.length) {
      return NextResponse.json(
        { error: "Aucune photo confirmée" },
        { status: 400 }
      );
    }

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
