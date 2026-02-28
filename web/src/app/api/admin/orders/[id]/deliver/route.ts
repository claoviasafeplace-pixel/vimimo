import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getProject, updateProjectStatus } from "@/lib/store";
import { adminDeliverSchema } from "@/lib/validations";
import { generateVideo } from "@/lib/services/replicate";
import { sendDeliveryNotification } from "@/lib/services/email";

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
  const parsed = adminDeliverSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || "Données invalides";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { selectedOptions, adminNotes } = parsed.data;

  try {
    // Convert string keys to number keys for adminSelectedOptions
    const adminSelectedOptions: Record<number, number> = {};
    for (const [key, value] of Object.entries(selectedOptions)) {
      adminSelectedOptions[Number(key)] = value;
    }

    // Launch video generation for each selected option
    const rooms = project.rooms || [];
    const videoPromises: Promise<string>[] = [];

    for (const room of rooms) {
      const selectedIdx = adminSelectedOptions[room.index] ?? 0;
      const selectedOption = room.options?.[selectedIdx];

      if (selectedOption?.url && room.beforePhotoUrl) {
        const videoPromise = generateVideo(
          room.beforePhotoUrl,
          selectedOption.url,
          project.style,
          room.roomType,
          {
            projectId: id,
            predictionType: "video",
            roomIndex: room.index,
          },
          project.mode,
        );
        videoPromises.push(videoPromise);
      }
    }

    // Start all video generations (non-blocking — polling will track them)
    if (videoPromises.length > 0) {
      await Promise.allSettled(videoPromises);
    }

    // Update project status to delivered
    await updateProjectStatus(id, "delivered", "livre", {
      adminSelectedOptions,
      deliveredAt: Date.now(),
      adminNotes: adminNotes || project.adminNotes,
    });

    // Send delivery notification email to client
    const clientEmail = project.clientEmail;
    if (clientEmail) {
      try {
        await sendDeliveryNotification(clientEmail, id);
      } catch (emailError) {
        console.error("[Admin Deliver] Email notification failed:", emailError);
        // Don't fail the delivery if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Commande livrée",
      videosLaunched: videoPromises.length,
    });
  } catch (error) {
    console.error("[Admin Deliver] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la livraison" },
      { status: 500 }
    );
  }
}
