import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/admin-auth";
import { saveProject } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";
import type { Project, Style } from "@/lib/types";
import { STYLES } from "@/lib/types";

// POST — Create a new admin studio project (no credits, no auth cost)
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const formData = await request.formData();
  const files = formData.getAll("photos") as File[];
  const style = (formData.get("style") as Style) || "modern_minimalist";

  if (!files.length) {
    return NextResponse.json({ error: "Aucune photo fournie" }, { status: 400 });
  }

  if (files.length > 20) {
    return NextResponse.json({ error: "Maximum 20 photos" }, { status: 400 });
  }

  const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  const MIME_MAP: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    webp: "image/webp", heic: "image/heic", heif: "image/heif",
  };

  const db = getSupabase();

  // Upload all photos to Supabase Storage
  const photos = await Promise.all(
    files.map(async (file) => {
      const id = nanoid(10);
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        throw new Error(`Format non supporté: .${ext}`);
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
      }

      const path = `uploads/${id}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error } = await db.storage
        .from("photos")
        .upload(path, buffer, {
          contentType: MIME_MAP[ext] || "image/jpeg",
          upsert: true,
        });

      if (error) throw new Error(`Storage: ${error.message}`);

      const { data: urlData } = db.storage.from("photos").getPublicUrl(path);
      return { id, originalUrl: urlData.publicUrl };
    }),
  );

  // Create project — NO credit deduction for admin
  const projectId = nanoid(12);
  const styleOption = STYLES.find((s) => s.id === style) || STYLES[2];

  const project: Project = {
    id: projectId,
    phase: "uploading",
    createdAt: Date.now(),
    style: styleOption.id,
    styleLabel: styleOption.label,
    photos,
    rooms: [],
    mode: "staging_piece",
    userId: auth.session?.user?.id,
  };

  await saveProject(project);

  return NextResponse.json({ projectId, photosCount: photos.length });
}
