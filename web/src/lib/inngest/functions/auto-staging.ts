import { inngest } from "../client";
import { getProject, saveProject, updateProjectStatus, autoRefundProject as autoRefund } from "@/lib/store";
import {
  getPredictionStatus,
  extractOutputUrl,
  generateStagingOption,
  generateVideo,
} from "@/lib/services/replicate";
import { generateStagingPrompts, analyzePhotos, analyzeGlobalProperty } from "@/lib/services/openai";
import { startRender, startStudioRender, startSocialRender, getRenderStatus, downloadRender } from "@/lib/services/remotion";
import {
  pipelinePreCheck,
  CircuitOpenError,
  CostThresholdError,
  type ServiceName,
} from "@/lib/circuit-breaker";
import { persistFromUrl, uploadBuffer } from "@/lib/services/storage";

/** Number of staging variants per room. Default 1 to minimize AI costs. Set STAGING_VARIANTS=5 for full variety. */
const NB_VARIANTS = Math.min(
  Math.max(1, Number(process.env.STAGING_VARIANTS) || 1),
  5,
);

export const autoStaging = inngest.createFunction(
  {
    id: "auto-staging",
    retries: 2,
    onFailure: async ({ event }) => {
      const { projectId } = event.data.event.data;
      try {
        const project = await getProject(projectId);
        if (project && project.phase !== "error") {
          project.phase = "error";
          project.error = "Pipeline échoué après 3 tentatives";
          await autoRefund(project);
          await saveProject(project);
        }
      } catch (e) {
        console.error("[auto-staging] onFailure handler error:", e);
      }
    },
  },
  { event: "project/triage.confirmed" },
  async ({ event, step }) => {
    const { projectId } = event.data;

    // Pre-check: verify services availability
    const preCheck = await step.run("pre-check", async () => {
      const required: ServiceName[] = [
        "openai",
        "gemini",
        "replicate_video",
        "remotion",
      ];
      const { degraded } = await pipelinePreCheck(required);

      // OpenAI or Replicate down → abort + refund
      const critical = degraded.filter(
        (s) => s === "openai" || s === "replicate",
      );
      if (critical.length > 0) {
        const proj = await getProject(projectId);
        if (proj) {
          proj.phase = "error";
          proj.error = `Services indisponibles : ${critical.join(", ")}`;
          await autoRefund(proj);
          await saveProject(proj);
        }
        return { ok: false, skipVideo: false };
      }

      // replicate_video down → skip video generation
      const skipVideo = degraded.includes("replicate_video");
      return { ok: true, skipVideo };
    });

    if (!preCheck.ok) return { projectId, status: "aborted-pre-check" };

    // Step 1: Build rooms
    await step.run("build-rooms", async () => {
      const proj = await getProject(projectId);
      if (!proj || proj.phase !== "auto_staging") return;
      if (proj.rooms.length > 0 || !proj.confirmedPhotoOrder) return;

      const confirmedIncluded = proj.confirmedPhotoOrder
        .filter((c) => c.included)
        .sort((a, b) => a.order - b.order);

      proj.rooms = confirmedIncluded.map((confirmed, i) => {
        const triagePhoto = proj.triageResult?.photos.find(
          (p) => p.photoId === confirmed.photoId);
        const photo = proj.photos.find((p) => p.id === confirmed.photoId);
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
      await saveProject(proj);
    });

    // Step 1b: Analyze global property context (Visual DNA)
    const globalContext = await step.run("analyze-global-context", async () => {
      const proj = await getProject(projectId);
      if (!proj || proj.phase !== "auto_staging") return "";
      if (proj.globalContext) return proj.globalContext; // already computed

      const photoUrls = proj.rooms.map((r, i) => ({
        index: i + 1,
        url: r.beforePhotoUrl,
      }));

      if (photoUrls.length < 2) return ""; // single room → no cross-room coherence needed

      try {
        const ctx = await analyzeGlobalProperty(photoUrls, proj.style, projectId);
        proj.globalContext = ctx;
        await saveProject(proj);
        return ctx;
      } catch (error) {
        console.error("[auto-staging] Global context analysis failed:", error);
        return ""; // non-fatal
      }
    });

    // Step 1c: Analyze rooms (populate visionData via GPT-4o Vision)
    await step.run("analyze-rooms", async () => {
      const proj = await getProject(projectId);
      if (!proj || proj.phase !== "auto_staging") return;
      // Skip if visionData already populated
      const needsAnalysis = proj.rooms.some(
        (r) => !r.visionData || Object.keys(r.visionData).length === 0,
      );
      if (!needsAnalysis) return;

      try {
        const photoUrls = proj.rooms.map((r, i) => ({
          index: i + 1,
          url: r.cleanedPhotoUrl,
        }));
        const analysis = await analyzePhotos(
          photoUrls, proj.style, undefined, projectId,
        );

        // Merge visionData into existing rooms
        for (const analyzed of analysis.rooms) {
          const room = proj.rooms[analyzed.photoIndex - 1];
          if (!room) continue;
          room.visionData = {
            dimensions: analyzed.dimensions,
            existingMaterials: analyzed.existingMaterials,
            lighting: analyzed.lighting,
            cameraAngle: analyzed.cameraAngle,
            notes: analyzed.notes,
          };
        }
        await saveProject(proj);
      } catch (error) {
        console.error("[auto-staging] Room analysis failed:", error);
        // Non-fatal: continue with empty visionData
      }
    });

    // Step 2: Launch staging in batches
    await step.run("launch-staging", async () => {
      const proj = await getProject(projectId);
      if (!proj || proj.phase !== "auto_staging") return;

      const batchSize = 3;
      for (let start = 0; start < proj.rooms.length; start += batchSize) {
        const batch = proj.rooms.slice(start, start + batchSize)
          .filter((r) => !r.optionPredictionIds?.length && r.options.length === 0);

        await Promise.allSettled(
          batch.map(async (room) => {
            try {
              const result = await generateStagingPrompts(
                room.cleanedPhotoUrl, room.roomType, room.roomLabel,
                proj.style, proj.styleLabel, room.visionData, projectId, proj.mode, globalContext);
              // Generate NB_VARIANTS options (slice prompts to limit cost)
              const predictionIds = await Promise.all(
                result.prompts.slice(0, NB_VARIANTS).map((prompt: string) =>
                  generateStagingOption(room.cleanedPhotoUrl, prompt)
                )
              );
              room.optionPredictionIds = predictionIds;
            } catch (error) {
              const errMsg = error instanceof Error ? error.message : String(error);
              console.error(`Auto-staging failed for room ${room.index}:`, errMsg);
              // Store debug info in room for diagnostics
              room.visionData = { ...room.visionData, _stagingError: errMsg };
              if (error instanceof CircuitOpenError || error instanceof CostThresholdError) {
                throw error; // propagate to abort
              }
              room.options = [{ url: room.cleanedPhotoUrl, predictionId: "fallback" }];
              room.selectedOptionIndex = 0;
            }
          }));
      }
      await saveProject(proj);
    });

    // Step 3: Poll staging predictions
    // Quick-resolve for Gemini sync results (all "done:..." IDs skip polling)
    const allPredictionIds = await step.run("collect-prediction-ids", async () => {
      const proj = await getProject(projectId);
      if (!proj) return [];
      return proj.rooms.flatMap((r) => r.optionPredictionIds || []);
    });

    const allSyncDone = allPredictionIds.length > 0 &&
      allPredictionIds.every((id) => id.startsWith("done:"));

    if (allSyncDone) {
      // Gemini returns "done:<url>" synchronously — resolve all immediately without polling
      await step.run("resolve-sync-staging", async () => {
        const proj = await getProject(projectId);
        if (!proj || proj.phase !== "auto_staging") return;

        for (const room of proj.rooms) {
          if (!room.optionPredictionIds?.length) continue;
          if (room.options.length >= room.optionPredictionIds.length) continue;

          const resolvedIds = new Set(room.options.map((o) => o.predictionId));
          for (const predId of room.optionPredictionIds) {
            if (resolvedIds.has(predId)) continue;
            const status = await getPredictionStatus(predId);
            if (status.status === "succeeded") {
              const url = extractOutputUrl(status.output);
              if (url) {
                let persistedUrl = url;
                try {
                  persistedUrl = await persistFromUrl(url, "staging", "image/webp");
                } catch (e) {
                  console.error(`[auto-staging] Failed to persist staging image:`, e);
                }
                room.options.push({ url: persistedUrl, predictionId: predId });
              }
            }
          }

          if (room.options.length > 0 && room.selectedOptionIndex === undefined) {
            room.selectedOptionIndex = 0;
          }
          if (room.options.length === 0) {
            room.options = [{ url: room.cleanedPhotoUrl, predictionId: "fallback" }];
            room.selectedOptionIndex = 0;
          }
        }
        await saveProject(proj);
      });
    } else {
      // Async predictions (Replicate or mixed) — poll with retries
      for (let attempt = 0; attempt < 120; attempt++) {
        const done = await step.run(`check-staging-${attempt}`, async () => {
          const proj = await getProject(projectId);
          if (!proj || proj.phase !== "auto_staging") return true;

          let allDone = true;
          for (const room of proj.rooms) {
            if (!room.optionPredictionIds?.length) continue;
            if (room.options.length >= room.optionPredictionIds.length) continue;

            const resolvedIds = new Set(room.options.map((o) => o.predictionId));
            let pendingCount = 0;
            for (const predId of room.optionPredictionIds) {
              if (resolvedIds.has(predId)) continue;
              try {
                const status = await getPredictionStatus(predId);
                if (status.status === "succeeded") {
                  const url = extractOutputUrl(status.output);
                  if (url) {
                    let persistedUrl = url;
                    try {
                      persistedUrl = await persistFromUrl(url, "staging", "image/webp");
                    } catch (e) {
                      console.error(`[auto-staging] Failed to persist staging image:`, e);
                    }
                    room.options.push({ url: persistedUrl, predictionId: predId });
                  }
                } else if (status.status === "failed" || status.status === "canceled") {
                  // Skip failed predictions
                } else {
                  pendingCount++;
                }
              } catch (error) {
                console.error(`Staging prediction check failed for room ${room.index}:`, error);
                pendingCount++;
              }
            }

            if (pendingCount > 0) allDone = false;

            if (room.options.length > 0 && room.selectedOptionIndex === undefined) {
              room.selectedOptionIndex = 0;
            }
            if (pendingCount === 0 && room.options.length === 0) {
              room.options = [{ url: room.cleanedPhotoUrl, predictionId: "fallback" }];
              room.selectedOptionIndex = 0;
            }
          }
          await saveProject(proj);
          return allDone;
        });

        if (done) break;
        await step.sleep(`wait-staging-${attempt}`, "5s");
      }
    }

    // Order flow: after options generated, go to admin quality check instead of auto-selecting
    const isOrderFlow = await step.run("check-order-flow", async () => {
      const proj = await getProject(projectId);
      if (proj?.orderStatus) {
        await updateProjectStatus(proj.id, "quality_check", "a_valider");
        return true;
      }
      return false;
    });

    if (isOrderFlow) {
      return { projectId, status: "order-awaiting-admin" };
    }

    // Step 4: Launch all videos (re-check replicate_video circuit breaker — may have changed since pre-check)
    await step.run("launch-videos", async () => {
      const proj = await getProject(projectId);
      if (!proj || proj.phase !== "auto_staging") return;

      // Re-check circuit breaker for replicate_video right before launching videos
      // (the pre-check value may be stale if the circuit opened during staging)
      const { degraded: currentDegraded } = await pipelinePreCheck(["replicate_video"]);
      const skipVideo = currentDegraded.includes("replicate_video");

      if (skipVideo) {
        // Mark all rooms as no-video and finish
        for (const room of proj.rooms) {
          room.videoUrl = "";
        }
        await saveProject(proj);
        return;
      }

      const needsVideo = proj.rooms.filter(
        (r) => !r.videoUrl && r.options.length > 0);

      if (needsVideo.length > 0) {
        // Sequentialize in batches of 2 to avoid 429 rate limits
        const videoBatchSize = 2;
        for (let start = 0; start < needsVideo.length; start += videoBatchSize) {
          const batch = needsVideo.slice(start, start + videoBatchSize);
          await Promise.allSettled(
            batch.map(async (room) => {
              try {
                const stagedUrl = room.options[room.selectedOptionIndex ?? 0].url;
                // Clear stale prediction ID before launching new one
                room.videoPredictionId = undefined;
                const predictionId = await generateVideo(
                  room.beforePhotoUrl, stagedUrl, proj.styleLabel, room.roomType,
                  undefined, proj.mode);
                room.videoPredictionId = predictionId;
              } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                console.error(`Video generation failed for room ${room.index}:`, errMsg);
                room.visionData = { ...room.visionData, _videoError: errMsg };
                room.videoUrl = "";
              }
            }));
        }
        await saveProject(proj);
      }
    });

    // Step 5: Poll videos (skip if all rooms already have videoUrl)
    for (let attempt = 0; attempt < 180; attempt++) {
      const done = await step.run(`check-auto-videos-${attempt}`, async () => {
        const proj = await getProject(projectId);
        if (!proj || proj.phase !== "auto_staging") return true;

        const pending = proj.rooms.filter(
          (r) => !r.videoUrl && r.videoPredictionId);
        if (pending.length === 0) return true;

        await Promise.allSettled(
          pending.map(async (room) => {
            try {
              const status = await getPredictionStatus(room.videoPredictionId!);
              if (status.status === "succeeded") {
                const replicateUrl = extractOutputUrl(status.output);
                if (replicateUrl) {
                  // Persist to Supabase (Replicate URLs expire)
                  try {
                    room.videoUrl = await persistFromUrl(replicateUrl, "videos", "video/mp4");
                  } catch (e) {
                    console.error(`[auto-staging] Failed to persist video:`, e);
                    room.videoUrl = replicateUrl; // fallback to ephemeral URL
                  }
                } else {
                  room.videoUrl = undefined;
                }
              } else if (status.status === "failed" || status.status === "canceled") {
                room.videoUrl = "";
              }
            } catch (error) {
              console.error(`Video prediction check failed for room ${room.videoPredictionId}:`, error);
            }
          }));

        const allDone = proj.rooms.every((r) => r.videoUrl !== undefined);
        await saveProject(proj);
        return allDone;
      });

      if (done) break;
      await step.sleep(`wait-auto-videos-${attempt}`, "5s");
    }

    // Step 5b: Mark timed-out video predictions as failed
    await step.run("check-video-timeouts", async () => {
      const proj = await getProject(projectId);
      if (!proj || proj.phase !== "auto_staging") return;

      const timedOut = proj.rooms.filter(
        (r) => r.videoPredictionId && !r.videoUrl,
      );
      if (timedOut.length === 0) return;

      for (const room of timedOut) {
        console.warn(
          `[auto-staging] Video polling timed out for room ${room.index} (prediction ${room.videoPredictionId})`,
        );
        room.videoUrl = ""; // mark as resolved (no video)
        room.videoError = `Video generation timed out after 15 minutes (prediction ${room.videoPredictionId})`;
      }
      await saveProject(proj);
    });

    // Step 6: Launch render (PropertyShowcase / StudioMontage / SocialMontage depending on mode)
    const renderResult = await step.run("launch-render", async () => {
      const proj = await getProject(projectId);
      if (!proj || proj.phase !== "auto_staging") return { type: "skip" };

      const roomsWithVideo = proj.rooms.filter((r) => r.videoUrl && r.videoUrl !== "");

      // social_reel mode: skip Remotion — user edits raw AI-generated videos in CapCut
      if (proj.mode === "social_reel") {
        proj.phase = "done";
        await saveProject(proj);
        return { type: "done" };
      }

      if (roomsWithVideo.length >= 2 && proj.montageConfig) {
        // video_visite mode: StudioMontage with montageConfig
        try {
          const renderId = await startStudioRender(proj, proj.montageConfig);
          proj.studioMontageRenderId = renderId;
          proj.phase = "rendering_montage";
          await saveProject(proj);
          return { type: "montage", renderId };
        } catch (error) {
          console.error("Auto montage render failed:", error);
          proj.phase = "done";
          await saveProject(proj);
          return { type: "done" };
        }
      } else if (roomsWithVideo.length >= 2) {
        // staging_piece mode: PropertyShowcase compilation
        try {
          const renderId = await startRender(proj);
          proj.remotionRenderId = renderId;
          proj.phase = "rendering";
          await saveProject(proj);
          return { type: "render", renderId };
        } catch (error) {
          console.error("Auto PropertyShowcase render failed:", error);
          proj.phase = "done";
          await saveProject(proj);
          return { type: "done" };
        }
      } else {
        // Single room or no videos — mark done (individual videos already available)
        proj.phase = "done";
        await saveProject(proj);
        return { type: "done" };
      }
    });

    // Step 7: Poll render until done
    if (renderResult.type === "montage" || renderResult.type === "render") {
      for (let attempt = 0; attempt < 120; attempt++) {
        const done = await step.run(`check-render-${attempt}`, async () => {
          const proj = await getProject(projectId);
          if (!proj) return true;

          const renderId = renderResult.type === "montage"
            ? proj.studioMontageRenderId
            : proj.remotionRenderId;
          if (!renderId) return true;

          try {
            const status = await getRenderStatus(renderId);

            if (status.status === "done") {
              // Download and upload to Supabase
              try {
                const videoBuffer = await downloadRender(renderId);
                const prefix = renderResult.type === "montage" ? "montages" : "renders";
                const videoUrl = await uploadBuffer(videoBuffer, prefix);
                if (renderResult.type === "montage") {
                  proj.studioMontageUrl = videoUrl;
                } else {
                  proj.finalVideoUrl = videoUrl;
                }
              } catch (uploadError) {
                console.error(`[auto-staging] Upload failed for render ${renderId}:`, uploadError);
                // Fallback: direct Remotion download URL
                const directUrl = `${process.env.REMOTION_SERVER_URL}/renders/${renderId}/download`;
                if (renderResult.type === "montage") {
                  proj.studioMontageUrl = directUrl;
                } else {
                  proj.finalVideoUrl = directUrl;
                }
              }
              proj.phase = "done";
              await saveProject(proj);
              return true;
            } else if (status.status === "error") {
              console.error(`[auto-staging] Render ${renderId} failed: ${status.error}`);
              proj.phase = "error";
              proj.error = `Échec du rendu vidéo: ${status.error || "erreur inconnue"}`;
              await autoRefund(proj);
              await saveProject(proj);
              return true;
            }
          } catch (error) {
            console.error(`[auto-staging] Render status check failed:`, error);
          }
          return false;
        });

        if (done) break;
        await step.sleep(`wait-render-${attempt}`, "5s");
      }

      // If we exhausted all 120 attempts without completing, mark as error + refund
      await step.run("check-render-timeout", async () => {
        const proj = await getProject(projectId);
        if (!proj) return;
        if (proj.phase !== "rendering" && proj.phase !== "rendering_montage") return;

        console.error(`[auto-staging] Render timed out after 120 attempts for project ${projectId}`);
        proj.phase = "error";
        proj.error = "Render timed out after 10 minutes";
        await autoRefund(proj);
        await saveProject(proj);
      });
    }

    return { projectId, status: "auto-staging-done" };
  },
);
