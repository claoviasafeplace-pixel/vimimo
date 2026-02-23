import { inngest } from "../client";
import { getProject, saveProject, refundCredits } from "@/lib/store";
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

    // Step 1: Build rooms from confirmed order
    await step.run("build-rooms", async () => {
      const proj = await getProject(projectId);
      if (!proj || proj.phase !== "auto_staging") return;

      if (proj.rooms.length === 0 && proj.confirmedPhotoOrder) {
        const confirmedIncluded = proj.confirmedPhotoOrder
          .filter((c) => c.included)
          .sort((a, b) => a.order - b.order);

        proj.rooms = confirmedIncluded.map((confirmed, i) => {
          const triagePhoto = proj.triageResult?.photos.find(
            (p) => p.photoId === confirmed.photoId,
          );
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
      }
    });

    // Step 2: Staging in batches of 3
    await step.run("staging-batches", async () => {
      const proj = await getProject(projectId);
      if (!proj || proj.phase !== "auto_staging") return;

      // Launch staging for all rooms in batches
      const batchSize = 3;
      for (let batchStart = 0; batchStart < proj.rooms.length; batchStart += batchSize) {
        const batch = proj.rooms.slice(batchStart, batchStart + batchSize);
        const needsStaging = batch.filter(
          (r) => !r.optionPredictionIds?.length && r.options.length === 0,
        );

        if (needsStaging.length === 0) continue;

        await Promise.allSettled(
          needsStaging.map(async (room) => {
            try {
              const result = await generateStagingPrompts(
                room.cleanedPhotoUrl,
                room.roomType,
                room.roomLabel,
                proj.style,
                proj.styleLabel,
                room.visionData,
              );
              const predictionId = await generateStagingOption(
                room.cleanedPhotoUrl,
                result.prompts[0],
              );
              room.optionPredictionIds = [predictionId];
            } catch (error) {
              console.error(`Auto-staging failed for room ${room.index}:`, error);
              room.options = [{ url: room.cleanedPhotoUrl, predictionId: "fallback" }];
              room.selectedOptionIndex = 0;
            }
          }),
        );
        await saveProject(proj);
      }
    });

    // Step 3: Poll staging predictions
    await step.run("poll-staging", async () => {
      const maxAttempts = 120;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const proj = await getProject(projectId);
        if (!proj || proj.phase !== "auto_staging") return;

        let allStagingDone = true;
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
            } else {
              allStagingDone = false;
            }
          } catch {
            // Will retry
            allStagingDone = false;
          }
        }

        await saveProject(proj);
        if (allStagingDone) return;
        await new Promise((r) => setTimeout(r, 5000));
      }
    });

    // Step 4: Launch all videos in parallel
    await step.run("launch-videos", async () => {
      const proj = await getProject(projectId);
      if (!proj || proj.phase !== "auto_staging") return;

      const needsVideo = proj.rooms.filter(
        (r) => !r.videoPredictionId && r.options.length > 0,
      );

      if (needsVideo.length > 0) {
        await Promise.allSettled(
          needsVideo.map(async (room) => {
            try {
              const stagedUrl = room.options[room.selectedOptionIndex ?? 0].url;
              const predictionId = await generateVideo(
                room.beforePhotoUrl,
                stagedUrl,
                proj.styleLabel,
                room.roomType,
              );
              room.videoPredictionId = predictionId;
            } catch (error) {
              console.error(`Video generation failed for room ${room.index}:`, error);
              room.videoUrl = "";
            }
          }),
        );
        await saveProject(proj);
      }
    });

    // Step 5: Poll video predictions
    await step.run("poll-videos", async () => {
      const maxAttempts = 180;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const proj = await getProject(projectId);
        if (!proj || proj.phase !== "auto_staging") return;

        const pendingVideos = proj.rooms.filter(
          (r) => r.videoUrl === undefined && r.videoPredictionId,
        );
        if (pendingVideos.length === 0) return;

        await Promise.allSettled(
          pendingVideos.map(async (room) => {
            try {
              const status = await getPredictionStatus(room.videoPredictionId!);
              if (status.status === "succeeded") {
                room.videoUrl = extractOutputUrl(status.output) || undefined;
              } else if (status.status === "failed" || status.status === "canceled") {
                room.videoUrl = "";
              }
            } catch {
              // Will retry
            }
          }),
        );

        const allDone = proj.rooms.every((r) => r.videoUrl !== undefined);
        await saveProject(proj);
        if (allDone) return;
        await new Promise((r) => setTimeout(r, 5000));
      }
    });

    // Step 6: Launch montage
    await step.run("launch-montage", async () => {
      const proj = await getProject(projectId);
      if (!proj || proj.phase !== "auto_staging") return;

      const roomsWithRealVideo = proj.rooms.filter(
        (r) => r.videoUrl && r.videoUrl !== "",
      );

      if (roomsWithRealVideo.length >= 2 && proj.montageConfig) {
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
