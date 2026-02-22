import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const { fileName, contentType } = await request.json();

    if (!fileName) {
      return NextResponse.json({ error: "fileName requis" }, { status: 400 });
    }

    const id = nanoid(10);
    const ext = fileName.split(".").pop() || "jpg";
    const path = `uploads/${id}.${ext}`;

    const db = getSupabase();

    const { data, error } = await db.storage
      .from("photos")
      .createSignedUploadUrl(path);

    if (error) {
      console.error("Signed URL error:", error);
      return NextResponse.json(
        { error: `Impossible de créer l'URL de téléversement: ${error.message}` },
        { status: 500 },
      );
    }

    const { data: urlData } = db.storage.from("photos").getPublicUrl(path);

    return NextResponse.json({
      id,
      signedUrl: data.signedUrl,
      token: data.token,
      path,
      publicUrl: urlData.publicUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Signed URL error:", message);
    return NextResponse.json(
      { error: `Erreur: ${message}` },
      { status: 500 },
    );
  }
}
