"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Download,
  Clock,
  Sparkles,
  ShieldCheck,
  Package,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import type { Project } from "@/lib/types";

interface OrderStatusViewProps {
  project: Project;
}

interface TimelineStep {
  label: string;
  description: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    label: "Commande recue",
    description: "Votre commande a ete enregistree",
    icon: <Package className="h-5 w-5" />,
    activeIcon: <Package className="h-5 w-5" />,
  },
  {
    label: "Creation IA en cours",
    description: "Nos algorithmes preparent votre staging",
    icon: <Sparkles className="h-5 w-5" />,
    activeIcon: <Loader2 className="h-5 w-5 animate-spin" />,
  },
  {
    label: "Controle qualite expert",
    description: "Un expert verifie la qualite du rendu",
    icon: <ShieldCheck className="h-5 w-5" />,
    activeIcon: <Loader2 className="h-5 w-5 animate-spin" />,
  },
  {
    label: "Livre",
    description: "Votre projet est pret a telecharger",
    icon: <CheckCircle2 className="h-5 w-5" />,
    activeIcon: <CheckCircle2 className="h-5 w-5" />,
  },
];

function getStepIndex(orderStatus: string | undefined): number {
  switch (orderStatus) {
    case "pending":
      return 0;
    case "processing":
      return 1;
    case "quality_check":
      return 2;
    case "delivered":
      return 3;
    default:
      return 0;
  }
}

/**
 * If the video URL is a direct VPS/Remotion URL (not a public Supabase URL),
 * route it through our API proxy that adds the auth header.
 */
function getVideoSrc(url: string, projectId?: string): string {
  if (url.includes("supabase.co") || url.includes("replicate.delivery")) {
    return url;
  }
  if (projectId) {
    return `/api/project/${projectId}/video`;
  }
  return url;
}

