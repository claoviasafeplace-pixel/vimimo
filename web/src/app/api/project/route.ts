import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { saveProject, getUserById, deductCredits } from "@/lib/store";
import { cleanPhoto } from "@/lib/services/replicate";
import { requireAuth } from "@/lib/api-auth";
import type { Photo, Project, Style, ProjectMode, PropertyInfo, MontageConfig, MusicChoice } from "@/lib/types";
import { STYLES } from "@/lib/types";
import { inngest } from "@/lib/inngest/client";

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const userId = authResult.session.user.id;
    const body = await request.json();
    const { photos, style, mode, propertyInfo, music } = body as {
      photos: Photo[];
      style: Style;
      mode?: ProjectMode;
      propertyInfo?: PropertyInfo;
      music?: MusicChoice;
    };

    const projectMode: ProjectMode = mode || "staging_piece";

    if (!photos?.length) {
      return NextResponse.json({ error: "Aucune photo" }, { status: 400 });
    }

    const maxPhotos = projectMode === "video_visite" ? 30 : 20;
    if (photos.length > maxPhotos) {
      return NextResponse.json(
        { error: `Maximum ${maxPhotos} photos autorisées` },
        { status: 400 }
      );
    }

    if (!style || !STYLES.find((s) => s.id === style)) {
      return NextResponse.json({ error: "Style invalide" }, { status: 400 });
    }

    if (projectMode === "video_visite" && !propertyInfo?.title) {
      return NextResponse.json(
        { error: "Le titre du bien est requis pour une vidéo visite" },
        { status: 400 }
      );
    }

    // Credit check: video_visite = 1 credit flat, staging_piece = 1 per photo
    const creditsNeeded = projectMode === "video_visite" ? 1 : photos.length;
    const user = await getUserById(userId);
    if (!user || user.credits < creditsNeeded) {
      return NextResponse.json(
        { error: "Crédits insuffisants" },
        { status: 402 }
      );
    }

    const styleLabel = STYLES.find((s) => s.id === style)!.label;
    const projectId = nanoid(12);

    // Deduct credits before launching pipeline
    await deductCredits(
      userId,
      creditsNeeded,
      projectId,
      `Projet ${projectId} — ${creditsNeeded} pièce(s)`
    );

    // Launch cleaning predictions for all photos
    const photosWithPredictions = await Promise.all(
      photos.map(async (photo) => {
        try {
          const predictionId = await cleanPhoto(photo.originalUrl, {
            projectId,
            predictionType: "clean",
          });
          return { ...photo, cleanPredictionId: predictionId };
        } catch (error) {
          console.error(`Failed to clean photo ${photo.id}:`, error);
          return { ...photo, cleanedUrl: photo.originalUrl };
        }
      })
    );

    // Build montageConfig for video_visite
    let montageConfig: MontageConfig | undefined;
    if (projectMode === "video_visite" && propertyInfo) {
      montageConfig = {
        propertyInfo,
        music: music || "elegant",
      };
    }

    const project: Project = {
      id: projectId,
      phase: "cleaning",
      createdAt: Date.now(),
      style,
      styleLabel,
      photos: photosWithPredictions,
      rooms: [],
      userId,
      creditsUsed: creditsNeeded,
      creditsRefunded: false,
      mode: projectMode,
      propertyInfo,
      montageConfig,
    };

    await saveProject(project);

    // Emit Inngest event if enabled
    if (process.env.USE_INNGEST === "true") {
      await inngest.send({
        name: "project/created",
        data: { projectId: project.id },
      });
    }

    return NextResponse.json({ projectId: project.id });
  } catch (error) {
    console.error("Project creation error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du projet" },
      { status: 500 }
    );
  }
}
