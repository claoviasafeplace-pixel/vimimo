import { inngest } from "../client";
import { getProject, saveProject, updateProjectStatus, autoRefundProject as autoRefund } from "@/lib/store";
import { getPredictionStatus, extractOutputUrl } from "@/lib/services/replicate";
import { analyzePhotos, triagePhotos, generateStagingPrompts } from "@/lib/services/openai";
import { generateStagingOption } from "@/lib/services/replicate";
import { persistFromUrl } from "@/lib/services/storage";
import {
  pipelinePreCheck,
  CircuitOpenError,
  CostThresholdError,
} from "@/lib/circuit-breaker";

/** Number of staging variants per room. Default 1 to minimize AI costs. */
const NB_VARIANTS = Math.min(
  Math.max(1, Number(process.env.STAGING_VARIANTS) || 1),
  5,
);

export const cleaningPoll = inngest.createFunction(
  {
    id: "cleaning-poll",
    retries: 2,
    onFailure: async ({ event }) => {
      const { projectId } = event.data.event.data;
      try {
        const project = await getProject(projectId);
        if (project && project.phase !== "error") {
          project.phase = "error";
          project.error = "Pipeline nettoyage échoué après 3 tentatives";
          await autoRefund(project);
          await saveProject(project);
        }
      } catch (e) {
        console.error("[cleaning-poll] onFailure handler error:", e);
      }
    },
  },
  { event: "project/created" },
  async ({ event, step }) => {
    const { projectId } = event.data;

    // Pre-check: verify critical services before starting
    const preCheckOk = await step.run("pre-check", async () => {
      const { degraded } = await pipelinePreCheck(["openai", "gemini"]);
      if (degraded.length > 0) {
        const proj = await getProject(projectId);
        if (proj) {
          proj.phase = "error";
          proj.error = `Services indisponibles : ${degraded.join(", ")}`;
          await autoRefund(proj);
          await saveProject(proj);
        }
        return false;
      }
      return true;
    });

    if (!preCheckOk) return { projectId, status: "aborted-pre-check" };

    // Poll cleaning with step.sleep() between attempts (max 60 = ~5 min)
    for (let attempt = 0; attempt < 60; attempt++) {
      const done = await step.run(`check-cleaning-${attempt}`, async () => {
        const proj = await getProject(projectId);
        if (!proj || proj.phase !== "cleaning") return true;

        let allDone = true;
        for (const photo of proj.photos) {
          if (photo.cleanedUrl) continue;
          if (!photo.cleanPredictionId) {
            photo.cleanedUrl = photo.originalUrl;
            continue;
          }
          try {
            const status = await getPredictionStatus(photo.cleanPredictionId);
            if (status.status === "succeeded") {
              const replicateUrl = extractOutputUrl(status.output);
              if (replicateUrl) {
                // Persist to Supabase (Replicate URLs expire)
                try {
                  photo.cleanedUrl = await persistFromUrl(replicateUrl, "cleaned", "image/jpeg");
                } catch (e) {
                  console.error(`[cleaning-poll] Failed to persist cleaned image:`, e);
                  photo.cleanedUrl = replicateUrl; // fallback to ephemeral URL
                }
              } else {
                photo.cleanedUrl = photo.originalUrl;
              }
            } else if (status.status === "failed" || status.status === "canceled") {
              photo.cleanedUrl = photo.originalUrl;
            } else {
              allDone = false;
            }
          } catch (error) {
            console.error(`Cleaning prediction check failed for photo ${photo.cleanPredictionId}:`, error);
            photo.cleanedUrl = photo.originalUrl;
          }
        }
        await saveProject(proj);
        return allDone;
      });

      if (done) break;
      await step.sleep(`wait-cleaning-${attempt}`, "5s");
    }

    // Force fallback on any remaining
    await step.run("force-fallback", async () => {
      const proj = await getProject(projectId);
      if (!proj) return;
      let changed = false;
      for (const photo of proj.photos) {
        if (!photo.cleanedUrl) {
          photo.cleanedUrl = photo.originalUrl;
          changed = true;
        }
      }
      if (changed) await saveProject(proj);
    });

    // Set "cleaned" checkpoint — admin validates before staging continues
    await step.run("set-cleaned", async () => {
      const proj = await getProject(projectId);
      if (!proj) return;
      proj.phase = "cleaned";
      await saveProject(proj);
    });

    // Wait for admin validation: poll until phase changes from "cleaned"
    for (let wait = 0; wait < 720; wait++) { // 720 × 5s = 1h max
      const ready = await step.run(`wait-validation-${wait}`, async () => {
        const proj = await getProject(projectId);
        return !proj || proj.phase !== "cleaned";
      });
      if (ready) break;
      await step.sleep(`sleep-validation-${wait}`, "5s");
    }

    // Branch: triage (video_visite) or analyze (staging_piece)
    const project = await step.run("read-project", async () => {
      return await getProject(projectId);
    });

    if (!project) return { error: "Project not found" };
    // If still "cleaned" after timeout, stop
    if (project.phase === "cleaned") {
      return { projectId, status: "validation-timeout" };
    }
    // If admin moved to "error", stop
    if (project.phase === "error") {
      return { projectId, status: "admin-rejected" };
    }

    if (project.mode === "video_visite") {
      await step.run("triage-photos", async () => {
        const proj = await getProject(projectId);
        if (!proj) throw new Error(`Project ${projectId} not found`);
        try {
          const photoUrls = proj.photos.map((p, i) => ({
            index: i + 1,
            url: p.cleanedUrl || p.originalUrl,
          }));
          const triageResult = await triagePhotos(photoUrls, proj.style, projectId);
          triageResult.photos = triageResult.photos.map((tp, i) => ({
            ...tp,
            photoId: proj.photos[tp.photoIndex - 1]?.id || proj.photos[i]?.id || `photo-${i}`,
          }));
          proj.triageResult = triageResult;
          proj.phase = "reviewing";
        } catch (error) {
          console.error("Triage error:", error);
          proj.phase = "error";
          if (error instanceof CircuitOpenError) {
            proj.error = `Service ${error.service} indisponible`;
          } else if (error instanceof CostThresholdError) {
            proj.error = `Seuil de coût dépassé ($${error.currentCost.toFixed(2)})`;
          } else {
            proj.error = "Échec du triage IA des photos";
          }
          await autoRefund(proj);
        }
        await saveProject(proj);
      });
    } else {
      // staging_piece: analyze + generate options
      await step.run("analyze-photos", async () => {
        const proj = await getProject(projectId);
        if (!proj) throw new Error(`Project ${projectId} not found`);
        proj.phase = "analyzing";
        await saveProject(proj);

        try {
          const photoUrls = proj.photos.map((p, i) => ({
            index: i + 1,
            url: p.cleanedUrl!,
          }));
          const analysis = await analyzePhotos(photoUrls, proj.style, undefined, projectId);

          proj.rooms = analysis.rooms.map((room, i) => {
            const photo = proj.photos[room.photoIndex - 1] || proj.photos[i];
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

          proj.phase = "generating_options";

          for (const room of proj.rooms) {
            try {
              const result = await generateStagingPrompts(
                room.cleanedPhotoUrl,
                room.roomType,
                room.roomLabel,
                proj.style,
                proj.styleLabel,
                room.visionData,
                projectId,
                proj.mode,
              );
              const predictionIds = await Promise.all(
                result.prompts.slice(0, NB_VARIANTS).map((prompt) =>
                  generateStagingOption(room.cleanedPhotoUrl, prompt),
                ),
              );
              room.optionPredictionIds = predictionIds;
            } catch (error) {
              console.error(`Failed to generate options for room ${room.index}:`, error);
              proj.phase = "error";
              if (error instanceof CircuitOpenError) {
                proj.error = `Service ${error.service} indisponible`;
              } else if (error instanceof CostThresholdError) {
                proj.error = `Seuil de coût dépassé ($${error.currentCost.toFixed(2)})`;
              } else {
                proj.error = `Échec de la génération pour ${room.roomLabel}`;
              }
              await autoRefund(proj);
              break;
            }
          }
          await saveProject(proj);
        } catch (error) {
          console.error("Analysis error:", error);
          proj.phase = "error";
          if (error instanceof CircuitOpenError) {
            proj.error = `Service ${error.service} indisponible`;
          } else if (error instanceof CostThresholdError) {
            proj.error = `Seuil de coût dépassé ($${error.currentCost.toFixed(2)})`;
          } else {
            proj.error = "Échec de l'analyse IA des photos";
          }
          await autoRefund(proj);
          await saveProject(proj);
        }
      });

      // Poll staging options with step.sleep()
      // Quick-resolve for Gemini sync results (all "done:..." IDs skip polling)
      const allOptionIds = await step.run("collect-option-ids", async () => {
        const proj = await getProject(projectId);
        if (!proj) return [];
        return proj.rooms.flatMap((r) => r.optionPredictionIds || []);
      });

      const allOptionsSyncDone = allOptionIds.length > 0 &&
        allOptionIds.every((id) => id.startsWith("done:"));

      if (allOptionsSyncDone) {
        // Gemini returns "done:<url>" synchronously — resolve all immediately without polling
        await step.run("resolve-sync-options", async () => {
          const proj = await getProject(projectId);
          if (!proj || proj.phase !== "generating_options") return;

          for (const room of proj.rooms) {
            if (!room.optionPredictionIds?.length) continue;
            if (room.options.length >= room.optionPredictionIds.length) continue;

            const resolvedOptions = room.options.length ? [...room.options] : [];
            for (let i = resolvedOptions.length; i < room.optionPredictionIds.length; i++) {
              const status = await getPredictionStatus(room.optionPredictionIds[i]);
              if (status.status === "succeeded") {
                const url = extractOutputUrl(status.output);
                if (url) {
                  let persistedUrl = url;
                  try {
                    persistedUrl = await persistFromUrl(url, "staging", "image/webp");
                  } catch (e) {
                    console.error(`[cleaning-poll] Failed to persist staging image:`, e);
                  }
                  resolvedOptions.push({ url: persistedUrl, predictionId: room.optionPredictionIds[i] });
                }
              }
            }
            if (resolvedOptions.length !== room.options.length) {
              room.options = resolvedOptions;
            }
          }

          const allRoomsHaveOptions = proj.rooms.every((r) => r.options.length > 0);
          if (!allRoomsHaveOptions) {
            proj.phase = "error";
            proj.error = "Certaines pièces n'ont aucune option de staging";
            await autoRefund(proj);
          } else if (proj.orderStatus) {
            proj.phase = "selecting";
            await saveProject(proj);
            await updateProjectStatus(proj.id, "quality_check", "a_valider");
            return;
          } else {
            proj.phase = "selecting";
          }
          await saveProject(proj);
        });
      } else {
        // Async predictions (Replicate or mixed) — poll with retries
        for (let attempt = 0; attempt < 120; attempt++) {
          const done = await step.run(`check-options-${attempt}`, async () => {
            const proj = await getProject(projectId);
            if (!proj || proj.phase !== "generating_options") return true;

            let allDone = true;
            for (const room of proj.rooms) {
              if (!room.optionPredictionIds?.length) continue;
              if (room.options.length >= room.optionPredictionIds.length) continue;

              const resolvedOptions = room.options.length ? [...room.options] : [];
              for (let i = resolvedOptions.length; i < room.optionPredictionIds.length; i++) {
                try {
                  const status = await getPredictionStatus(room.optionPredictionIds[i]);
                  if (status.status === "succeeded") {
                    const replicateUrl = extractOutputUrl(status.output);
                    if (replicateUrl) {
                      let persistedUrl = replicateUrl;
                      try {
                        persistedUrl = await persistFromUrl(replicateUrl, "staging", "image/webp");
                      } catch (e) {
                        console.error(`[cleaning-poll] Failed to persist staging image:`, e);
                      }
                      resolvedOptions.push({ url: persistedUrl, predictionId: room.optionPredictionIds[i] });
                    }
                  } else if (status.status !== "failed" && status.status !== "canceled") {
                    allDone = false;
                  }
                } catch (error) {
                  console.error(`Option prediction check failed for room ${room.index}, prediction ${i}:`, error);
                }
              }
              if (resolvedOptions.length !== room.options.length) {
                room.options = resolvedOptions;
              }
            }

            if (allDone) {
              const allRoomsHaveOptions = proj.rooms.every((r) => r.options.length > 0);
              if (!allRoomsHaveOptions) {
                proj.phase = "error";
                proj.error = "Certaines pièces n'ont aucune option de staging";
                await autoRefund(proj);
              } else if (proj.orderStatus) {
                proj.phase = "selecting";
                await saveProject(proj);
                await updateProjectStatus(proj.id, "quality_check", "a_valider");
                return true;
              } else {
                proj.phase = "selecting";
              }
            }
            await saveProject(proj);
            return allDone;
          });

          if (done) break;
          await step.sleep(`wait-options-${attempt}`, "5s");
        }
      }
    }

    return { projectId, status: "cleaning-done" };
  },
);
