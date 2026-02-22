"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, ImagePlus } from "lucide-react";
import { motion } from "framer-motion";

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export default function DropZone({ onFiles, disabled }: DropZoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length) onFiles(accepted);
    },
    [onFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 20,
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
            ? "border-amber-500 bg-amber-900/10"
            : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-500"
        } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          {isDragActive ? (
            <ImagePlus className="h-10 w-10 text-amber-400" />
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
              ou cliquez pour sélectionner (max. 20 photos)
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
