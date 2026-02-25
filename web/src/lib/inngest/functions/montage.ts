import { inngest } from "../client";
import { getProject, saveProject } from "@/lib/store";
import { getRenderStatus, downloadRender } from "@/lib/services/remotion";
import { uploadBuffer } from "@/lib/services/storage";

export const montagePoll = inngest.createFunction(
  { id: "montage-poll", retries: 0 },
  { event: "project/montage.start" },
  async ({ event, step }) => {
    const { projectId } = event.data;

    for (let attempt = 0; attempt < 120; attempt++) {
      const done = await step.run(`check-montage-${attempt}`, async () => {
        const proj = await getProject(projectId);
        if (!proj || proj.phase !== "rendering_montage" || !proj.studioMontageRenderId) return true;

        try {
          const renderStatus = await getRenderStatus(proj.studioMontageRenderId);
          if (renderStatus.status === "done") {
            try {
              const videoBuffer = await downloadRender(proj.studioMontageRenderId);
              const videoUrl = await uploadBuffer(videoBuffer, "montages");
              proj.studioMontageUrl = videoUrl;
            } catch (error) {
              console.error(`[montage-poll] Download/upload failed for ${proj.studioMontageRenderId}:`, error);
              proj.studioMontageUrl = `${process.env.REMOTION_SERVER_URL}/renders/${proj.studioMontageRenderId}/download`;
            }
            proj.phase = "done";
            await saveProject(proj);
            return true;
          } else if (renderStatus.status === "error") {
            console.error(`[montage-poll] Remotion montage render ${proj.studioMontageRenderId} failed`);
            proj.phase = "done";
            await saveProject(proj);
            return true;
          }
        } catch (error) {
          console.error(`[montage-poll] Render status check failed for ${proj.studioMontageRenderId}:`, error);
          proj.phase = "done";
          await saveProject(proj);
          return true;
        }
        return false;
      });

      if (done) break;
      await step.sleep(`wait-montage-${attempt}`, "5s");
    }

    return { projectId, status: "montage-done" };
  },
);
