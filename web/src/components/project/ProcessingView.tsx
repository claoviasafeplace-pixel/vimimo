"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, ImageIcon, Brain, Palette, ScanSearch } from "lucide-react";
import type { ProjectPhase, ProjectMode } from "@/lib/types";
import ProgressBar from "@/components/ui/ProgressBar";

interface ProcessingViewProps {
  phase: ProjectPhase;
  mode?: ProjectMode;
}

interface StepDef {
  key: string;
  label: string;
  description: string;
  icon: typeof ImageIcon;
}

const STAGING_PIECE_STEPS: StepDef[] = [
  {
    key: "cleaning",
    label: "Nettoyage des photos",
    description: "Suppression du mobilier existant pour préparer le staging",
    icon: ImageIcon,
  },
  {
    key: "analyzing",
    label: "Analyse IA",
    description: "GPT-4o analyse chaque pièce : dimensions, matériaux, lumière",
    icon: Brain,
  },
  {
    key: "generating_options",
    label: "Génération des options",
    description: "5 options de staging par pièce via Flux Kontext Pro",
    icon: Palette,
  },
];

const VIDEO_VISITE_STEPS: StepDef[] = [
  {
    key: "cleaning",
    label: "Nettoyage des photos",
    description: "Suppression du mobilier existant pour préparer le staging",
    icon: ImageIcon,
  },
  {
    key: "triaging",
    label: "Triage IA",
    description: "Identification des pièces, détection des doublons, ordre de visite",
    icon: ScanSearch,
  },
];

function getStepStatus(
  stepKey: string,
  currentPhase: ProjectPhase,
  phaseOrder: string[]
): "pending" | "active" | "done" {
  const stepIdx = phaseOrder.indexOf(stepKey);
  const currentIdx = phaseOrder.indexOf(currentPhase);

  if (currentIdx === -1) {
    return "done";
  }
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "active";
  return "pending";
}

function getProgress(phase: ProjectPhase, phaseOrder: string[]): number {
  const idx = phaseOrder.indexOf(phase);
  if (idx === -1) return 100;
  return Math.round(((idx + 0.5) / phaseOrder.length) * 100);
}

export default function ProcessingView({ phase, mode }: ProcessingViewProps) {
  const steps = useMemo(
    () => (mode === "video_visite" ? VIDEO_VISITE_STEPS : STAGING_PIECE_STEPS),
    [mode]
  );
  const phaseOrder = useMemo(() => steps.map((s) => s.key), [steps]);
  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Traitement en cours</h2>
        <p className="mt-2 text-sm text-muted">
          Votre projet est en cours de préparation
        </p>
      </div>

      <ProgressBar progress={getProgress(phase, phaseOrder)} />

      <div className="space-y-1">
        {steps.map((step, i) => {
          const status = getStepStatus(step.key, phase, phaseOrder);
          const Icon = step.icon;

          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-4 rounded-xl p-4"
            >
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  status === "done"
                    ? "gradient-gold"
                    : status === "active"
                    ? "bg-badge-gold-bg border border-badge-gold-border"
                    : "bg-surface-hover border border-border"
                }`}
              >
                {status === "done" ? (
                  <Check className="h-4 w-4 text-zinc-900" />
                ) : status === "active" ? (
                  <Loader2 className="h-4 w-4 text-icon-accent animate-spin" />
                ) : (
                  <Icon className="h-4 w-4 text-muted" />
                )}
              </div>
              <div>
                <p
                  className={`text-sm font-medium ${
                    status === "pending" ? "text-muted" : ""
                  }`}
                >
                  {step.label}
                </p>
                <p className="mt-0.5 text-xs text-muted">{step.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
