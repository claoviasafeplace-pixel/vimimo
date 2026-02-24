import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getProject, updateProject, refundCredits } from "@/lib/store";
import { inngest } from "@/lib/inngest/client";
import { adminActionSchema } from "@/lib/validations";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if ("error" in result && result.error) return result.error;

  const { id } = await params;
  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = adminActionSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || "Action invalide";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }
  const { action } = parsed.data;

  switch (action) {
    case "retry": {
      // Map current phase to the event that should restart it
      const phaseEventMap: Record<string, string> = {
        cleaning: "project/created",
        analyzing: "project/cleaning.done",
        generating_options: "project/analysis.done",
        generating_videos: "project/videos.start",
        rendering: "project/videos.done",
        rendering_montage: "project/montage.start",
        auto_staging: "project/options.done",
        error: "project/created", // restart from beginning
      };

      const eventName = phaseEventMap[project.phase];
      if (!eventName) {
        return NextResponse.json(
          { error: `Cannot retry phase: ${project.phase}` },
          { status: 400 }
        );
      }

      // Clear error
      await updateProject(id, { error: undefined });

      // Re-emit the Inngest event
      if (process.env.USE_INNGEST === "true") {
        await inngest.send({ name: eventName as any, data: { projectId: id } });
      }

      return NextResponse.json({ success: true, action: "retry", event: eventName });
    }

    case "force_done": {
      await updateProject(id, { phase: "done", error: undefined });
      return NextResponse.json({ success: true, action: "force_done" });
    }

    case "refund": {
      if (project.creditsRefunded) {
        return NextResponse.json({ error: "Credits already refunded" }, { status: 400 });
      }
      if (!project.userId) {
        return NextResponse.json({ error: "No user associated" }, { status: 400 });
      }
      const amount = project.creditsUsed || 1;
      await refundCredits(project.userId, amount, id, `Admin refund - project ${id}`);
      await updateProject(id, { creditsRefunded: true });
      return NextResponse.json({ success: true, action: "refund", amount });
    }

  }
}
