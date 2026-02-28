"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { nanoid } from "nanoid";
import type { Style, Ambiance } from "@/lib/types";

export type OrderStep = "upload" | "preferences" | "payment" | "confirmation";

interface LocalPhoto {
  id: string;
  file: File;
  preview: string;
}

async function uploadFileDirectly(
  file: File,
): Promise<{ id: string; originalUrl: string }> {
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

  const { id, signedUrl, publicUrl } = await signedRes.json();

  const uploadRes = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "image/jpeg" },
    body: file,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => "");
    throw new Error(`Erreur upload (${uploadRes.status}): ${errText}`);
  }

  return { id, originalUrl: publicUrl };
}

export function useOrderTunnel() {
  const [step, setStep] = useState<OrderStep>("upload");
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const previewUrlsRef = useRef<Set<string>>(new Set());
  const [style, setStyle] = useState<Style | null>(null);
  const [ambiance, setAmbiance] = useState<Ambiance>("jour");
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const maxPhotos = 6;

  const addFiles = useCallback((files: File[]) => {
    const newPhotos = files.map((file) => {
      const preview = URL.createObjectURL(file);
      previewUrlsRef.current.add(preview);
      return { id: nanoid(8), file, preview };
    });
    setPhotos((prev) => {
      const total = [...prev, ...newPhotos].slice(0, maxPhotos);
      const kept = new Set(total.map((p) => p.preview));
      for (const p of newPhotos) {
        if (!kept.has(p.preview)) {
          URL.revokeObjectURL(p.preview);
          previewUrlsRef.current.delete(p.preview);
        }
      }
      return total;
    });
  }, []);

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) {
        URL.revokeObjectURL(photo.preview);
        previewUrlsRef.current.delete(photo.preview);
      }
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  const nextStep = useCallback(() => {
    const order: OrderStep[] = ["upload", "preferences", "payment", "confirmation"];
    const idx = order.indexOf(step);
    if (idx < order.length - 1) setStep(order[idx + 1]);
  }, [step]);

  const prevStep = useCallback(() => {
    const order: OrderStep[] = ["upload", "preferences", "payment", "confirmation"];
    const idx = order.indexOf(step);
    if (idx > 0) setStep(order[idx - 1]);
  }, [step]);

  const canGoNext = useCallback(() => {
    switch (step) {
      case "upload":
        return photos.length > 0;
      case "preferences":
        return style !== null;
      case "payment":
        return selectedPackId !== null;
      default:
        return false;
    }
  }, [step, photos.length, style, selectedPackId]);

  // Submit order: upload photos, create order, redirect to Stripe
  const submitOrder = useCallback(async () => {
    if (!photos.length || !style || !selectedPackId) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // 1. Upload photos
      const uploadedPhotos: { id: string; originalUrl: string }[] = [];
      for (let i = 0; i < photos.length; i++) {
        const result = await uploadFileDirectly(photos[i].file);
        uploadedPhotos.push(result);
        setUploadProgress(Math.round(((i + 1) / photos.length) * 80));
      }

      // 2. Create order + get Stripe checkout URL
      const orderRes = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: uploadedPhotos,
          style,
          ambiance,
          packId: selectedPackId,
        }),
      });

      setUploadProgress(90);

      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => null);
        throw new Error(errData?.error || `Erreur commande (${orderRes.status})`);
      }

      const { checkoutUrl: url } = await orderRes.json();
      setUploadProgress(100);
      setCheckoutUrl(url);

      // Redirect to Stripe
      if (url) {
        window.location.href = url;
      } else {
        // If no checkout needed (credits already available), go to confirmation
        setStep("confirmation");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [photos, style, ambiance, selectedPackId]);

  return {
    step,
    setStep,
    photos,
    style,
    ambiance,
    selectedPackId,
    maxPhotos,
    isUploading,
    error,
    uploadProgress,
    checkoutUrl,
    addFiles,
    removePhoto,
    setStyle,
    setAmbiance,
    setSelectedPackId,
    nextStep,
    prevStep,
    canGoNext,
    submitOrder,
  };
}
