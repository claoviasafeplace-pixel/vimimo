import { inngest } from "../client";
import { getProject, saveProject, autoRefundProject as autoRefund } from "@/lib/store";
import { getPredictionStatus, extractOutputUrl } from "@/lib/services/replicate";
import { startRender } from "@/lib/services/remotion";
import { uploadFromUrl, persistFromUrl } from "@/lib/services/storage";
import { getRenderStatus } from "@/lib/services/remotion";
import { pipelinePreCheck } from "@/lib/circuit-breaker";

export const videosPoll = inngest.createFunction(
  {
    id: "videos-poll",
    retries: 2,
    onFailure: async ({ event }) => {
      const { projectId } = event.data.event.data;
      try {
        const project = await getProject(projectId);
        if (project && project.phase !== "error") {
          project.phase = "error";
          project.error = "Pipeline vidéo échoué après 3 tentatives";
          await autoRefund(project);
          await saveProject(project);
        }
      } catch (e) {
        console.error("[videos-poll] onFailure handler error:", e);
      }
    },
  },
  { event: "project/videos.start" },
  async ({ event, step }) => {
    const { projectId } = event.data;

    // Pre-check: verify replicate_video availability
    const preCheckOk = await step.run("pre-check", async () => {
      const { degraded } = await pipelinePreCheck(["replicate_video"]);
      if (degraded.includes("replicate_video")) {
        const proj = await getProject(projectId);
        if (proj) {
          // Graceful degradation: mark all rooms as no-video and finish
          for (const room of proj.rooms) {
            if (!room.videoUrl) room.videoUrl = "";
          }
          proj.phase = "done";
          await saveProject(proj);
        }
        return false;
      }
      return true;
    });

    if (!preCheckOk) return { projectId, status: "skipped-video-unavailable" };

    // Poll video predictions
    for (let attempt = 0; attempt < 180; attempt++) {
      const done = await step.run(`check-videos-${attempt}`, async () => {
        const proj = await getProject(projectId);
        if (!proj || proj.phase !== "generating_videos") return true;

        let allDone = true;
        for (const room of proj.rooms) {
          if (room.videoUrl) continue;
          if (!room.videoPredictionId) { allDone = false; continue; }
          try {
            const status = await getPredictionStatus(room.videoPredictionId);
            if (status.status === "succeeded") {
              const replicateUrl = extractOutputUrl(status.output);
              if (replicateUrl) {
                // Persist to Supabase (Replicate URLs expire)
                try {
                  room.videoUrl = await persistFromUrl(replicateUrl, "videos", "video/mp4");
                } catch (e) {
                  console.error(`[videos-poll] Failed to persist video:`, e);
                  room.videoUrl = replicateUrl; // fallback to ephemeral URL
                }
              } else {
                room.videoUrl = undefined;
              }
            } else if (status.status === "failed" || status.status === "canceled") {
              room.videoUrl = "";
            } else {
              allDone = false;
            }
          } catch (error) {
            console.error(`Video prediction check failed for room ${room.videoPredictionId}:`, error);
            allDone = false;
          }
        }

        if (allDone) {
          const hasVideos = proj.rooms.some((r) => r.videoUrl);
          if (hasVideos) {
            proj.phase = "rendering";
            try {
              const renderId = await startRender(proj);
              proj.remotionRenderId = renderId;
            } catch (error) {
              console.error("Remotion render launch failed:", error);
              proj.phase = "done";
            }
          } else {
            proj.phase = "error";
            proj.error = "Aucune vidéo n'a pu être générée";
            await autoRefund(proj);
          }
        }
        await saveProject(proj);
        return allDone;
      });

      if (done) break;
      await step.sleep(`wait-videos-${attempt}`, "5s");
    }

    // Poll render
    for (let attempt = 0; attempt < 120; attempt++) {
      const done = await step.run(`check-render-${attempt}`, async () => {
        const proj = await getProject(projectId);
        if (!proj || proj.phase !== "rendering" || !proj.remotionRenderId) return true;

        try {
          const renderStatus = await getRenderStatus(proj.remotionRenderId);
          if (renderStatus.status === "done") {
            try {
              const videoUrl = await uploadFromUrl(
                `${process.env.REMOTION_SERVER_URL}/renders/${proj.remotionRenderId}/download`,
                "renders");
              proj.finalVideoUrl = videoUrl;
            } catch (error) {
              console.error("Upload from Remotion failed, using direct URL:", error);
              proj.finalVideoUrl = `${process.env.REMOTION_SERVER_URL}/renders/${proj.remotionRenderId}/download`;
            }
            proj.phase = "done";
            await saveProject(proj);
            return true;
          } else if (renderStatus.status === "error") {
            console.error(`Remotion render ${proj.remotionRenderId} failed:`, renderStatus.error);
            proj.phase = "error";
            proj.error = `Échec du rendu vidéo: ${renderStatus.error || "erreur inconnue"}`;
            await autoRefund(proj);
            await saveProject(proj);
            return true;
          }
        } catch (error) {
          console.error("Remotion render status check failed:", error);
          // Transient error — retry instead of marking as done
        }
        return false;
      });

      if (done) break;
      await step.sleep(`wait-render-${attempt}`, "5s");
    }

    return { projectId, status: "videos-done" };
  },
);
