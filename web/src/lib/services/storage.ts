import { nanoid } from "nanoid";
import { getSupabase } from "@/lib/supabase";

export async function uploadPhoto(file: File): Promise<{ id: string; url: string }> {
  const db = getSupabase();
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

  if (error) throw error;

  const { data } = db.storage.from("photos").getPublicUrl(path);
  return { id, url: data.publicUrl };
}

export async function uploadFromUrl(
  sourceUrl: string,
  prefix: string
): Promise<string> {
  const db = getSupabase();
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download from ${sourceUrl}: ${response.status}`);
  }
  const blob = await response.blob();
  const id = nanoid(10);
  const path = `${prefix}/${id}.mp4`;

  const buffer = Buffer.from(await blob.arrayBuffer());
  const { error } = await db.storage
    .from("photos")
    .upload(path, buffer, {
      contentType: "video/mp4",
      upsert: true,
    });

  if (error) throw error;

  const { data } = db.storage.from("photos").getPublicUrl(path);
  return data.publicUrl;
}
