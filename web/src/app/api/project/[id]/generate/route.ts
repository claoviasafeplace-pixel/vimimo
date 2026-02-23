import { NextResponse } from "next/server";
import { saveProject } from "@/lib/store";
import { generateVideo } from "@/lib/services/replicate";
import { requireProjectOwner } from "@/lib/api-auth";
import { inngest } from "@/lib/inngest/client";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const ownerResult = await requireProjectOwner(id);
    if (ownerResult.error) return ownerResult.error;

    const project = ownerResult.project;

    // Verify all rooms have selections
    const allSelected = project.rooms.every(
      (r) => r.selectedOptionIndex !== undefined
    );
    if (!allSelected) {
      return NextResponse.json(
        { error: "Toutes les pièces doivent avoir une sélection" },
        { status: 400 }
      );
    }

    project.phase = "generating_videos";

    // Launch Kling video generation for all rooms in parallel
    await Promise.all(
      project.rooms.map(async (room) => {
        try {
          const selectedOption = room.options[room.selectedOptionIndex!];
          const predictionId = await generateVideo(
            room.cleanedPhotoUrl,
            selectedOption.url,
            project.style,
            room.roomType,
            { projectId: project.id, predictionType: "video", roomIndex: room.index },
          );
          room.videoPredictionId = predictionId;
        } catch (error) {
          console.error(`Failed to launch video for room ${room.index}:`, error);
        }
      })
    );

    await saveProject(project);

    if (process.env.USE_INNGEST === "true") {
      await inngest.send({
        name: "project/videos.start",
        data: { projectId: project.id },
      });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: "Erreur lors du lancement des vidéos" },
      { status: 500 }
    );
  }
}
