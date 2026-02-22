import { NextResponse } from "next/server";
import { getProject, saveProject, refundCredits } from "@/lib/store";
import {
  getPredictionStatus,
  extractOutputUrl,
} from "@/lib/services/replicate";
import { analyzePhotos } from "@/lib/services/openai";
import { generateStagingPrompts } from "@/lib/services/openai";
import { generateStagingOption } from "@/lib/services/replicate";
import { getRenderStatus, downloadRender } from "@/lib/services/remotion";
import { uploadFromUrl } from "@/lib/services/storage";
import { requireProjectOwner } from "@/lib/api-auth";

async function autoRefund(project: {
  userId?: string;
  creditsUsed?: number;
  creditsRefunded?: boolean;
  id: string;
}) {
  if (
    project.userId &&
    project.creditsUsed &&
    !project.creditsRefunded
  ) {
    try {
      await refundCredits(
        project.userId,
        project.creditsUsed,
        project.id,
        `Remboursement automatique — projet ${project.id} en erreur`
      );
      project.creditsRefunded = true;
    } catch (e) {
      console.error("Auto-refund failed:", e);
    }
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const ownerResult = await requireProjectOwner(id);
    if (ownerResult.error) return ownerResult.error;

    const project = ownerResult.project;
    let updated = false;

    if (project.phase === "cleaning") {
      // Check all cleaning predictions
      let allDone = true;
      for (const photo of project.photos) {
        if (photo.cleanedUrl) continue;
        if (!photo.cleanPredictionId) {
          photo.cleanedUrl = photo.originalUrl;
          updated = true;
          continue;
        }

        try {
          const status = await getPredictionStatus(photo.cleanPredictionId);
          if (status.status === "succeeded") {
            photo.cleanedUrl = extractOutputUrl(status.output) || photo.originalUrl;
            updated = true;
          } else if (status.status === "failed" || status.status === "canceled") {
            photo.cleanedUrl = photo.originalUrl;
            updated = true;
          } else {
            allDone = false;
          }
        } catch {
          photo.cleanedUrl = photo.originalUrl;
          updated = true;
        }
      }

      if (allDone) {
        project.phase = "analyzing";
        updated = true;

        // Launch GPT-4o analysis
        try {
          const photoUrls = project.photos.map((p, i) => ({
            index: i + 1,
            url: p.cleanedUrl!,
          }));
          const analysis = await analyzePhotos(photoUrls, project.style);

          // Build rooms from analysis
          project.rooms = analysis.rooms.map((room, i) => {
            const photo = project.photos[room.photoIndex - 1] || project.photos[i];
            return {
              index: i,
              roomType: room.roomType,
              roomLabel: room.roomLabel,
              photoId: photo.id,
              cleanedPhotoUrl: photo.cleanedUrl!,
              beforePhotoUrl: photo.originalUrl,
              visionData: {
                dimensions: room.dimensions,
                existingMaterials: room.existingMaterials,
                lighting: room.lighting,
                cameraAngle: room.cameraAngle,
                notes: room.notes,
              },
              options: [],
            };
          });

          project.phase = "generating_options";

          // Launch staging option generation for all rooms
          for (const room of project.rooms) {
            try {
              const result = await generateStagingPrompts(
                room.cleanedPhotoUrl,
                room.roomType,
                room.roomLabel,
                project.style,
                project.styleLabel,
                room.visionData
              );

              const predictionIds = await Promise.all(
                result.prompts.map((prompt) =>
                  generateStagingOption(room.cleanedPhotoUrl, prompt)
                )
              );
              room.optionPredictionIds = predictionIds;
            } catch (error) {
              console.error(`Failed to generate options for room ${room.index}:`, error);
              project.phase = "error";
              project.error = `Échec de la génération pour ${room.roomLabel}`;
              await autoRefund(project);
            }
          }
        } catch (error) {
          console.error("Analysis error:", error);
          project.phase = "error";
          project.error = "Échec de l'analyse IA des photos";
          await autoRefund(project);
        }
      }
    }

    if (project.phase === "generating_options") {
      let allDone = true;
      for (const room of project.rooms) {
        if (!room.optionPredictionIds?.length) continue;
        if (room.options.length >= room.optionPredictionIds.length) continue;

        const resolvedOptions: typeof room.options = room.options.length
          ? [...room.options]
          : [];

        for (let i = resolvedOptions.length; i < room.optionPredictionIds.length; i++) {
          try {
            const status = await getPredictionStatus(room.optionPredictionIds[i]);
            if (status.status === "succeeded") {
              const url = extractOutputUrl(status.output);
              if (url) {
                resolvedOptions.push({ url, predictionId: room.optionPredictionIds[i] });
              }
            } else if (status.status === "failed" || status.status === "canceled") {
              // Skip failed option
            } else {
              allDone = false;
            }
          } catch {
            // Skip errored option
          }
        }

        if (resolvedOptions.length !== room.options.length) {
          room.options = resolvedOptions;
          updated = true;
        }
      }

      if (allDone) {
        // Check we have at least 1 option per room
        const allRoomsHaveOptions = project.rooms.every((r) => r.options.length > 0);
        if (allRoomsHaveOptions) {
          project.phase = "selecting";
          updated = true;
        } else {
          project.phase = "error";
          project.error = "Certaines pièces n'ont aucune option de staging";
          updated = true;
          await autoRefund(project);
        }
      }
    }

    if (project.phase === "generating_videos") {
      let allDone = true;
      for (const room of project.rooms) {
        if (room.videoUrl) continue;
        if (!room.videoPredictionId) {
          allDone = false;
          continue;
        }

        try {
          const status = await getPredictionStatus(room.videoPredictionId);
          if (status.status === "succeeded") {
            room.videoUrl = extractOutputUrl(status.output) || undefined;
            updated = true;
          } else if (status.status === "failed" || status.status === "canceled") {
            room.videoUrl = "";
            updated = true;
          } else {
            allDone = false;
          }
        } catch {
          allDone = false;
        }
      }

      if (allDone) {
        const hasVideos = project.rooms.some((r) => r.videoUrl);
        if (hasVideos) {
          project.phase = "rendering";
          updated = true;

          // Auto-launch Remotion render
          try {
            const { startRender } = await import("@/lib/services/remotion");
            const renderId = await startRender(project);
            project.remotionRenderId = renderId;
          } catch (error) {
            console.error("Remotion render launch failed:", error);
            // If Remotion fails, still mark as done with individual videos
            project.phase = "done";
          }
        } else {
          project.phase = "error";
          project.error = "Aucune vidéo n'a pu être générée";
          updated = true;
          await autoRefund(project);
        }
      }
    }

    if (project.phase === "rendering" && project.remotionRenderId) {
      try {
        const renderStatus = await getRenderStatus(project.remotionRenderId);
        if (renderStatus.status === "done") {
          // Download and upload to Vercel Blob
          try {
            const videoUrl = await uploadFromUrl(
              `${process.env.REMOTION_SERVER_URL}/renders/${project.remotionRenderId}/download`,
              "renders"
            );
            project.finalVideoUrl = videoUrl;
          } catch {
            // Fallback: direct URL to render server
            project.finalVideoUrl = `${process.env.REMOTION_SERVER_URL}/renders/${project.remotionRenderId}/download`;
          }
          project.phase = "done";
          updated = true;
        } else if (renderStatus.status === "error") {
          // Still mark as done — individual videos are available
          project.phase = "done";
          updated = true;
        }
      } catch {
        // Remotion server unreachable, mark as done
        project.phase = "done";
        updated = true;
      }
    }

    if (project.phase === "rendering_montage" && project.studioMontageRenderId) {
      try {
        const renderStatus = await getRenderStatus(project.studioMontageRenderId);
        if (renderStatus.status === "done") {
          try {
            const videoUrl = await uploadFromUrl(
              `${process.env.REMOTION_SERVER_URL}/renders/${project.studioMontageRenderId}/download`,
              "montages",
            );
            project.studioMontageUrl = videoUrl;
          } catch {
            project.studioMontageUrl = `${process.env.REMOTION_SERVER_URL}/renders/${project.studioMontageRenderId}/download`;
          }
          project.phase = "done";
          updated = true;
        } else if (renderStatus.status === "error") {
          project.phase = "done";
          updated = true;
        }
      } catch {
        project.phase = "done";
        updated = true;
      }
    }

    if (updated) {
      await saveProject(project);
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Project GET error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
