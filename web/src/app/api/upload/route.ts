import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const formData = await request.formData();
    const files = formData.getAll("photos") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "Aucune photo fournie" }, { status: 400 });
    }

    const db = getSupabase();

    const photos = await Promise.all(
      files.map(async (file) => {
        const id = nanoid(10);
        const ext = file.name.split(".").pop() || "jpg";
        const path = `uploads/${id}.${ext}`;

        const buffer = Buffer.from(await file.arrayBuffer());

        const { error } = await db.storage
          .from("photos")
          .upload(path, buffer, {
            contentType: file.type || "image/jpeg",
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
