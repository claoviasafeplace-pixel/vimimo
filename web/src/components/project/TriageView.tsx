"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  Copy,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import type { Project, ConfirmedPhoto, TriagePhoto } from "@/lib/types";

interface TriageViewProps {
  project: Project;
  onConfirm: (confirmedPhotos: ConfirmedPhoto[]) => void;
  isSubmitting: boolean;
}

export default function TriageView({ project, onConfirm, isSubmitting }: TriageViewProps) {
  const triagePhotos = project.triageResult?.photos || [];

  const [photos, setPhotos] = useState<TriagePhoto[]>(() => {
    return [...triagePhotos].sort((a, b) => a.order - b.order);
  });

  const [showExcluded, setShowExcluded] = useState(false);

  const included = useMemo(() => photos.filter((p) => p.included), [photos]);
  const excluded = useMemo(() => photos.filter((p) => !p.included), [photos]);

  const getPhotoUrl = (photoId: string) => {
    const photo = project.photos.find((p) => p.id === photoId);
    return photo?.cleanedUrl || photo?.originalUrl || "";
  };

  const moveUp = (photoId: string) => {
    setPhotos((prev) => {
      const inc = prev.filter((p) => p.included);
      const exc = prev.filter((p) => !p.included);
      const idx = inc.findIndex((p) => p.photoId === photoId);
      if (idx <= 0) return prev;
      [inc[idx - 1], inc[idx]] = [inc[idx], inc[idx - 1]];
      return [...inc.map((p, i) => ({ ...p, order: i + 1 })), ...exc];
    });
  };

  const moveDown = (photoId: string) => {
    setPhotos((prev) => {
      const inc = prev.filter((p) => p.included);
      const exc = prev.filter((p) => !p.included);
      const idx = inc.findIndex((p) => p.photoId === photoId);
      if (idx < 0 || idx >= inc.length - 1) return prev;
      [inc[idx], inc[idx + 1]] = [inc[idx + 1], inc[idx]];
      return [...inc.map((p, i) => ({ ...p, order: i + 1 })), ...exc];
    });
  };

  const toggleInclude = (photoId: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.photoId === photoId ? { ...p, included: !p.included } : p))
    );
  };

  const handleConfirm = () => {
    const confirmed: ConfirmedPhoto[] = included.map((p, i) => ({
      photoId: p.photoId,
      order: i + 1,
      included: true,
    }));
    onConfirm(confirmed);
  };

  const qualityIcon = (quality: string) => {
    switch (quality) {
      case "blurry":
        return <AlertTriangle className="h-3 w-3" />;
      case "duplicate":
        return <Copy className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const qualityLabel = (quality: string) => {
    switch (quality) {
      case "blurry":
        return "Floue";
      case "duplicate":
        return "Doublon";
      case "unusable":
        return "Inutilisable";
      default:
        return "Bonne";
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Ordre de visite</h2>
        <p className="mt-2 text-sm text-muted">
          L&apos;IA a trié vos photos. Réorganisez l&apos;ordre ou excluez des photos avant de lancer le staging.
        </p>
        {project.triageResult?.overallNotes && (
          <p className="mt-1 text-xs text-muted italic">
            {project.triageResult.overallNotes}
          </p>
        )}
      </div>

      {/* Included photos */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted">
          Photos incluses ({included.length})
        </h3>
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {included.map((photo, idx) => (
              <motion.div
                key={photo.photoId}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-badge-gold-bg text-xs font-bold text-badge-gold-text">
                  {idx + 1}
                </span>
                <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={getPhotoUrl(photo.photoId)}
                    alt={photo.roomLabel}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{photo.roomLabel}</p>
                  <Badge variant="muted">{photo.roomType}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveUp(photo.photoId)}
                    disabled={idx === 0}
                    className="rounded-lg p-1.5 hover:bg-surface-hover disabled:opacity-30 transition-colors"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveDown(photo.photoId)}
                    disabled={idx === included.length - 1}
                    className="rounded-lg p-1.5 hover:bg-surface-hover disabled:opacity-30 transition-colors"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toggleInclude(photo.photoId)}
                    className="rounded-lg p-1.5 hover:bg-surface-hover text-muted hover:text-red-400 transition-colors"
                    title="Exclure"
                  >
                    <EyeOff className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Excluded photos */}
      {excluded.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowExcluded(!showExcluded)}
            className="flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground transition-colors"
          >
            {showExcluded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            Photos exclues ({excluded.length})
          </button>
          <AnimatePresence>
            {showExcluded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {excluded.map((photo) => (
                  <div
                    key={photo.photoId}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface/50 p-3 opacity-60"
                  >
                    <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={getPhotoUrl(photo.photoId)}
                        alt={photo.roomLabel}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{photo.roomLabel}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {photo.quality !== "good" && (
                          <span className="inline-flex items-center gap-1 text-xs text-red-400">
                            {qualityIcon(photo.quality)}
                            {qualityLabel(photo.quality)}
                          </span>
                        )}
                        {photo.reason && (
                          <span className="text-xs text-muted">{photo.reason}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleInclude(photo.photoId)}
                      className="rounded-lg p-1.5 hover:bg-surface-hover text-muted hover:text-green-400 transition-colors"
                      title="Réinclure"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Confirm button */}
      <div className="sticky bottom-4 flex justify-center pt-4">
        <Button
          onClick={handleConfirm}
          disabled={included.length < 2 || isSubmitting}
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Lancement...
            </>
          ) : (
            <>
              <Check className="mr-2 h-5 w-5" />
              Confirmer l&apos;ordre ({included.length} photos)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
