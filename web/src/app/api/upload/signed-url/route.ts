import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getSupabase } from "@/lib/supabase";
import { signedUrlSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const body = await request.json();
    const parsed = signedUrlSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Données invalides";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { fileName } = parsed.data;

    const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
    const id = nanoid(10);
    const ext = (fileName.split(".").pop() || "jpg").toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Format non supporté: .${ext}` },
        { status: 400 }
      );
    }

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
    console.error("Signed URL error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'URL de téléversement" },
      { status: 500 },
    );
  }
}
