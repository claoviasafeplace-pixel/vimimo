import { NextResponse } from "next/server";
import { getProject, saveProject } from "@/lib/store";
import { startStudioRender } from "@/lib/services/remotion";
import { requireProjectOwner } from "@/lib/api-auth";
import type { MontageConfig } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const ownerResult = await requireProjectOwner(id);
    if (ownerResult.error) return ownerResult.error;

    const project = ownerResult.project;

    // Must be in "done" phase
    if (project.phase !== "done") {
      return NextResponse.json(
        { error: "Le projet doit être terminé pour créer un montage" },
        { status: 400 },
      );
    }

    // Must have 2+ rooms with videos
    const roomsWithVideo = project.rooms.filter((r) => r.videoUrl);
    if (roomsWithVideo.length < 2) {
      return NextResponse.json(
        { error: "Il faut au moins 2 pièces avec vidéo pour un montage" },
        { status: 400 },
      );
    }

    // Already has a montage rendering
    if (project.studioMontageRenderId && !project.studioMontageUrl) {
      return NextResponse.json(
        { error: "Un montage est déjà en cours de rendu" },
        { status: 409 },
      );
    }

    const body: MontageConfig = await request.json();

    if (!body.propertyInfo?.title) {
      return NextResponse.json(
        { error: "Le titre du bien est requis" },
        { status: 400 },
      );
    }

    // Launch Remotion StudioMontage render
    const renderId = await startStudioRender(project, body);

    project.phase = "rendering_montage";
    project.studioMontageRenderId = renderId;
    project.montageConfig = body;

    await saveProject(project);

    return NextResponse.json({ project, renderId });
  } catch (error) {
    console.error("Montage POST error:", error);
    return NextResponse.json(
      { error: "Erreur lors du lancement du montage" },
      { status: 500 },
    );
  }
}
