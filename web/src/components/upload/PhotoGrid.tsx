"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface PhotoGridProps {
  photos: { id: string; file: File; preview: string }[];
  onRemove: (id: string) => void;
}

export default function PhotoGrid({ photos, onRemove }: PhotoGridProps) {
  if (!photos.length) return null;

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
      <AnimatePresence mode="popLayout">
        {photos.map((photo) => (
          <motion.div
            key={photo.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-surface"
          >
            <Image
              src={photo.preview}
              alt="Photo uploadée"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 33vw, 20vw"
            />
            <button
              onClick={() => onRemove(photo.id)}
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