export default function OrderStatusView({ project }: OrderStatusViewProps) {
  const currentStep = getStepIndex(project.orderStatus);
  const isDelivered = project.orderStatus === "delivered";
  const isError = project.orderStatus === "error";

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">
          {isDelivered
            ? "Votre projet est pret !"
            : isError
              ? "Une erreur est survenue"
              : "Votre commande est en cours"}
        </h2>
        <p className="mt-2 text-sm text-muted">
          {project.styleLabel} &middot; {project.rooms.length}{" "}
          {project.rooms.length > 1 ? "pieces" : "piece"}
        </p>
      </div>

      {/* Error state */}
      {isError && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center"
        >
          <p className="text-sm text-red-400">
            {project.error || "Une erreur est survenue lors du traitement de votre commande."}
          </p>
          <p className="mt-2 text-xs text-muted">
            Notre equipe a ete notifiee et travaille sur une resolution.
          </p>
        </motion.div>
      )}

      {/* Timeline */}
      {!isError && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-md"
        >
          <div className="relative space-y-0">
            {TIMELINE_STEPS.map((step, index) => {
              const isDone = index < currentStep;
              const isActive = index === currentStep;
              const isFuture = index > currentStep;

              return (
                <div key={step.label} className="relative flex gap-4">
                  {/* Vertical line */}
                  {index < TIMELINE_STEPS.length - 1 && (
                    <div className="absolute left-5 top-10 w-0.5 h-[calc(100%-10px)]">
                      <div
                        className={`h-full w-full transition-colors duration-500 ${
                          isDone
                            ? "bg-green-500"
                            : isActive
                              ? "bg-gradient-to-b from-green-500 to-border"
                              : "bg-border/50"
                        }`}
                      />
                    </div>
                  )}

                  {/* Icon circle */}
                  <div
                    className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                      isDone
                        ? "border-green-500 bg-green-500/20 text-green-400"
                        : isActive
                          ? "border-amber-500 bg-amber-500/20 text-amber-400 shadow-lg shadow-amber-500/20"
                          : "border-border/60 bg-surface text-muted"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                    ) : isActive ? (
                      step.activeIcon
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </div>

                  {/* Step content */}
                  <div className={`pb-8 pt-1.5 ${isFuture ? "opacity-40" : ""}`}>
                    <p
                      className={`text-sm font-semibold ${
                        isDone
                          ? "text-green-400"
                          : isActive
                            ? "text-foreground"
                            : "text-muted"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {step.description}
                    </p>
                    {isDone && index === 0 && (
                      <p className="mt-1 text-xs text-muted flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(project.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                    {isDelivered && index === 3 && project.deliveredAt && (
                      <p className="mt-1 text-xs text-green-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Livre le{" "}
                        {new Date(project.deliveredAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Delivery estimate */}
      {!isDelivered && !isError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mx-auto max-w-md rounded-2xl border border-badge-gold-border/40 bg-badge-gold-bg/20 p-5 text-center"
        >
          <div className="flex items-center justify-center gap-2 text-badge-gold-text">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-semibold">
              Livraison sous 24h
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted">
            Vous recevrez un email des que votre projet sera pret.
          </p>
        </motion.div>
      )}

      {/* Download section when delivered */}
      {isDelivered && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Final video */}
          {project.finalVideoUrl && (
            <div className="overflow-hidden rounded-2xl border border-badge-gold-border bg-surface">
              <video
                src={getVideoSrc(project.finalVideoUrl, project.id)}
                className="aspect-video w-full"
                controls
                playsInline
                preload="metadata"
              />
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-semibold">Video finale</p>
                  <p className="text-xs text-muted">
                    {project.rooms.length} pieces - {project.styleLabel}
                  </p>
                </div>
                <a
                  href={getVideoSrc(project.finalVideoUrl, project.id)}
                  download
                >
                  <Button size="md">
                    <Download className="mr-2 h-4 w-4" />
                    Telecharger
                  </Button>
                </a>
              </div>
            </div>
          )}

          {/* Studio Montage */}
          {project.studioMontageUrl && (
            <div className="overflow-hidden rounded-2xl border-2 border-accent-from/40 bg-surface">
              <div className="flex items-center gap-2 px-4 py-2 bg-badge-gold-bg border-b border-badge-gold-border">
                <Sparkles className="h-4 w-4 text-icon-accent" />
                <span className="text-xs font-semibold text-badge-gold-text uppercase tracking-wider">
                  Studio Montage
                </span>
              </div>
              <video
                src={getVideoSrc(project.studioMontageUrl, project.id)}
                className="aspect-video w-full"
                controls
                playsInline
                preload="metadata"
              />
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-semibold">
                    {project.montageConfig?.propertyInfo.title ||
                      "Presentation Premium"}
                  </p>
                  <p className="text-xs text-muted">Montage cinematique</p>
                </div>
                <a
                  href={getVideoSrc(project.studioMontageUrl, project.id)}
                  download
                >
                  <Button size="md">
                    <Download className="mr-2 h-4 w-4" />
                    Telecharger
                  </Button>
                </a>
              </div>
            </div>
          )}

          {/* Individual room staged images */}
          {project.rooms.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Images par piece
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {project.rooms.map((room) => {
                  const selectedIdx = room.selectedOptionIndex ?? 0;
                  const stagedUrl = room.options[selectedIdx]?.url;
                  if (!stagedUrl) return null;

                  return (
                    <div
                      key={room.index}
                      className="overflow-hidden rounded-2xl border border-border bg-surface"
                    >
                      <div className="relative aspect-video">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={stagedUrl}
                          alt={room.roomLabel}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3">
                        <div>
                          <p className="text-sm font-medium">{room.roomLabel}</p>
                          <p className="text-xs text-muted">{room.roomType}</p>
                        </div>
                        <a href={stagedUrl} download target="_blank" rel="noopener noreferrer">
                          <Button variant="secondary" size="sm" className="text-xs">
                            <Download className="mr-1 h-3 w-3" />
                            Image
                          </Button>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
