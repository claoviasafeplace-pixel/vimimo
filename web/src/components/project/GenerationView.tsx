"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Film, Check, Sparkles } from "lucide-react";
import Image from "next/image";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import type { Project, Room } from "@/lib/types";

interface GenerationViewProps {
  project: Project;
}

const TIPS = [
  "Les vidéos sont générées par IA en haute qualité",
  "Chaque vidéo montre la transformation avant → après",
  "Le rendu final compilera toutes les pièces",
  "Les vidéos sont en 5 secondes à 30fps",
  "La génération prend entre 1 et 3 minutes par pièce",
];

export default function GenerationView({ project }: GenerationViewProps) {
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
        <h2 className="text-2xl font-bold">Création des vidéos</h2>
        <p className="text-sm text-muted">
          {doneCount}/{totalRooms} vidéos terminées
        </p>
      </div>

      {/* Progress */}
      <div className="mx-auto max-w-md space-y-2">
        <ProgressBar progress={progress} />

        {/* Rotating tips */}
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
          <RoomGenerationCard key={room.index} room={room} index={i} />
        ))}
      </div>
    </div>
  );
}

function RoomGenerationCard({ room, index }: { room: Room; index: number }) {
  const isDone = !!room.videoUrl;
  const selectedOption =
    room.selectedOptionIndex !== undefined
      ? room.options[room.selectedOptionIndex]
      : null;

  const beforeUrl = room.beforePhotoUrl || room.cleanedPhotoUrl;
  const afterUrl = selectedOption?.url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="overflow-hidden rounded-2xl border border-border bg-surface"
    >
      {/* Preview area */}
      <div className="relative aspect-video">
        {isDone && room.videoUrl ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full w-full"
          >
            <video
              src={room.videoUrl}
              className="h-full w-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          </motion.div>
        ) : beforeUrl && afterUrl ? (
          <MorphAnimation before={beforeUrl} after={afterUrl} label={room.roomLabel} />
        ) : afterUrl ? (
          <div className="relative h-full w-full">
            <Image
              src={afterUrl}
              alt={room.roomLabel}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 50vw"
            />
            <PulseOverlay />
          </div>
        ) : null}
      </div>

      {/* Info bar */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-muted" />
          <span className="text-sm font-medium">{room.roomLabel}</span>
        </div>
        {isDone ? (
          <Badge variant="gold">
            <Check className="mr-1 h-3 w-3" />
            Terminé
          </Badge>
        ) : (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-icon-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-icon-accent" />
            </span>
            <Badge variant="muted">Génération...</Badge>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/** Crossfade animation between before and after images */
function MorphAnimation({
  before,
  after,
  label,
}: {
  before: string;
  after: string;
  label: string;
}) {
  const [showAfter, setShowAfter] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowAfter((prev) => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-full w-full">
      <Image
        src={before}
        alt={`${label} — avant`}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 100vw, 50vw"
      />

      <motion.div
        className="absolute inset-0"
        animate={{ opacity: showAfter ? 1 : 0 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      >
        <Image
          src={after}
          alt={`${label} — après`}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 50vw"
        />
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={showAfter ? "after" : "before"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3 }}
          className="absolute bottom-3 left-3"
        >
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md ${
              showAfter
                ? "bg-amber-500/80 text-zinc-900"
                : "bg-zinc-900/70 text-zinc-200"
            }`}
          >
            {showAfter ? "Après" : "Avant"}
          </span>
        </motion.div>
      </AnimatePresence>

      <PulseOverlay />
    </div>
  );
}

function PulseOverlay() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          "linear-gradient(180deg, transparent 0%, rgba(245,158,11,0.08) 50%, transparent 100%)",
        backgroundSize: "100% 200%",
      }}
      animate={{
        backgroundPosition: ["0% 0%", "0% 100%", "0% 0%"],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}
