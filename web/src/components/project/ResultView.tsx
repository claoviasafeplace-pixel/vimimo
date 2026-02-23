"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Film, Plus, Loader2, Sparkles, Clapperboard } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import MontageForm from "./MontageForm";
import type { Project, MontageConfig } from "@/lib/types";

interface ResultViewProps {
  project: Project;
  isRendering: boolean;
  isRenderingMontage?: boolean;
}

export default function ResultView({
  project,
  isRendering,
  isRenderingMontage,
}: ResultViewProps) {
  const [showMontageForm, setShowMontageForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roomsWithVideo = project.rooms.filter((r) => r.videoUrl);
  const canCreateMontage =
    roomsWithVideo.length >= 2 &&
    !project.studioMontageUrl &&
    !isRendering &&
    !isRenderingMontage;

  const handleMontageSubmit = async (config: MontageConfig) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/project/${project.id}/montage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }
      setShowMontageForm(false);
    } catch (err) {
      console.error("Montage submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold">
          {isRendering
            ? "Compilation en cours..."
            : isRenderingMontage
              ? "Studio Montage en cours..."
              : "Votre projet est prêt"}
        </h2>
        <p className="mt-2 text-sm text-muted">
          {isRendering
            ? "Remotion compile la vidéo finale"
            : isRenderingMontage
              ? "Création de votre présentation premium"
              : "Téléchargez vos vidéos de staging"}
        </p>
      </div>

      {/* Final video compilation */}
      {isRendering && (
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="h-10 w-10 text-icon-accent animate-spin" />
          <p className="text-sm text-muted">Compilation finale en cours...</p>
        </div>
      )}

      {project.finalVideoUrl && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="overflow-hidden rounded-2xl border border-badge-gold-border bg-surface"
        >
          <video
            src={project.finalVideoUrl}
            className="aspect-video w-full"
            controls
            playsInline
          />
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-semibold">Compilation finale</p>
              <p className="text-xs text-muted">
                {project.rooms.length} pièces - {project.styleLabel}
              </p>
            </div>
            <a href={project.finalVideoUrl} download>
              <Button size="md">
                <Download className="mr-2 h-4 w-4" />
                Télécharger
              </Button>
            </a>
          </div>
        </motion.div>
      )}

      {/* Studio Montage section */}
      {isRenderingMontage && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="relative">
            <Loader2 className="h-10 w-10 text-icon-accent animate-spin" />
            <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-badge-gold-text" />
          </div>
          <p className="text-sm text-muted">
            Studio Montage en cours de création...
          </p>
          <p className="text-xs text-muted">
            Effets 3D, transitions et musique
          </p>
        </div>
      )}

      {project.studioMontageUrl && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="overflow-hidden rounded-2xl border-2 border-accent-from/40 bg-surface"
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-badge-gold-bg border-b border-badge-gold-border">
            <Sparkles className="h-4 w-4 text-icon-accent" />
            <span className="text-xs font-semibold text-badge-gold-text uppercase tracking-wider">
              Studio Montage
            </span>
          </div>
          <video
            src={project.studioMontageUrl}
            className="aspect-video w-full"
            controls
            playsInline
          />
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-semibold">
                {project.montageConfig?.propertyInfo.title || "Présentation Premium"}
              </p>
              <p className="text-xs text-muted">
                {roomsWithVideo.length} pièces - Montage cinématique
              </p>
            </div>
            <a href={project.studioMontageUrl} download>
              <Button size="md">
                <Download className="mr-2 h-4 w-4" />
                Télécharger
              </Button>
            </a>
          </div>
        </motion.div>
      )}

      {/* Studio Montage CTA */}
      {canCreateMontage && !showMontageForm && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Button
            size="lg"
            onClick={() => setShowMontageForm(true)}
          >
            <Clapperboard className="mr-2 h-5 w-5" />
            Créer un Studio Montage
          </Button>
          <p className="mt-2 text-xs text-muted">
            Présentation cinématique premium avec effets 3D
          </p>
        </motion.div>
      )}

      {/* Montage Form */}
      {showMontageForm && (
        <MontageForm
          onSubmit={handleMontageSubmit}
          onCancel={() => setShowMontageForm(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Individual room videos */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Vidéos par pièce</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {project.rooms
            .filter((r) => r.videoUrl)
            .map((room) => (
              <motion.div
                key={room.index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-2xl border border-border bg-surface"
              >
                <video
                  src={room.videoUrl}
                  className="aspect-video w-full"
                  controls
                  playsInline
                />
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-muted" />
                    <span className="text-sm font-medium">{room.roomLabel}</span>
                  </div>
                  <Badge variant="muted">{room.roomType}</Badge>
                </div>
              </motion.div>
            ))}
        </div>
      </div>

      {/* New project */}
      <div className="text-center pt-4">
        <a href="/">
          <Button variant="secondary" size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau projet
          </Button>
        </a>
      </div>
    </div>
  );
}
