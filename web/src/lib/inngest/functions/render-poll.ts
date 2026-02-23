import { inngest } from "../client";
import { getProject, saveProject } from "@/lib/store";
import { getRenderStatus } from "@/lib/services/remotion";
import { uploadFromUrl } from "@/lib/services/storage";

export const renderPoll = inngest.createFunction(
  { id: "render-poll", retries: 0 },
  { event: "project/render.done" },
  async ({ event, step }) => {
    const { projectId } = event.data;

    await step.run("poll-render", async () => {
      const maxAttempts = 120;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const proj = await getProject(projectId);
        if (!proj || proj.phase !== "rendering" || !proj.remotionRenderId) return;

        try {
          const renderStatus = await getRenderStatus(proj.remotionRenderId);
          if (renderStatus.status === "done") {
            try {
              const videoUrl = await uploadFromUrl(
                `${process.env.REMOTION_SERVER_URL}/renders/${proj.remotionRenderId}/download`,
                "renders",
              );
              proj.finalVideoUrl = videoUrl;
            } catch {
              proj.finalVideoUrl = `${process.env.REMOTION_SERVER_URL}/renders/${proj.remotionRenderId}/download`;
            }
            proj.phase = "done";
            await saveProject(proj);
            return;
          } else if (renderStatus.status === "error") {
            proj.phase = "done";
            await saveProject(proj);
            return;
          }
        } catch {
          proj.phase = "done";
          await saveProject(proj);
          return;
        }

        await new Promise((r) => setTimeout(r, 5000));
      }
    });

    return { projectId, status: "render-done" };
  },
);
