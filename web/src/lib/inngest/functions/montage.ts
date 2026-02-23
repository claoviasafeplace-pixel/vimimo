import { inngest } from "../client";
import { getProject, saveProject } from "@/lib/store";
import { getRenderStatus } from "@/lib/services/remotion";
import { uploadFromUrl } from "@/lib/services/storage";

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
              const videoUrl = await uploadFromUrl(
                `${process.env.REMOTION_SERVER_URL}/renders/${proj.studioMontageRenderId}/download`,
                "montages");
              proj.studioMontageUrl = videoUrl;
            } catch {
              proj.studioMontageUrl = `${process.env.REMOTION_SERVER_URL}/renders/${proj.studioMontageRenderId}/download`;
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
      await step.sleep(`wait-montage-${attempt}`, "5s");
    }

    return { projectId, status: "montage-done" };
  },
);
