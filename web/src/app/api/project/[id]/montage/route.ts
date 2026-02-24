import { NextResponse } from "next/server";
import { getProject, saveProject } from "@/lib/store";
import { startStudioRender } from "@/lib/services/remotion";
import { requireProjectOwner } from "@/lib/api-auth";
import { inngest } from "@/lib/inngest/client";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { montageSchema } from "@/lib/validations";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`montage:${ip}`, RATE_LIMITS.AI_PIPELINE);
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

    const body = await request.json();
    const parsed = montageSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Données invalides";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { selectedRoomIndices, ...montageConfig } = parsed.data;

    // If specific rooms are selected, reorder project.rooms before rendering
    if (selectedRoomIndices?.length) {
      const reorderedRooms = selectedRoomIndices
        .map((idx) => project.rooms.find((r) => r.index === idx))
        .filter(Boolean);

      if (reorderedRooms.length < 2) {
        return NextResponse.json(
          { error: "Il faut au moins 2 vidéos sélectionnées" },
          { status: 400 },
        );
      }

      // Temporarily replace rooms for rendering with selected order
      const originalRooms = project.rooms;
      project.rooms = reorderedRooms as typeof project.rooms;
      const renderId = await startStudioRender(project, montageConfig);
      project.rooms = originalRooms;

      project.phase = "rendering_montage";
      project.studioMontageRenderId = renderId;
      project.montageConfig = montageConfig;
      await saveProject(project);

      if (process.env.USE_INNGEST === "true") {
        await inngest.send({
          name: "project/montage.start",
          data: { projectId: project.id },
        });
      }

      return NextResponse.json({ project, renderId });
    }

    // Launch Remotion StudioMontage render with all rooms
    const renderId = await startStudioRender(project, montageConfig);

    project.phase = "rendering_montage";
    project.studioMontageRenderId = renderId;
    project.montageConfig = body;

    await saveProject(project);

    if (process.env.USE_INNGEST === "true") {
      await inngest.send({
        name: "project/montage.start",
        data: { projectId: project.id },
      });
    }

    return NextResponse.json({ project, renderId });
  } catch (error) {
    console.error("Montage POST error:", error);
    return NextResponse.json(
      { error: "Erreur lors du lancement du montage" },
      { status: 500 },
    );
  }
}
