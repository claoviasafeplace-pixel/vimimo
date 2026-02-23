import { inngest } from "../client";
import { getProject, saveProject } from "@/lib/store";
import {
  getPredictionStatus,
  extractOutputUrl,
  generateStagingOption,
  generateVideo,
} from "@/lib/services/replicate";
import { generateStagingPrompts } from "@/lib/services/openai";
import { startStudioRender } from "@/lib/services/remotion";

export const autoStaging = inngest.createFunction(
  { id: "auto-staging", retries: 0 },
  { event: "project/triage.confirmed" },
  async ({ event, step }) => {
    const { projectId } = event.data;

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
                proj.style, proj.styleLabel, room.visionData);
              const predictionId = await generateStagingOption(
                room.cleanedPhotoUrl, result.prompts[0]);
              room.optionPredictionIds = [predictionId];
            } catch (error) {
              console.error(`Auto-staging failed for room ${room.index}:`, error);
              room.options = [{ url: room.cleanedPhotoUrl, predictionId: "fallback" }];
              room.selectedOptionIndex = 0;
            }
          }));
      }
      await saveProject(proj);
    });

    // Step 3: Poll staging predictions
    for (let attempt = 0; attempt < 120; attempt++) {
      const done = await step.run(`check-staging-${attempt}`, async () => {
        const proj = await getProject(projectId);
        if (!proj || proj.phase !== "auto_staging") return true;

        let allDone = true;
        for (const room of proj.rooms) {
          if (room.options.length > 0) continue;
          if (!room.optionPredictionIds?.length) continue;
          try {
            const status = await getPredictionStatus(room.optionPredictionIds[0]);
            if (status.status === "succeeded") {
              const url = extractOutputUrl(status.output);
              if (url) {
                room.options = [{ url, predictionId: room.optionPredictionIds[0] }];
                room.selectedOptionIndex = 0;
              }
            } else if (status.status === "failed" || status.status === "canceled") {
              room.options = [{ url: room.cleanedPhotoUrl, predictionId: "fallback" }];
              room.selectedOptionIndex = 0;
            } else { allDone = false; }
          } catch { allDone = false; }
        }
        await saveProject(proj);
        return allDone;
      });

      if (done) break;
      await step.sleep(`wait-staging-${attempt}`, "5s");
    }

    // Step 4: Launch all videos
    await step.run("launch-videos", async () => {
      const proj = await getProject(projectId);
      if (!proj || proj.phase !== "auto_staging") return;

      const needsVideo = proj.rooms.filter(
        (r) => !r.videoPredictionId && r.options.length > 0);

      if (needsVideo.length > 0) {
        await Promise.allSettled(
          needsVideo.map(async (room) => {
            try {
              const stagedUrl = room.options[room.selectedOptionIndex ?? 0].url;
              const predictionId = await generateVideo(
                room.beforePhotoUrl, stagedUrl, proj.styleLabel, room.roomType);
              room.videoPredictionId = predictionId;
            } catch (error) {
              console.error(`Video generation failed for room ${room.index}:`, error);
              room.videoUrl = "";
            }
          }));
        await saveProject(proj);
      }
    });

    // Step 5: Poll videos
    for (let attempt = 0; attempt < 180; attempt++) {
      const done = await step.run(`check-auto-videos-${attempt}`, async () => {
        const proj = await getProject(projectId);
        if (!proj || proj.phase !== "auto_staging") return true;

        const pending = proj.rooms.filter(
          (r) => r.videoUrl === undefined && r.videoPredictionId);
        if (pending.length === 0) return true;

        await Promise.allSettled(
          pending.map(async (room) => {
            try {
              const status = await getPredictionStatus(room.videoPredictionId!);
              if (status.status === "succeeded") {
                room.videoUrl = extractOutputUrl(status.output) || undefined;
              } else if (status.status === "failed" || status.status === "canceled") {
                room.videoUrl = "";
              }
            } catch { /* retry next */ }
          }));

        const allDone = proj.rooms.every((r) => r.videoUrl !== undefined);
        await saveProject(proj);
        return allDone;
      });

      if (done) break;
      await step.sleep(`wait-auto-videos-${attempt}`, "5s");
    }

    // Step 6: Launch montage
    await step.run("launch-montage", async () => {
      const proj = await getProject(projectId);
      if (!proj || proj.phase !== "auto_staging") return;

      const roomsWithVideo = proj.rooms.filter((r) => r.videoUrl && r.videoUrl !== "");
      if (roomsWithVideo.length >= 2 && proj.montageConfig) {
        try {
          const renderId = await startStudioRender(proj, proj.montageConfig);
          proj.studioMontageRenderId = renderId;
          proj.phase = "rendering_montage";
        } catch (error) {
          console.error("Auto montage render failed:", error);
          proj.phase = "done";
        }
      } else {
        proj.phase = "done";
      }
      await saveProject(proj);
    });

    return { projectId, status: "auto-staging-done" };
  },
);
