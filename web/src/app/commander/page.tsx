"use client";

import { Sparkles, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useOrderTunnel } from "@/hooks/useOrderTunnel";
import StepIndicator from "@/components/order/StepIndicator";
import AmbianceSelector from "@/components/order/AmbianceSelector";
import OrderRecap from "@/components/order/OrderRecap";
import OrderSuccess from "@/components/order/OrderSuccess";
import DropZone from "@/components/upload/DropZone";
import PhotoGrid from "@/components/upload/PhotoGrid";
import StyleSelector from "@/components/upload/StyleSelector";
import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/ui/ThemeToggle";
import AuthButton from "@/components/auth/AuthButton";
import { B2C_PACKS, B2B_PACKS, type CreditPack } from "@/lib/types";

function PackSelector({
  selectedPackId,
  onSelect,
}: {
  selectedPackId: string | null;
  onSelect: (id: string) => void;
}) {
  const renderPack = (pack: CreditPack, i: number) => {
    const isSelected = selectedPackId === pack.id;
    return (
      <motion.button
        key={pack.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 * i }}
        onClick={() => onSelect(pack.id)}
        className={`relative flex flex-col rounded-xl border p-4 text-left transition-all cursor-pointer ${
          isSelected
            ? "border-accent-from bg-badge-gold-bg shadow-lg shadow-amber-900/10"
            : "border-border bg-surface hover:border-muted"
        }`}
      >
        {pack.popular && (
          <span className="absolute -top-2.5 right-3 rounded-full gradient-gold px-2.5 py-0.5 text-[10px] font-bold text-zinc-900 uppercase">
            Populaire
          </span>
        )}
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold">{pack.name}</span>
          <span className="text-lg font-bold text-gradient-gold">
            {pack.priceEur} €
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          {pack.tagline} —{" "}
          {(pack.priceEur / pack.credits).toFixed(0)} €/bien HT
        </p>
      </motion.button>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-muted mb-3">Particulier</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {B2C_PACKS.map((pack, i) => renderPack(pack, i))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium text-muted mb-3">Professionnel</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {B2B_PACKS.map((pack, i) => renderPack(pack, i + B2C_PACKS.length))}
        </div>
      </div>
    </div>
  );
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? 80 : -80, opacity: 0 }),
};

export default function CommanderPage() {
  const tunnel = useOrderTunnel();
  const stepOrder = ["upload", "preferences", "payment", "confirmation"] as const;
  const currentIdx = stepOrder.indexOf(tunnel.step);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-gold">
              <Sparkles className="h-3.5 w-3.5 text-zinc-900" />
            </div>
            <span className="text-xl font-bold text-gradient-gold">VIMIMO</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <AuthButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="sr-only">Commander un staging virtuel</h1>

        {/* Step indicator */}
        <div className="mb-10">
          <StepIndicator current={tunnel.step} />
        </div>

        {/* Error */}
        {tunnel.error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {tunnel.error}
          </motion.div>
        )}

        {/* Steps content */}
        <AnimatePresence mode="wait" custom={1}>
          {tunnel.step === "upload" && (
            <motion.div
              key="upload"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold sm:text-3xl">
                  Vos photos de <span className="text-gradient-gold">pièces vides</span>
                </h2>
                <p className="mt-2 text-muted">
                  Importez jusqu&apos;à 6 photos d&apos;un même bien immobilier
                </p>
              </div>

              <DropZone
                onFiles={tunnel.addFiles}
                disabled={tunnel.isUploading}
                maxPhotos={tunnel.maxPhotos}
              />

              {tunnel.photos.length > 0 && (
                <PhotoGrid
                  photos={tunnel.photos}
                  onRemove={tunnel.removePhoto}
                />
              )}
            </motion.div>
          )}

          {tunnel.step === "preferences" && (
            <motion.div
              key="preferences"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold sm:text-3xl">
                  Vos <span className="text-gradient-gold">préférences</span>
                </h2>
                <p className="mt-2 text-muted">
                  Choisissez le style et l&apos;ambiance pour votre staging
                </p>
              </div>

              <StyleSelector
                selected={tunnel.style}
                onSelect={tunnel.setStyle}
              />

              <AmbianceSelector
                selected={tunnel.ambiance}
                onSelect={tunnel.setAmbiance}
              />
            </motion.div>
          )}

          {tunnel.step === "payment" && (
            <motion.div
              key="payment"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold sm:text-3xl">
                  Choisissez votre <span className="text-gradient-gold">pack</span>
                </h2>
                <p className="mt-2 text-muted">
                  Sélectionnez le nombre de biens à traiter
                </p>
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                <PackSelector
                  selectedPackId={tunnel.selectedPackId}
                  onSelect={tunnel.setSelectedPackId}
                />

                <OrderRecap
                  photoCount={tunnel.photos.length}
                  style={tunnel.style}
                  ambiance={tunnel.ambiance}
                  selectedPackId={tunnel.selectedPackId}
                  isLoading={tunnel.isUploading}
                  uploadProgress={tunnel.uploadProgress}
                  onSubmit={tunnel.submitOrder}
                />
              </div>
            </motion.div>
          )}

          {tunnel.step === "confirmation" && (
            <motion.div
              key="confirmation"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="py-12"
            >
              <OrderSuccess />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation buttons */}
        {tunnel.step !== "confirmation" && tunnel.step !== "payment" && (
          <div className="mt-10 flex items-center justify-between">
            <div>
              {currentIdx > 0 && (
                <Button variant="ghost" onClick={tunnel.prevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour
                </Button>
              )}
            </div>
            <Button
              variant="primary"
              onClick={tunnel.nextStep}
              disabled={!tunnel.canGoNext()}
            >
              Continuer
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
