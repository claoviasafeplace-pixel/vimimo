"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { OrderStep } from "@/hooks/useOrderTunnel";

const STEPS: { id: OrderStep; label: string }[] = [
  { id: "upload", label: "Photos" },
  { id: "preferences", label: "Préférences" },
  { id: "payment", label: "Paiement" },
  { id: "confirmation", label: "Confirmation" },
];

const stepIndex = (s: OrderStep) => STEPS.findIndex((x) => x.id === s);

export default function StepIndicator({ current }: { current: OrderStep }) {
  const currentIdx = stepIndex(current);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4">
      {STEPS.map((s, i) => {
        const isActive = i === currentIdx;
        const isDone = i < currentIdx;

        return (
          <div key={s.id} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                  backgroundColor: isDone
                    ? "var(--accent-from)"
                    : isActive
                      ? "var(--accent-from)"
                      : "var(--surface)",
                }}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border transition-colors ${
                  isDone || isActive
                    ? "border-transparent text-zinc-900"
                    : "border-border text-muted"
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : i + 1}
              </motion.div>
              <span
                className={`hidden text-sm font-medium sm:block ${
                  isActive
                    ? "text-foreground"
                    : isDone
                      ? "text-badge-gold-text"
                      : "text-muted"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-6 sm:w-12 ${
                  i < currentIdx ? "bg-accent-from" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
