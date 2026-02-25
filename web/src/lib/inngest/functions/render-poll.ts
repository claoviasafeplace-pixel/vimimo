import { inngest } from "../client";
import { getProject, saveProject } from "@/lib/store";
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
            console.error(`[render-poll] Remotion render ${proj.remotionRenderId} failed`);
            proj.phase = "done";
            await saveProject(proj);
            return true;
          }
        } catch (error) {
          console.error(`[render-poll] Render status check failed for ${proj.remotionRenderId}:`, error);
          proj.phase = "done";
          await saveProject(proj);
          return true;
        }
        return false;
      });

      if (done) break;
      await step.sleep(`wait-render-${attempt}`, "5s");
    }

    return { projectId, status: "render-done" };
  },
);
