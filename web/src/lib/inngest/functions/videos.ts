import { inngest } from "../client";
import { getProject, saveProject, refundCredits } from "@/lib/store";
import { getPredictionStatus, extractOutputUrl } from "@/lib/services/replicate";
import { startRender } from "@/lib/services/remotion";
import { uploadFromUrl } from "@/lib/services/storage";
import { getRenderStatus } from "@/lib/services/remotion";

export const videosPoll = inngest.createFunction(
  { id: "videos-poll", retries: 0 },
  { event: "project/videos.start" },
  async ({ event, step }) => {
    const { projectId } = event.data;

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
              room.videoUrl = extractOutputUrl(status.output) || undefined;
            } else if (status.status === "failed" || status.status === "canceled") {
              room.videoUrl = "";
            } else {
              allDone = false;
            }
          } catch { allDone = false; }
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
            if (proj.userId && proj.creditsUsed && !proj.creditsRefunded) {
              try {
                await refundCredits(proj.userId, proj.creditsUsed, proj.id,
                  `Remboursement automatique — projet ${proj.id} en erreur`);
                proj.creditsRefunded = true;
              } catch (e) { console.error("Auto-refund failed:", e); }
            }
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
            } catch {
              proj.finalVideoUrl = `${process.env.REMOTION_SERVER_URL}/renders/${proj.remotionRenderId}/download`;
            }
            proj.phase = "done";
            await saveProject(proj);
            return true;
          } else if (renderStatus.status === "error") {
            proj.phase = "done";
            await saveProject(proj);
            return true;
          }
        } catch {
          proj.phase = "done";
          await saveProject(proj);
          return true;
        }
        return false;
      });

      if (done) break;
      await step.sleep(`wait-render-${attempt}`, "5s");
    }

    return { projectId, status: "videos-done" };
  },
);
