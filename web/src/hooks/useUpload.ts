"use client";

import { useState, useCallback } from "react";
import { nanoid } from "nanoid";
import type { Style } from "@/lib/types";

interface LocalPhoto {
  id: string;
  file: File;
  preview: string;
}

async function uploadFileDirectly(
  file: File,
): Promise<{ id: string; originalUrl: string }> {
  // 1. Get signed upload URL from our API
  const signedRes = await fetch("/api/upload/signed-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "image/jpeg",
    }),
  });

  if (!signedRes.ok) {
    if (signedRes.status === 401) throw new Error("Veuillez vous connecter");
    const err = await signedRes.json().catch(() => null);
    throw new Error(err?.error || `Erreur signed URL (${signedRes.status})`);
  }

  const { id, signedUrl, token, publicUrl } = await signedRes.json();

  // 2. Upload file directly to Supabase Storage
  const uploadRes = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "image/jpeg",
      ...(token ? { "x-upsert": "true" } : {}),
    },
    body: file,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => "");
    throw new Error(`Erreur upload (${uploadRes.status}): ${errText}`);
  }

  return { id, originalUrl: publicUrl };
}

export function useUpload() {
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [style, setStyle] = useState<Style | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const addFiles = useCallback((files: File[]) => {
    const newPhotos = files.map((file) => ({
      id: nanoid(8),
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => {
      const total = [...prev, ...newPhotos].slice(0, 20);
      return total;
    });
  }, []);

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const submit = useCallback(async (): Promise<string | null> => {
    if (!photos.length || !style) return null;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // 1. Upload photos directly to Supabase (one at a time)
      const uploadedPhotos: { id: string; originalUrl: string }[] = [];

      for (let i = 0; i < photos.length; i++) {
        const result = await uploadFileDirectly(photos[i].file);
        uploadedPhotos.push(result);
        setUploadProgress(Math.round(((i + 1) / photos.length) * 100));
      }

      // 2. Create project
      const projectRes = await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: uploadedPhotos, style }),
      });

      if (!projectRes.ok) {
        if (projectRes.status === 402) {
          throw new Error("Crédits insuffisants");
        }
        if (projectRes.status === 401) {
          throw new Error("Veuillez vous connecter");
        }
        const errData = await projectRes.json().catch(() => null);
        throw new Error(errData?.error || `Erreur projet (${projectRes.status})`);
      }

      const { projectId } = await projectRes.json();
      return projectId;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [photos, style]);

  return {
    photos,
    style,
    isUploading,
    error,
    uploadProgress,
    addFiles,
    removePhoto,
    setStyle,
    submit,
    canSubmit: photos.length > 0 && style !== null && !isUploading,
  };
}
