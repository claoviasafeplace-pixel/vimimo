"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Film,
  Plus,
  Loader2,
  Sparkles,
  Clapperboard,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import MontageForm from "./MontageForm";
import type { Project, MontageConfig } from "@/lib/types";

/**
 * If the video URL is a direct VPS/Remotion URL (not a public Supabase URL),
 * route it through our API proxy that adds the auth header.
 */
function getVideoSrc(url: string, projectId?: string): string {
  // Supabase and other public URLs work directly
  if (url.includes("supabase.co") || url.includes("replicate.delivery")) {
    return url;
  }
  // VPS Remotion URLs need proxying — use our API route
  if (projectId) {
    return `/api/project/${projectId}/video`;
  }
  return url;
}

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
  const [selectingForMontage, setSelectingForMontage] = useState(false);

  // Description generator state
  const [descLoading, setDescLoading] = useState(false);
  const [description, setDescription] = useState<{ instagram: string; tiktok: string } | null>(null);
  const [descTab, setDescTab] = useState<"instagram" | "tiktok">("instagram");
  const [copied, setCopied] = useState(false);
  const [descError, setDescError] = useState<string | null>(null);
  const [montageError, setMontageError] = useState<string | null>(null);

  const roomsWithVideo = project.rooms.filter((r) => r.videoUrl && r.videoUrl !== "");
  const roomsWithOptions = project.rooms.filter((r) => r.options.length > 0);
  const hasAnyContent = roomsWithVideo.length > 0 || project.finalVideoUrl || project.studioMontageUrl || roomsWithOptions.length > 0;

  // Selection state: array of room indices in montage order
  const [selectedRoomIndices, setSelectedRoomIndices] = useState<number[]>(() =>
    roomsWithVideo.map((r) => r.index)
  );

  const canCreateMontage =
    roomsWithVideo.length >= 2 &&
    !isRendering &&
    !isRenderingMontage;

  const selectedCount = selectedRoomIndices.length;

  const toggleRoom = (roomIndex: number) => {
    setSelectedRoomIndices((prev) =>
      prev.includes(roomIndex)
        ? prev.filter((i) => i !== roomIndex)
        : [...prev, roomIndex]
    );
  };

  const moveRoomUp = (roomIndex: number) => {
    setSelectedRoomIndices((prev) => {
      const idx = prev.indexOf(roomIndex);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveRoomDown = (roomIndex: number) => {
    setSelectedRoomIndices((prev) => {
      const idx = prev.indexOf(roomIndex);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const handleMontageSubmit = async (config: MontageConfig) => {
    setIsSubmitting(true);
    setMontageError(null);
    try {
      const res = await fetch(`/api/project/${project.id}/montage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          selectedRoomIndices,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMontageError(data.error || "Erreur lors de la création du montage.");
        return;
      }
      setShowMontageForm(false);
      setSelectingForMontage(false);
    } catch (error) {
      console.error("[ResultView] Montage request failed:", error);
      setMontageError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateDescription = async () => {
    setDescLoading(true);
    setDescError(null);
    try {
      const res = await fetch(`/api/project/${project.id}/description`, {
        method: "POST",
      });
      if (!res.ok) {
        setDescError("Erreur lors de la génération. Veuillez réessayer.");
        return;
      }
      const data = await res.json();
      if (!data.instagram || !data.tiktok) {
        setDescError("Réponse incomplète. Veuillez réessayer.");
        return;
      }
      setDescription(data);
    } catch (error) {
      console.error("[ResultView] Description generation failed:", error);
      setDescError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setDescLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

      {/* Empty state — pipeline failed to generate content */}
      {!hasAnyContent && !isRendering && !isRenderingMontage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-8 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">
              Aucun contenu généré
            </p>
            <p className="mt-1 text-xs text-muted max-w-sm">
              Le pipeline IA n&apos;a pas pu produire de résultat pour ce projet.
              Cela peut être dû à un problème temporaire avec nos services.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/new">
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Nouveau projet
              </Button>
            </a>
          </div>
        </motion.div>
      )}

      {/* Final video compilation */}
      {isRendering && (
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="h-10 w-10 text-icon-accent animate-spin" />
          <p className="text-sm text-muted">Compilation finale en cours...</p>
        </div>
      )}

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
              <p className="text-sm font-semibold">Compilation finale</p>
              <p className="text-xs text-muted">
                {project.rooms.length} pièces - {project.styleLabel}
              </p>
            </div>
            <a href={getVideoSrc(project.finalVideoUrl, project.id)} download>
              <Button size="md">
                <Download className="mr-2 h-4 w-4" />
                Télécharger
              </Button>
            </a>
          </div>
        </div>
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
                {project.montageConfig?.propertyInfo.title || "Présentation Premium"}
              </p>
              <p className="text-xs text-muted">
                {roomsWithVideo.length} pièces - Montage cinématique
              </p>
            </div>
            <a href={getVideoSrc(project.studioMontageUrl, project.id)} download>
              <Button size="md">
                <Download className="mr-2 h-4 w-4" />
                Télécharger
              </Button>
            </a>
          </div>
        </div>
      )}

      {/* Description Insta & TikTok */}
      {project.phase === "done" && !isRendering && !isRenderingMontage && (
        <div className="space-y-4">
          {!description ? (
            <div className="text-center">
              <Button
                size="lg"
                variant="secondary"
                onClick={handleGenerateDescription}
                disabled={descLoading}
              >
                {descLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-5 w-5" />
                )}
                {descLoading ? "Génération en cours..." : "Générer description Insta & TikTok"}
              </Button>
              {descError && (
                <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {descError}
                </p>
              )}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-surface overflow-hidden"
            >
              {/* Tabs */}
              <div className="flex border-b border-border">
                <button
                  onClick={() => setDescTab("instagram")}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
                    descTab === "instagram"
                      ? "border-b-2 border-accent-from text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Instagram
                </button>
                <button
                  onClick={() => setDescTab("tiktok")}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
                    descTab === "tiktok"
                      ? "border-b-2 border-accent-from text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  TikTok
                </button>
              </div>

              {/* Content */}
              <div className="p-4">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-feature-text">
                  {descTab === "instagram" ? description.instagram : description.tiktok}
                </pre>
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={handleGenerateDescription}
                    disabled={descLoading}
                    className="text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
                  >
                    {descLoading ? "Régénération..." : "Régénérer"}
                  </button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      handleCopy(
                        descTab === "instagram"
                          ? description.instagram
                          : description.tiktok
                      )
                    }
                  >
                    {copied ? (
                      <>
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                        Copié !
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        Copier
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Studio Montage CTA */}
      {canCreateMontage && !showMontageForm && !selectingForMontage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Button
            size="lg"
            onClick={() => {
              setSelectingForMontage(true);
              setSelectedRoomIndices(roomsWithVideo.map((r) => r.index));
            }}
          >
            <Clapperboard className="mr-2 h-5 w-5" />
            Créer un Studio Montage
          </Button>
          <p className="mt-2 text-xs text-muted">
            Sélectionnez et ordonnez les vidéos pour votre présentation
          </p>
        </motion.div>
      )}

      {/* Selection mode header */}
      {selectingForMontage && !showMontageForm && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-badge-gold-border bg-badge-gold-bg p-4 text-center space-y-3"
        >
          <div className="flex items-center justify-center gap-2">
            <Clapperboard className="h-5 w-5 text-icon-accent" />
            <span className="text-sm font-semibold">Sélection pour le montage</span>
          </div>
          <p className="text-xs text-muted">
            Cochez les vidéos à inclure et utilisez les flèches pour les réordonner.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectingForMontage(false)}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              disabled={selectedCount < 2}
              onClick={() => setShowMontageForm(true)}
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              Continuer ({selectedCount} vidéos)
            </Button>
          </div>
        </motion.div>
      )}

      {/* Montage error */}
      {montageError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{montageError}</p>
          <button
            onClick={() => setMontageError(null)}
            className="ml-auto text-xs text-red-400 hover:text-red-300 cursor-pointer"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Montage Form */}
      {showMontageForm && (
        <MontageForm
          onSubmit={handleMontageSubmit}
          onCancel={() => {
            setShowMontageForm(false);
            setSelectingForMontage(false);
          }}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Individual room videos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Vidéos par pièce</h3>
          {selectingForMontage && !showMontageForm && (
            <span className="text-xs text-muted">
              {selectedCount}/{roomsWithVideo.length} sélectionnées
            </span>
          )}
        </div>

        {selectingForMontage && !showMontageForm ? (
          /* Selection mode: ordered list */
          <div className="space-y-3">
            {/* Selected rooms in order */}
            {selectedRoomIndices.map((roomIndex, orderIdx) => {
              const room = project.rooms.find((r) => r.index === roomIndex);
              if (!room) return null;
              return (
                <motion.div
                  key={room.index}
                  layout
                  className="flex items-center gap-3 overflow-hidden rounded-2xl border-2 border-accent-from/40 bg-surface"
                >
                  <div className="relative w-36 shrink-0">
                    <video
                      src={room.videoUrl}
                      className="aspect-video w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  </div>
                  <div className="flex-1 min-w-0 py-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full gradient-gold text-xs font-bold text-zinc-900">
                        {orderIdx + 1}
                      </span>
                      <span className="text-sm font-medium truncate">{room.roomLabel}</span>
                    </div>
                    <span className="text-xs text-muted ml-8">{room.roomType}</span>
                  </div>
                  <div className="flex items-center gap-1 pr-3">
                    <button
                      onClick={() => moveRoomUp(room.index)}
                      disabled={orderIdx === 0}
                      aria-label="Monter dans l'ordre"
                      className="rounded-lg p-1.5 hover:bg-surface-hover disabled:opacity-30 transition-colors"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moveRoomDown(room.index)}
                      disabled={orderIdx === selectedRoomIndices.length - 1}
                      aria-label="Descendre dans l'ordre"
                      className="rounded-lg p-1.5 hover:bg-surface-hover disabled:opacity-30 transition-colors"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleRoom(room.index)}
                      className="rounded-lg p-1.5 hover:bg-surface-hover text-red-400 transition-colors"
                      aria-label="Retirer du montage"
                      title="Retirer"
                    >
                      <span className="text-xs font-medium">✕</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}

            {/* Unselected rooms */}
            {roomsWithVideo
              .filter((r) => !selectedRoomIndices.includes(r.index))
              .map((room) => (
                <motion.div
                  key={room.index}
                  layout
                  className="flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-surface/50 opacity-60 hover:opacity-80 transition-opacity cursor-pointer"
                  onClick={() => toggleRoom(room.index)}
                >
                  <div className="relative w-36 shrink-0">
                    <video
                      src={room.videoUrl}
                      className="aspect-video w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  </div>
                  <div className="flex-1 min-w-0 py-2">
                    <span className="text-sm font-medium truncate">{room.roomLabel}</span>
                    <p className="text-xs text-muted">{room.roomType}</p>
                  </div>
                  <div className="pr-3">
                    <span className="text-xs text-muted">+ Ajouter</span>
                  </div>
                </motion.div>
              ))}
          </div>
        ) : (
          /* Normal grid view */
          <div className="grid gap-4 sm:grid-cols-2">
            {roomsWithVideo.map((room) => (
              <div
                key={room.index}
                className="overflow-hidden rounded-2xl border border-border bg-surface"
              >
                <video
                  src={room.videoUrl}
                  className="aspect-video w-full"
                  controls
                  playsInline
                  preload="metadata"
                />
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-muted" />
                    <span className="text-sm font-medium">{room.roomLabel}</span>
                  </div>
                  <Badge variant="muted">{room.roomType}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
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
