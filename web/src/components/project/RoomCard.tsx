"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Image from "next/image";
import Badge from "@/components/ui/Badge";
import type { Room } from "@/lib/types";

interface RoomCardProps {
  room: Room;
  onSelect: (optionIndex: number) => void;
}

export default function RoomCard({ room, onSelect }: RoomCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">{room.roomLabel}</h3>
          <p className="text-xs text-muted">{room.roomType}</p>
        </div>
        {room.selectedOptionIndex !== undefined && (
          <Badge variant="gold">Sélectionné</Badge>
        )}
      </div>

      {/* Original photo (small) */}
      <div className="mb-4 overflow-hidden rounded-lg">
        <div className="relative aspect-[16/9] w-full max-w-[200px]">
          <Image
            src={room.beforePhotoUrl}
            alt={`${room.roomLabel} - Original`}
            fill
            className="object-cover"
            sizes="200px"
          />
          <div className="absolute bottom-1 left-1">
            <Badge variant="muted">Original</Badge>
          </div>
        </div>
      </div>

      {/* Options grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {room.options.map((option, i) => {
          const isSelected = room.selectedOptionIndex === i;
          return (
            <button
              key={option.predictionId}
              onClick={() => onSelect(i)}
              className={`group relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition-all cursor-pointer ${
                isSelected
                  ? "border-accent-from ring-2 ring-accent-from/30"
                  : "border-transparent hover:border-muted"
              }`}
            >
              <Image
                src={option.url}
                alt={`Option ${i + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 20vw"
              />
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center bg-overlay-bg">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-gold">
                    <Check className="h-4 w-4 text-zinc-900" />
                  </div>
                </div>
              )}
              <div className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white">
                {i + 1}
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
