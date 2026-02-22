import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { saveProject, getUserById, deductCredits } from "@/lib/store";
import { cleanPhoto } from "@/lib/services/replicate";
import { requireAuth } from "@/lib/api-auth";
import type { Photo, Project, Style } from "@/lib/types";
import { STYLES } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const userId = authResult.session.user.id;
    const body = await request.json();
    const { photos, style } = body as { photos: Photo[]; style: Style };

    if (!photos?.length) {
      return NextResponse.json({ error: "Aucune photo" }, { status: 400 });
    }

    if (!style || !STYLES.find((s) => s.id === style)) {
      return NextResponse.json({ error: "Style invalide" }, { status: 400 });
    }

    // Credit check
    const creditsNeeded = photos.length;
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
          const predictionId = await cleanPhoto(photo.originalUrl);
          return { ...photo, cleanPredictionId: predictionId };
        } catch (error) {
          console.error(`Failed to clean photo ${photo.id}:`, error);
          return { ...photo, cleanedUrl: photo.originalUrl };
        }
      })
    );

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
    };

    await saveProject(project);

    return NextResponse.json({ projectId: project.id });
  } catch (error) {
    console.error("Project creation error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du projet" },
      { status: 500 }
    );
  }
}
