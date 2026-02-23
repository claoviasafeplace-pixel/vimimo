import { inngest } from "../client";
import { getProject, saveProject } from "@/lib/store";
import { getRenderStatus } from "@/lib/services/remotion";
import { uploadFromUrl } from "@/lib/services/storage";

export const montagePoll = inngest.createFunction(
  { id: "montage-poll", retries: 0 },
  { event: "project/montage.start" },
  async ({ event, step }) => {
    const { projectId } = event.data;

    await step.run("poll-montage-render", async () => {
      const maxAttempts = 120; // ~10 min
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const proj = await getProject(projectId);
        if (!proj || proj.phase !== "rendering_montage" || !proj.studioMontageRenderId) return;

        try {
          const renderStatus = await getRenderStatus(proj.studioMontageRenderId);
          if (renderStatus.status === "done") {
            try {
              const videoUrl = await uploadFromUrl(
                `${process.env.REMOTION_SERVER_URL}/renders/${proj.studioMontageRenderId}/download`,
                "montages",
              );
              proj.studioMontageUrl = videoUrl;
            } catch {
              proj.studioMontageUrl = `${process.env.REMOTION_SERVER_URL}/renders/${proj.studioMontageRenderId}/download`;
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

    return { projectId, status: "montage-done" };
  },
);
