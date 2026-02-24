"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, ImagePlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  maxPhotos?: number;
}

export default function DropZone({ onFiles, disabled, maxPhotos = 6 }: DropZoneProps) {
  const [rejection, setRejection] = useState<string | null>(null);

  const onDrop = useCallback(
    (accepted: File[]) => {
      setRejection(null);
      if (accepted.length) onFiles(accepted);
    },
    [onFiles]
  );

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    const tooLarge = rejections.some((r) =>
      r.errors.some((e) => e.code === "file-too-large")
    );
    const wrongType = rejections.some((r) =>
      r.errors.some((e) => e.code === "file-invalid-type")
    );
    if (tooLarge) {
      setRejection("Fichier trop volumineux (max. 20 Mo par image).");
    } else if (wrongType) {
      setRejection("Format non supporté. Utilisez JPG, PNG ou WebP.");
    } else {
      setRejection("Certains fichiers ont été refusés.");
    }
    setTimeout(() => setRejection(null), 5000);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: maxPhotos,
    maxSize: MAX_FILE_SIZE,
    disabled,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div
        {...getRootProps()}
        className={`relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-colors ${
          isDragActive
            ? "border-accent-from bg-badge-gold-bg"
            : "border-border bg-surface/50 hover:border-muted"
        } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          {isDragActive ? (
            <ImagePlus className="h-10 w-10 text-icon-accent" />
          ) : (
            <Upload className="h-10 w-10 text-muted" />
          )}
          <div>
            <p className="text-base font-medium">
              {isDragActive
                ? "Déposez vos photos ici"
                : "Glissez-déposez vos photos"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {`Sélectionnez jusqu'à ${maxPhotos} photos maîtresses (vidéo optimisée ~25s pour vos réseaux)`}
            </p>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {rejection && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400"
          >
            {rejection}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
