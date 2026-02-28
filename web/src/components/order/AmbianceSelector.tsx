"use client";

import { motion } from "framer-motion";
import { Sun, Moon, Snowflake, Check } from "lucide-react";
import type { Ambiance } from "@/lib/types";

const AMBIANCES: { id: Ambiance; label: string; description: string; icon: typeof Sun }[] = [
  {
    id: "jour",
    label: "Jour",
    description: "Lumière naturelle, atmosphère chaleureuse",
    icon: Sun,
  },
  {
    id: "nuit",
    label: "Nuit",
    description: "Éclairage tamisé, ambiance cosy",
    icon: Moon,
  },
  {
    id: "neige",
    label: "Neige",
    description: "Extérieur hivernal, intérieur douillet",
    icon: Snowflake,
  },
];

interface AmbianceSelectorProps {
  selected: Ambiance;
  onSelect: (ambiance: Ambiance) => void;
}

export default function AmbianceSelector({
  selected,
  onSelect,
}: AmbianceSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted">Ambiance</h3>
      <div className="grid grid-cols-3 gap-3">
        {AMBIANCES.map((amb, i) => {
          const isSelected = selected === amb.id;
          return (
            <motion.button
              key={amb.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
              onClick={() => onSelect(amb.id)}
              className={`relative flex flex-col items-center gap-2 rounded-xl border p-5 text-center transition-all cursor-pointer ${
                isSelected
                  ? "border-accent-from bg-badge-gold-bg"
                  : "border-border bg-surface hover:border-muted"
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full gradient-gold">
                  <Check className="h-3 w-3 text-zinc-900" />
                </div>
              )}
              <amb.icon
                className={`h-8 w-8 ${
                  isSelected ? "text-icon-accent" : "text-muted"
                }`}
              />
              <span className="text-sm font-semibold">{amb.label}</span>
              <span className="text-xs text-muted leading-tight">
                {amb.description}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
