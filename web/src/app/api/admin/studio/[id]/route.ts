import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/admin-auth";
import { getProject, saveProject } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";
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

// PUT — Add photos to existing project (multipart upload)
export async function PUT(
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

  const formData = await request.formData();
  const files = formData.getAll("photos") as File[];

  if (!files.length) {
    return NextResponse.json({ error: "Aucune photo fournie" }, { status: 400 });
  }

  const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  const MIME_MAP: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    webp: "image/webp", heic: "image/heic", heif: "image/heif",
  };

  const db = getSupabase();

  const newPhotos = await Promise.all(
    files.map(async (file) => {
      const photoId = nanoid(10);
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        throw new Error(`Format non supporté: .${ext}`);
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
      }

      const path = `uploads/${photoId}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error } = await db.storage
        .from("photos")
        .upload(path, buffer, {
          contentType: MIME_MAP[ext] || "image/jpeg",
          upsert: true,
        });

      if (error) throw new Error(`Storage: ${error.message}`);

      const { data: urlData } = db.storage.from("photos").getPublicUrl(path);
      return { id: photoId, originalUrl: urlData.publicUrl };
    }),
  );

  project.photos.push(...newPhotos);
  await saveProject(project);

  return NextResponse.json({
    success: true,
    added: newPhotos.length,
    totalPhotos: project.photos.length,
    photos: project.photos,
  });
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }
  const { action } = body;

  try {
  switch (action) {
    // ─── Clean all photos (remove furniture) ───
    case "clean_photos": {
      // Submit ONE photo at a time to avoid Replicate rate limits (burst=1 when <$5)
      // Frontend calls this repeatedly until all photos are submitted
      const nextPhoto = project.photos.find(p => !p.cleanedUrl && !p.cleanPredictionId);
      if (!nextPhoto) {
        return NextResponse.json({ success: true, allSubmitted: true, predictions: [] });
      }
      const predId = await cleanPhoto(nextPhoto.originalUrl);
      nextPhoto.cleanPredictionId = predId;
      project.phase = "cleaning";
      await saveProject(project);
      const remaining = project.photos.filter(p => !p.cleanedUrl && !p.cleanPredictionId).length;
      return NextResponse.json({ success: true, predictions: [predId], remaining });
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
  } catch (err) {
    console.error(`[Studio] Action "${action}" failed for project ${id}:`, err);
    const message = err instanceof Error ? err.message : "Erreur interne";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
