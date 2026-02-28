"use client";

import { motion } from "framer-motion";
import { ImageIcon, Palette, Sparkles, ArrowRight } from "lucide-react";
import { STYLES, CREDIT_PACKS, type Style, type Ambiance } from "@/lib/types";
import Button from "@/components/ui/Button";

interface OrderRecapProps {
  photoCount: number;
  style: Style | null;
  ambiance: Ambiance;
  selectedPackId: string | null;
  isLoading: boolean;
  uploadProgress: number;
  onSubmit: () => void;
}

export default function OrderRecap({
  photoCount,
  style,
  ambiance,
  selectedPackId,
  isLoading,
  uploadProgress,
  onSubmit,
}: OrderRecapProps) {
  const pack = CREDIT_PACKS.find((p) => p.id === selectedPackId);
  const styleLabel =
    STYLES.find((s) => s.id === style)?.label || "Non sélectionné";

  const ambianceLabels: Record<Ambiance, string> = {
    jour: "Jour",
    nuit: "Nuit",
    neige: "Neige",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <h3 className="text-lg font-semibold">Récapitulatif</h3>

      <div className="rounded-2xl border border-border/60 bg-surface/40 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-badge-gold-bg border border-badge-gold-border/30">
            <ImageIcon className="h-5 w-5 text-icon-accent" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {photoCount} photo{photoCount > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted">
              Jusqu&apos;à {photoCount} pièce{photoCount > 1 ? "s" : ""}{" "}
              meublée{photoCount > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-badge-gold-bg border border-badge-gold-border/30">
            <Palette className="h-5 w-5 text-icon-accent" />
          </div>
          <div>
            <p className="text-sm font-medium">{styleLabel}</p>
            <p className="text-xs text-muted">
              Ambiance {ambianceLabels[ambiance]}
            </p>
          </div>
        </div>

        {pack && (
          <>
            <div className="border-t border-border/40 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">
                  Pack {pack.name}
                </span>
                <span className="text-lg font-bold text-gradient-gold">
                  {pack.priceEur} € HT
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {(pack.priceEur * 1.2).toFixed(0)} € TTC —{" "}
                {(pack.priceEur / pack.credits).toFixed(0)} €/bien
              </p>
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-badge-gold-border/30 bg-badge-gold-bg/20 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-icon-accent mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Service premium</p>
            <p className="text-xs text-muted mt-1">
              Un expert valide chaque résultat avant livraison. Recevez vos
              visuels sous 24h.
            </p>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-surface overflow-hidden">
            <motion.div
              className="h-full gradient-gold rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs text-muted text-center">
            {uploadProgress < 80
              ? "Upload des photos..."
              : uploadProgress < 100
                ? "Création de la commande..."
                : "Redirection vers le paiement..."}
          </p>
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={onSubmit}
        disabled={isLoading || !pack}
      >
        {isLoading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
        ) : (
          <>
            <Sparkles className="mr-2 h-5 w-5" />
            Payer {pack ? `${pack.priceEur} € HT` : ""}
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </motion.div>
  );
}
