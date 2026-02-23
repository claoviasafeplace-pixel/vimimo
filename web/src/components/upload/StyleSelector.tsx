"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { STYLES, type Style } from "@/lib/types";

interface StyleSelectorProps {
  selected: Style | null;
  onSelect: (style: Style) => void;
}

export default function StyleSelector({ selected, onSelect }: StyleSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted">Style de staging</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {STYLES.map((style, i) => {
          const isSelected = selected === style.id;
          return (
            <motion.button
              key={style.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
              onClick={() => onSelect(style.id)}
              className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all cursor-pointer ${
                isSelected
                  ? "border-accent-from bg-badge-gold-bg"
                  : "border-border bg-surface hover:border-muted"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-sm font-semibold">{style.label}</span>
                {isSelected && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full gradient-gold">
                    <Check className="h-3 w-3 text-zinc-900" />
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-muted">{style.description}</p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
