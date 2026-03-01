import { inngest } from "../client";
import { getProject, saveProject, refundCredits } from "@/lib/store";
import { getRenderStatus, downloadRender } from "@/lib/services/remotion";
import { uploadBuffer } from "@/lib/services/storage";

export const renderPoll = inngest.createFunction(
  { id: "render-poll", retries: 0 },
  { event: "project/render.done" },
  async ({ event, step }) => {
    const { projectId } = event.data;

    for (let attempt = 0; attempt < 120; attempt++) {
      const done = await step.run(`check-render-${attempt}`, async () => {
        const proj = await getProject(projectId);
        if (!proj || proj.phase !== "rendering" || !proj.remotionRenderId) return true;

        try {
          const renderStatus = await getRenderStatus(proj.remotionRenderId);
          if (renderStatus.status === "done") {
            try {
              const videoBuffer = await downloadRender(proj.remotionRenderId);
              const videoUrl = await uploadBuffer(videoBuffer, "renders");
              proj.finalVideoUrl = videoUrl;
            } catch (error) {
              console.error(`[render-poll] Download/upload failed for ${proj.remotionRenderId}:`, error);
              proj.finalVideoUrl = `${process.env.REMOTION_SERVER_URL}/renders/${proj.remotionRenderId}/download`;
            }
            proj.phase = "done";
            await saveProject(proj);
            return true;
          } else if (renderStatus.status === "error") {
            console.error(`[render-poll] Remotion render ${proj.remotionRenderId} failed:`, renderStatus.error);
            proj.phase = "error";
            proj.error = `Échec du rendu vidéo: ${renderStatus.error || "erreur inconnue"}`;
            if (proj.userId && proj.creditsUsed && !proj.creditsRefunded) {
              try {
                await refundCredits(proj.userId, proj.creditsUsed, proj.id, `Remboursement auto — rendu échoué`);
                proj.creditsRefunded = true;
              } catch (e) { console.error("[render-poll] Auto-refund failed:", e); }
            }
            await saveProject(proj);
            return true;
          }
        } catch (error) {
          console.error(`[render-poll] Render status check failed for ${proj.remotionRenderId}:`, error);
          // Transient error — retry instead of marking as done
        }
        return false;
      });

      if (done) break;
      await step.sleep(`wait-render-${attempt}`, "5s");
    }

    // If we exhausted all 120 attempts without completing, mark as error + refund
    await step.run("check-render-timeout", async () => {
      const proj = await getProject(projectId);
      if (!proj || proj.phase !== "rendering") return;

      console.error(`[render-poll] Render timed out after 120 attempts for project ${projectId}`);
      proj.phase = "error";
      proj.error = "Render timed out after 10 minutes";
      if (proj.userId && proj.creditsUsed && !proj.creditsRefunded) {
        try {
          await refundCredits(proj.userId, proj.creditsUsed, proj.id, "Remboursement auto — render timeout");
          proj.creditsRefunded = true;
        } catch (e) {
          console.error("[render-poll] Auto-refund failed:", e);
        }
      }
      await saveProject(proj);
    });

    return { projectId, status: "render-done" };
  },
);
