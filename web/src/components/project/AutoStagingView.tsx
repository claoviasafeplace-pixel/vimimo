"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, ImageIcon, Film, Sparkles } from "lucide-react";
import Image from "next/image";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import type { Project, Room } from "@/lib/types";

interface AutoStagingViewProps {
  project: Project;
}

function getRoomStage(room: Room): "staging" | "video" | "done" {
  if (room.videoUrl) return "done";
  if (room.options.length > 0) return "video";
  return "staging";
}

const TIPS = [
  "Les pièces sont stagées en parallèle par l'IA",
  "Les vidéos montrent la transformation avant → après",
  "Le montage final sera créé automatiquement",
  "Les vidéos sont générées simultanément",
  "Votre Video Visite sera prête dans quelques minutes",
];

export default function AutoStagingView({ project }: AutoStagingViewProps) {
  const totalRooms = project.rooms.length;
  const doneCount = project.rooms.filter((r) => r.videoUrl).length;
  const progress = totalRooms > 0 ? Math.round((doneCount / totalRooms) * 100) : 0;

  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl gradient-gold"
        >
          <Sparkles className="h-8 w-8 text-zinc-900" />
        </motion.div>
        <h2 className="text-2xl font-bold">Staging automatique</h2>
        <p className="text-sm text-muted">
          {doneCount}/{totalRooms} pièces terminées
        </p>
      </div>

      {/* Progress */}
      <div className="mx-auto max-w-md space-y-2">
        <ProgressBar progress={progress} />
        <div className="h-5 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={tipIndex}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center text-xs text-muted"
            >
              {TIPS[tipIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Room cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {project.rooms.map((room, i) => (
          <RoomStagingCard key={room.index} room={room} index={i} />
        ))}
      </div>
    </div>
  );
}

function RoomStagingCard({ room, index }: { room: Room; index: number }) {
  const stage = getRoomStage(room);

  const steps = [
    { key: "staging", label: "Staging IA", icon: ImageIcon },
    { key: "video", label: "Vidéo", icon: Film },
    { key: "done", label: "Terminé", icon: Check },
  ] as const;

  const stageOrder = ["staging", "video", "done"] as const;
  const currentIdx = stageOrder.indexOf(stage);

  const beforeUrl = room.beforePhotoUrl || room.cleanedPhotoUrl;
  const afterUrl = room.options.length > 0 ? room.options[room.selectedOptionIndex ?? 0]?.url : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="overflow-hidden rounded-2xl border border-border bg-surface"
    >
      {/* Preview */}
      <div className="relative aspect-video bg-surface-hover">
        {room.videoUrl ? (
          <video
            src={room.videoUrl}
            className="h-full w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          />
        ) : afterUrl ? (
          <Image
            src={afterUrl}
            alt={room.roomLabel}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        ) : beforeUrl ? (
          <div className="relative h-full w-full">
            <Image
              src={beforeUrl}
              alt={room.roomLabel}
              fill
              className="object-cover opacity-50"
              sizes="(max-width: 640px) 100vw, 50vw"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-icon-accent animate-spin" />
            </div>
          </div>
        ) : null}
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{room.roomLabel}</span>
          <Badge variant={stage === "done" ? "gold" : "muted"}>
            {room.roomType}
          </Badge>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2">
          {steps.map((step, i) => {
            const stepIdx = i;
            const isDone = stepIdx < currentIdx;
            const isActive = stepIdx === currentIdx;
            const Icon = step.icon;

            return (
              <div key={step.key} className="flex items-center gap-2 flex-1">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    isDone
                      ? "gradient-gold"
                      : isActive
                      ? "bg-badge-gold-bg border border-badge-gold-border"
                      : "bg-surface-hover border border-border"
                  }`}
                >
                  {isDone ? (
                    <Check className="h-3 w-3 text-zinc-900" />
                  ) : isActive ? (
                    <Loader2 className="h-3 w-3 text-icon-accent animate-spin" />
                  ) : (
                    <Icon className="h-3 w-3 text-muted" />
                  )}
                </div>
                <span
                  className={`text-xs ${
                    isDone || isActive ? "text-foreground" : "text-muted"
                  }`}
                >
                  {step.label}
                </span>
                {i < steps.length - 1 && (
                  <div
                    className={`h-px flex-1 ${
                      isDone ? "bg-accent-from" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
