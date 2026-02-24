import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getSupabase } from "@/lib/supabase";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Rate limit
    const ip = getClientIp(request);
    const rl = checkRateLimit(`upload:${ip}`, RATE_LIMITS.UPLOAD);
    if (rl.limited) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans quelques instants." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const formData = await request.formData();
    const files = formData.getAll("photos") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "Aucune photo fournie" }, { status: 400 });
    }

    const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    const MIME_MAP: Record<string, string> = {
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
      webp: "image/webp", heic: "image/heic", heif: "image/heif",
    };

    const db = getSupabase();

    const photos = await Promise.all(
      files.map(async (file) => {
        const id = nanoid(10);
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();

        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          throw new Error(`Format non supporté: .${ext}`);
        }
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 50MB)`);
        }

        const path = `uploads/${id}.${ext}`;

        const buffer = Buffer.from(await file.arrayBuffer());

        const { error } = await db.storage
          .from("photos")
          .upload(path, buffer, {
            contentType: MIME_MAP[ext] || "image/jpeg",
            upsert: true,
          });

        if (error) {
          console.error("Supabase Storage upload error:", JSON.stringify(error));
          throw new Error(`Storage: ${error.message}`);
        }

        const { data: urlData } = db.storage
          .from("photos")
          .getPublicUrl(path);

        return { id, originalUrl: urlData.publicUrl };
      })
    );

    return NextResponse.json({ photos });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Upload error:", message);
    return NextResponse.json(
      { error: `Erreur upload: ${message}` },
      { status: 500 }
    );
  }
}
