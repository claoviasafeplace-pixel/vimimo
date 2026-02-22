"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/Button";
import RoomCard from "./RoomCard";
import type { Project } from "@/lib/types";

interface SelectionViewProps {
  project: Project;
  onSelect: (roomIndex: number, optionIndex: number) => void;
  onConfirm: () => void;
}

export default function SelectionView({
  project,
  onSelect,
  onConfirm,
}: SelectionViewProps) {
  const allSelected = project.rooms.every(
    (r) => r.selectedOptionIndex !== undefined
  );
  const selectedCount = project.rooms.filter(
    (r) => r.selectedOptionIndex !== undefined
  ).length;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Choisissez votre staging</h2>
        <p className="mt-2 text-sm text-muted">
          Sélectionnez une option pour chaque pièce
        </p>
      </div>

      <div className="space-y-6">
        {project.rooms.map((room) => (
          <RoomCard
            key={room.index}
            room={room}
            onSelect={(optionIndex) => onSelect(room.index, optionIndex)}
          />
        ))}
      </div>

      {/* Fixed bottom bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky bottom-0 flex items-center justify-between rounded-2xl border border-border bg-surface/95 p-4 backdrop-blur-sm"
      >
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2
            className={`h-4 w-4 ${allSelected ? "text-amber-400" : "text-zinc-500"}`}
          />
          <span className="text-muted">
            {selectedCount}/{project.rooms.length} pièces sélectionnées
          </span>
        </div>
        <Button onClick={onConfirm} disabled={!allSelected} size="lg">
          Générer les vidéos ({project.rooms.length} pièces)
        </Button>
      </motion.div>
    </div>
  );
}
