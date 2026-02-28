import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getProject } from "@/lib/store";
import { adminRegenerateSchema } from "@/lib/validations";
import { generateStagingOption } from "@/lib/services/replicate";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if ("error" in result && result.error) return result.error;

  const { id } = await params;
  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = adminRegenerateSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || "Données invalides";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { roomIndex, customPrompt } = parsed.data;

  const rooms = project.rooms || [];
  const room = rooms.find((r) => r.index === roomIndex);
  if (!room) {
    return NextResponse.json(
      { error: `Pièce ${roomIndex} introuvable` },
      { status: 404 }
    );
  }

  try {
    // Use the cleaned photo URL for regeneration
    const photoUrl = room.cleanedPhotoUrl || room.beforePhotoUrl;
    if (!photoUrl) {
      return NextResponse.json(
        { error: "Aucune photo disponible pour cette pièce" },
        { status: 400 }
      );
    }

    // Launch staging generation with the custom prompt
    const predictionId = await generateStagingOption(photoUrl, customPrompt, {
      projectId: id,
      predictionType: "staging",
      roomIndex,
    });

    return NextResponse.json({
      success: true,
      predictionId,
      message: "Régénération lancée",
    });
  } catch (error) {
    console.error("[Admin Regenerate] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la régénération" },
      { status: 500 }
    );
  }
}
