"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Check, Loader2, User, Building2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { B2C_PACKS, B2B_PACKS, type CreditPack } from "@/lib/types";

type Tab = "b2c" | "b2b";

function PackCard({
  pack,
  onBuy,
}: {
  pack: CreditPack;
  onBuy: (packId: string) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onBuy(pack.id);
    } finally {
      setLoading(false);
    }
  };

  const pricePerCredit = (pack.priceEur / pack.credits).toFixed(0);
  const priceTTC = (pack.priceEur * 1.2).toFixed(0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={`glass relative flex flex-col rounded-2xl p-6 transition-all duration-500 ${
        pack.popular
          ? "ring-2 ring-accent-from/50 shadow-lg shadow-amber-900/10"
          : ""
      }`}
    >
      {pack.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full gradient-gold px-4 py-1 text-xs font-semibold text-zinc-900 whitespace-nowrap">
            Le plus populaire
          </span>
        </div>
      )}

      <div className="mb-5">
        <h3 className="text-lg font-bold">{pack.name}</h3>
        <p className="mt-1 text-sm text-muted">
          {pack.credits} bien{pack.credits > 1 ? "s" : ""} immobilier{pack.credits > 1 ? "s" : ""}
        </p>
        <p className="mt-1.5 text-xs text-badge-gold-text font-medium">
          {pack.tagline}
        </p>
      </div>

      <div className="mb-5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-bold">{pack.priceEur}€</span>
          <span className="text-sm font-medium text-muted">HT</span>
        </div>
        <p className="mt-1 text-xs text-muted">
          soit {priceTTC}€ TTC — {pricePerCredit}€ HT / bien
        </p>
      </div>

      <ul className="mb-8 flex-1 space-y-2.5">
        <li className="flex items-center gap-2 text-sm text-feature-text">
          <Check className="h-4 w-4 text-icon-accent shrink-0" />
          Staging IA complet
        </li>
        <li className="flex items-center gap-2 text-sm text-feature-text">
          <Check className="h-4 w-4 text-icon-accent shrink-0" />
          5 options / pièce
        </li>
        <li className="flex items-center gap-2 text-sm text-feature-text">
          <Check className="h-4 w-4 text-icon-accent shrink-0" />
          Vidéo cinématique
        </li>
        <li className="flex items-center gap-2 text-sm text-feature-text">
          <Check className="h-4 w-4 text-icon-accent shrink-0" />
          Expert qualité
        </li>
      </ul>

      <Button
        onClick={handleClick}
        disabled={loading}
        variant={pack.popular ? "primary" : "secondary"}
        size="lg"
        className="w-full"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Choisir ce pack
      </Button>
    </motion.div>
  );
}

export default function PricingTiers() {
  const [tab, setTab] = useState<Tab>("b2c");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleCheckout = async (packId: string) => {
    setCheckoutError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCheckoutError(
          data.error ||
            "Erreur lors de la création du paiement. Veuillez réessayer."
        );
        return;
      }

      const { url } = data;
      if (url) window.location.href = url;
    } catch (error) {
      console.error("[PricingTiers] Checkout request failed:", error);
      setCheckoutError("Erreur réseau. Vérifiez votre connexion.");
    }
  };

  const packs = tab === "b2c" ? B2C_PACKS : B2B_PACKS;

  return (
    <div>
      {checkoutError && (
        <div className="mb-6 flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{checkoutError}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-10 flex justify-center">
        <div className="inline-flex rounded-xl border border-border bg-surface p-1">
          <button
            onClick={() => setTab("b2c")}
            className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
              tab === "b2c"
                ? "gradient-gold text-zinc-900"
                : "text-muted hover:text-foreground"
            }`}
          >
            <User className="h-4 w-4" />
            Particulier
          </button>
          <button
            onClick={() => setTab("b2b")}
            className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
              tab === "b2b"
                ? "gradient-gold text-zinc-900"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Building2 className="h-4 w-4" />
            Professionnel
          </button>
        </div>
      </div>

      {/* Cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
          className={`grid gap-6 mx-auto ${
            tab === "b2c"
              ? "max-w-2xl grid-cols-1 sm:grid-cols-2"
              : "max-w-4xl grid-cols-1 sm:grid-cols-3"
          }`}
        >
          {packs.map((pack) => (
            <PackCard key={pack.id} pack={pack} onBuy={handleCheckout} />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
