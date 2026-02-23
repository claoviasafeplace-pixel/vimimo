import { NextResponse } from "next/server";
import { getProject, saveProject, refundCredits } from "@/lib/store";
import {
  getPredictionStatus,
  extractOutputUrl,
  generateStagingOption,
  generateVideo,
} from "@/lib/services/replicate";
import { analyzePhotos, triagePhotos, generateStagingPrompts } from "@/lib/services/openai";
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

    // Inngest mode: GET is read-only (pipeline runs server-side)
    if (process.env.USE_INNGEST === "true") {
      return NextResponse.json({ project });
    }

    // Legacy polling mode below
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
        if (project.mode === "video_visite") {
          // Video visite: triage photos with GPT-4o
          project.phase = "triaging";
          updated = true;

          try {
            const photoUrls = project.photos.map((p, i) => ({
              index: i + 1,
              url: p.cleanedUrl || p.originalUrl,
            }));
            const triageResult = await triagePhotos(photoUrls, project.style);

            // Map triage result photos to include photoId from project.photos
            triageResult.photos = triageResult.photos.map((tp, i) => ({
              ...tp,
              photoId: project.photos[tp.photoIndex - 1]?.id || project.photos[i]?.id || `photo-${i}`,
            }));

            project.triageResult = triageResult;
            project.phase = "reviewing";
          } catch (error) {
            console.error("Triage error:", error);
            project.phase = "error";
            project.error = "Échec du triage IA des photos";
            await autoRefund(project);
          }
        } else {
          // Default staging_piece: analyze and generate options
          project.phase = "analyzing";
          updated = true;

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

    if (project.phase === "auto_staging") {
      // Step 1: Build rooms from confirmed order if not yet built
      if (project.rooms.length === 0 && project.confirmedPhotoOrder) {
        const confirmedIncluded = project.confirmedPhotoOrder
          .filter((c) => c.included)
          .sort((a, b) => a.order - b.order);

        project.rooms = confirmedIncluded.map((confirmed, i) => {
          const triagePhoto = project.triageResult?.photos.find(
            (p) => p.photoId === confirmed.photoId
          );
          const photo = project.photos.find((p) => p.id === confirmed.photoId);
          return {
            index: i,
            roomType: triagePhoto?.roomType || "living_room",
            roomLabel: triagePhoto?.roomLabel || `Pièce ${i + 1}`,
            photoId: confirmed.photoId,
            cleanedPhotoUrl: photo?.cleanedUrl || photo?.originalUrl || "",
            beforePhotoUrl: photo?.originalUrl || "",
            visionData: {},
            options: [],
          };
        });
        updated = true;
        await saveProject(project);
        return NextResponse.json({ project });
      }

      // Step 2: Launch staging — up to 3 rooms IN PARALLEL per poll
      const needsStaging = project.rooms.filter(
        (r) => !r.optionPredictionIds?.length && r.options.length === 0
      );
      if (needsStaging.length > 0) {
        const batch = needsStaging.slice(0, 3);
        const results = await Promise.allSettled(
          batch.map(async (room) => {
            try {
              const result = await generateStagingPrompts(
                room.cleanedPhotoUrl,
                room.roomType,
                room.roomLabel,
                project.style,
                project.styleLabel,
                room.visionData
              );
              const predictionId = await generateStagingOption(
                room.cleanedPhotoUrl,
                result.prompts[0]
              );
              room.optionPredictionIds = [predictionId];
            } catch (error) {
              console.error(`Auto-staging failed for room ${room.index}:`, error);
              room.options = [{ url: room.cleanedPhotoUrl, predictionId: "fallback" }];
              room.selectedOptionIndex = 0;
            }
          })
        );
        updated = true;
        // Don't early return — continue to check predictions and launch videos below
      }

      // Step 3: Check staging predictions
      for (const room of project.rooms) {
        if (room.options.length > 0) continue;
        if (!room.optionPredictionIds?.length) continue;

        try {
          const status = await getPredictionStatus(room.optionPredictionIds[0]);
          if (status.status === "succeeded") {
            const url = extractOutputUrl(status.output);
            if (url) {
              room.options = [{ url, predictionId: room.optionPredictionIds[0] }];
              room.selectedOptionIndex = 0;
              updated = true;
            }
          } else if (status.status === "failed" || status.status === "canceled") {
            room.options = [{ url: room.cleanedPhotoUrl, predictionId: "fallback" }];
            room.selectedOptionIndex = 0;
            updated = true;
          }
        } catch {
          // Will retry next poll
        }
      }

      // Step 4: Launch ALL pending videos in parallel (launching a prediction is fast)
      const needsVideo = project.rooms.filter(
        (r) => !r.videoPredictionId && r.options.length > 0
      );
      if (needsVideo.length > 0) {
        await Promise.allSettled(
          needsVideo.map(async (room) => {
            try {
              const stagedUrl = room.options[room.selectedOptionIndex ?? 0].url;
              const predictionId = await generateVideo(
                room.beforePhotoUrl,
                stagedUrl,
                project.styleLabel,
                room.roomType
              );
              room.videoPredictionId = predictionId;
              updated = true;
            } catch (error) {
              console.error(`Video generation failed for room ${room.index}:`, error);
              room.videoUrl = "";
              updated = true;
            }
          })
        );
      }

      // Step 5: Check ALL video predictions in parallel
      const pendingVideos = project.rooms.filter(
        (r) => r.videoUrl === undefined && r.videoPredictionId
      );
      if (pendingVideos.length > 0) {
        await Promise.allSettled(
          pendingVideos.map(async (room) => {
            try {
              const status = await getPredictionStatus(room.videoPredictionId!);
              if (status.status === "succeeded") {
                room.videoUrl = extractOutputUrl(status.output) || undefined;
                updated = true;
              } else if (status.status === "failed" || status.status === "canceled") {
                room.videoUrl = "";
                updated = true;
              }
            } catch {
              // Will retry next poll
            }
          })
        );
      }

      // Step 6: All done? Launch montage
      const allRoomsProcessed = project.rooms.length > 0 &&
        project.rooms.every((r) => r.videoUrl !== undefined);
      if (allRoomsProcessed) {
        const roomsWithRealVideo = project.rooms.filter(
          (r) => r.videoUrl && r.videoUrl !== ""
        );
        if (roomsWithRealVideo.length >= 2 && project.montageConfig) {
          try {
            const { startStudioRender } = await import("@/lib/services/remotion");
            const renderId = await startStudioRender(project, project.montageConfig);
            project.studioMontageRenderId = renderId;
            project.phase = "rendering_montage";
            updated = true;
          } catch (error) {
            console.error("Auto montage render failed:", error);
            project.phase = "done";
            updated = true;
          }
        } else {
          project.phase = "done";
          updated = true;
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
