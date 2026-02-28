import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getProject, saveProject } from "@/lib/store";
import { cleanPhoto, generateStagingOption, generateVideo, getPredictionStatus, extractOutputUrl } from "@/lib/services/replicate";
import { generateStagingPrompts, analyzePhotos } from "@/lib/services/openai";
import type { Room } from "@/lib/types";

// GET — Full project data for studio
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await params;
  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  return NextResponse.json({ project });
}

// POST — Studio actions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await params;
  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  const body = await request.json();
  const { action } = body;

  switch (action) {
    // ─── Clean all photos (remove furniture) ───
    case "clean_photos": {
      const predictions: string[] = [];
      for (const photo of project.photos) {
        if (photo.cleanedUrl) continue; // Already cleaned
        if (photo.cleanPredictionId) continue; // Already in progress
        const predId = await cleanPhoto(photo.originalUrl);
        photo.cleanPredictionId = predId;
        predictions.push(predId);
      }
      project.phase = "cleaning";
      await saveProject(project);
      return NextResponse.json({ success: true, predictions });
    }

    // ─── Poll cleaning status ───
    case "check_cleaning": {
      let allDone = true;
      for (const photo of project.photos) {
        if (photo.cleanedUrl) continue;
        if (!photo.cleanPredictionId) continue;
        const status = await getPredictionStatus(photo.cleanPredictionId);
        if (status.status === "succeeded") {
          const url = extractOutputUrl(status.output);
          if (url) photo.cleanedUrl = url;
        } else if (status.status === "failed" || status.status === "canceled") {
          photo.cleanedUrl = photo.originalUrl; // fallback
        } else {
          allDone = false;
        }
      }
      await saveProject(project);
      const cleaned = project.photos.filter((p) => p.cleanedUrl).length;
      return NextResponse.json({
        done: allDone,
        cleaned,
        total: project.photos.length,
        photos: project.photos,
      });
    }

    // ─── Analyze photos with GPT-4o Vision ───
    case "analyze_rooms": {
      const photoUrls = project.photos.map((p, i) => ({
        index: i + 1,
        url: p.cleanedUrl || p.originalUrl,
      }));
      const analysis = await analyzePhotos(photoUrls, project.style, undefined, id);

      project.rooms = analysis.rooms.map((room, i) => {
        const photo = project.photos[room.photoIndex - 1] || project.photos[i];
        return {
          index: i,
          roomType: room.roomType,
          roomLabel: room.roomLabel,
          photoId: photo.id,
          cleanedPhotoUrl: photo.cleanedUrl || photo.originalUrl,
          beforePhotoUrl: photo.originalUrl,
          visionData: {
            dimensions: room.dimensions,
            existingMaterials: room.existingMaterials,
            lighting: room.lighting,
            cameraAngle: room.cameraAngle,
            notes: room.notes,
          },
          options: [],
        };
      });
      project.phase = "cleaned";
      await saveProject(project);
      return NextResponse.json({ success: true, rooms: project.rooms });
    }

    // ─── Generate staging for a room ───
    case "generate_staging": {
      const { roomIndex, customPrompt } = body;
      const room = project.rooms[roomIndex];
      if (!room) {
        return NextResponse.json({ error: "Pièce introuvable" }, { status: 400 });
      }

      let prompts: string[];
      if (customPrompt) {
        prompts = [customPrompt];
      } else {
        const result = await generateStagingPrompts(
          room.cleanedPhotoUrl,
          room.roomType,
          room.roomLabel,
          project.style,
          project.styleLabel,
          room.visionData,
          id,
          project.mode,
          project.globalContext,
        );
        prompts = result.prompts.slice(0, Number(process.env.STAGING_VARIANTS) || 1);
      }

      const predictionIds = await Promise.all(
        prompts.map((prompt) => generateStagingOption(room.cleanedPhotoUrl, prompt)),
      );
      room.optionPredictionIds = predictionIds;
      room.options = [];
      project.phase = "generating_options";
      await saveProject(project);
      return NextResponse.json({ success: true, predictionIds });
    }

    // ─── Poll staging predictions for a room ───
    case "check_staging": {
      const { roomIndex } = body;
      const room = project.rooms[roomIndex];
      if (!room) {
        return NextResponse.json({ error: "Pièce introuvable" }, { status: 400 });
      }

      let allDone = true;
      const ids = room.optionPredictionIds || [];
      for (const predId of ids) {
        if (room.options.some((o) => o.predictionId === predId)) continue;
        const status = await getPredictionStatus(predId);
        if (status.status === "succeeded") {
          const url = extractOutputUrl(status.output);
          if (url) room.options.push({ url, predictionId: predId });
        } else if (status.status === "failed" || status.status === "canceled") {
          // skip failed
        } else {
          allDone = false;
        }
      }
      await saveProject(project);
      return NextResponse.json({
        done: allDone,
        options: room.options,
        total: ids.length,
      });
    }

    // ─── Select staging option for a room ───
    case "select_option": {
      const { roomIndex, optionIndex } = body;
      const room = project.rooms[roomIndex];
      if (!room) {
        return NextResponse.json({ error: "Pièce introuvable" }, { status: 400 });
      }
      room.selectedOptionIndex = optionIndex;
      await saveProject(project);
      return NextResponse.json({ success: true });
    }

    // ─── Generate video for a room ───
    case "generate_video": {
      const { roomIndex } = body;
      const room = project.rooms[roomIndex];
      if (!room || room.selectedOptionIndex === undefined) {
        return NextResponse.json({ error: "Sélectionnez d'abord une option de staging" }, { status: 400 });
      }
      const stagedUrl = room.options[room.selectedOptionIndex].url;
      const predId = await generateVideo(
        room.beforePhotoUrl,
        stagedUrl,
        project.style,
        room.roomType,
        { projectId: id, predictionType: "video", roomIndex },
        project.mode,
      );
      room.videoPredictionId = predId;
      room.videoUrl = undefined;
      project.phase = "generating_videos";
      await saveProject(project);
      return NextResponse.json({ success: true, predictionId: predId });
    }

    // ─── Poll video status for a room ───
    case "check_video": {
      const { roomIndex } = body;
      const room = project.rooms[roomIndex];
      if (!room?.videoPredictionId) {
        return NextResponse.json({ error: "Pas de vidéo en cours" }, { status: 400 });
      }
      const status = await getPredictionStatus(room.videoPredictionId);
      if (status.status === "succeeded") {
        const url = extractOutputUrl(status.output);
        if (url) room.videoUrl = url;
        await saveProject(project);
        return NextResponse.json({ done: true, videoUrl: room.videoUrl });
      } else if (status.status === "failed" || status.status === "canceled") {
        await saveProject(project);
        return NextResponse.json({ done: true, error: status.error || "Échec génération vidéo" });
      }
      return NextResponse.json({ done: false, status: status.status });
    }

    default:
      return NextResponse.json({ error: `Action inconnue: ${action}` }, { status: 400 });
  }
}
