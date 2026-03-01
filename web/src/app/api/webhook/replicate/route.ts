import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { getPredictionMap, getProject, saveProject } from "@/lib/store";
import { extractOutputUrl } from "@/lib/services/replicate";
import { inngest } from "@/lib/inngest/client";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());

    // Verify Svix signature — mandatory in production
    const secret = process.env.REPLICATE_WEBHOOK_SECRET;
    if (!secret) {
      console.error("REPLICATE_WEBHOOK_SECRET not configured");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }

    try {
      const wh = new Webhook(secret);
      wh.verify(body, {
        "svix-id": headers["svix-id"] || headers["webhook-id"] || "",
        "svix-timestamp": headers["svix-timestamp"] || headers["webhook-timestamp"] || "",
        "svix-signature": headers["svix-signature"] || headers["webhook-signature"] || "",
      });
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const predictionId = payload.id as string;
    const status = payload.status as string;
    const output = payload.output;

    if (!predictionId || !status) {
      return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
    }

    // Only process terminal states
    if (status !== "succeeded" && status !== "failed" && status !== "canceled") {
      return NextResponse.json({ received: true });
    }

    // Lookup prediction → project mapping
    const mapping = await getPredictionMap(predictionId);
    if (!mapping) {
      console.warn(`No prediction mapping found for ${predictionId}`);
      return NextResponse.json({ received: true });
    }

    const project = await getProject(mapping.projectId);
    if (!project) {
      console.warn(`Project ${mapping.projectId} not found for prediction ${predictionId}`);
      return NextResponse.json({ received: true });
    }

    const outputUrl = extractOutputUrl(output) || undefined;

    // Update project state based on prediction type — with idempotency guards
    if (mapping.predictionType === "clean") {
      const photo = project.photos.find((p) => p.cleanPredictionId === predictionId);
      if (photo && !photo.cleanedUrl) {
        photo.cleanedUrl = status === "succeeded" && outputUrl ? outputUrl : photo.originalUrl;
        await saveProject(project);
      }
    } else if (mapping.predictionType === "staging") {
      if (mapping.roomIndex !== undefined) {
        const room = project.rooms[mapping.roomIndex];
        if (room) {
          // Idempotency: don't add duplicate options
          if (!room.options.some((o) => o.predictionId === predictionId)) {
            if (status === "succeeded" && outputUrl) {
              room.options.push({ url: outputUrl, predictionId });
            }
          }
          // For auto_staging: auto-select first option
          if (room.options.length > 0 && room.selectedOptionIndex === undefined &&
              project.mode === "video_visite") {
            room.selectedOptionIndex = 0;
          }
          await saveProject(project);
        }
      }
    } else if (mapping.predictionType === "video") {
      if (mapping.roomIndex !== undefined) {
        const room = project.rooms[mapping.roomIndex];
        // Idempotency: only set videoUrl if not already set
        if (room && room.videoPredictionId === predictionId && room.videoUrl === undefined) {
          room.videoUrl = status === "succeeded" && outputUrl ? outputUrl : "";
          await saveProject(project);
        }
      }
    }

    // Emit Inngest event for pipeline continuation
    if (process.env.USE_INNGEST === "true") {
      await inngest.send({
        id: `prediction-${predictionId}`,
        name: "replicate/prediction.completed",
        data: {
          predictionId,
          projectId: mapping.projectId,
          predictionType: mapping.predictionType,
          roomIndex: mapping.roomIndex,
          status,
          outputUrl,
          error: payload.error ? String(payload.error) : undefined,
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Replicate webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
