"use client";

import { motion } from "framer-motion";
import { Check, LayoutGrid, Video } from "lucide-react";
import type { ProjectMode } from "@/lib/types";

interface ModeSelectorProps {
  selected: ProjectMode;
  onSelect: (mode: ProjectMode) => void;
}

const MODES = [
  {
    id: "staging_piece" as ProjectMode,
    label: "Staging par pièce",
    description: "Sélectionnez manuellement le staging de chaque pièce",
    detail: "1 crédit / pièce",
    icon: LayoutGrid,
  },
  {
    id: "video_visite" as ProjectMode,
    label: "Video Visite",
    description: "Visite complète automatique en 1 clic",
    detail: "1 crédit total",
    icon: Video,
  },
];

export default function ModeSelector({ selected, onSelect }: ModeSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted">Mode de projet</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {MODES.map((mode, i) => {
          const isSelected = selected === mode.id;
          const Icon = mode.icon;
          return (
            <motion.button
              key={mode.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
              onClick={() => onSelect(mode.id)}
              className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all cursor-pointer ${
                isSelected
                  ? "border-accent-from bg-badge-gold-bg"
                  : "border-border bg-surface hover:border-muted"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-icon-accent" />
                  <span className="text-sm font-semibold">{mode.label}</span>
                </div>
                {isSelected && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full gradient-gold">
                    <Check className="h-3 w-3 text-zinc-900" />
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-muted">{mode.description}</p>
              <span className="mt-2 text-xs font-medium text-icon-accent">
                {mode.detail}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
