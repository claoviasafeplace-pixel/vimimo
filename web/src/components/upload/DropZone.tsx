"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, ImagePlus } from "lucide-react";
import { motion } from "framer-motion";

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  maxPhotos?: number;
}

export default function DropZone({ onFiles, disabled, maxPhotos = 20 }: DropZoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length) onFiles(accepted);
    },
    [onFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: maxPhotos,
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
              {`ou cliquez pour sélectionner (max. ${maxPhotos} photos)`}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
