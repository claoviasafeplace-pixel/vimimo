"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Camera,
  Wand2,
  Film,
  ShieldCheck,
  Check,
  User,
  Building2,
  ArrowRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import AuthButton from "@/components/auth/AuthButton";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { B2C_PACKS, B2B_PACKS, type CreditPack } from "@/lib/types";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.1 * i, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const INCLUDED = [
  {
    icon: Camera,
    label: "Staging IA complet",
    detail: "Chaque pièce meublée et décorée par IA",
  },
  {
    icon: Wand2,
    label: "5 styles au choix",
    detail: "Scandinave, moderne, classique, industriel, bohème",
  },
  {
    icon: Film,
    label: "Vidéo avant/après",
    detail: "Montage cinématique prêt à publier",
  },
  {
    icon: ShieldCheck,
    label: "Validation expert",
    detail: "Un expert vérifie chaque résultat",
  },
];

type Tab = "packs" | "abonnements";

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

  const perBien = Math.round(pack.priceEur / pack.credits);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as const }}
      className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-lg ${
        pack.popular
          ? "border-accent-from/40 bg-badge-gold-bg/20 shadow-lg shadow-[rgba(196,122,90,0.08)]"
          : "border-border bg-surface/40 hover:shadow-[rgba(28,25,23,0.06)]"
      }`}
    >
      {pack.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full gradient-gold px-4 py-1 text-xs font-semibold text-white whitespace-nowrap">
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
          soit {perBien}€ HT / bien
        </p>
      </div>

      <ul className="mb-8 flex-1 space-y-2.5">
        <li className="flex items-center gap-2 text-sm text-feature-text">
          <Check className="h-4 w-4 text-icon-accent shrink-0" aria-hidden="true" />
          Staging IA complet
        </li>
        <li className="flex items-center gap-2 text-sm text-feature-text">
          <Check className="h-4 w-4 text-icon-accent shrink-0" aria-hidden="true" />
          5 styles par pièce
        </li>
        <li className="flex items-center gap-2 text-sm text-feature-text">
          <Check className="h-4 w-4 text-icon-accent shrink-0" aria-hidden="true" />
          Vidéo avant/après
        </li>
        <li className="flex items-center gap-2 text-sm text-feature-text">
          <Check className="h-4 w-4 text-icon-accent shrink-0" aria-hidden="true" />
          Validation expert
        </li>
      </ul>

      <button
        onClick={handleClick}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
          pack.popular
            ? "gradient-gold text-white shadow-lg shadow-[rgba(196,122,90,0.15)] hover:shadow-[0_0_20px_rgba(196,122,90,0.25)] hover:scale-[1.02]"
            : "bg-surface border border-border text-foreground hover:bg-surface-hover"
        }`}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Choisir ce pack
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </motion.div>
  );
}

export default function PricingPage() {
  const [tab, setTab] = useState<Tab>("packs");
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
      console.error("[PricingPage] Checkout request failed:", error);
      setCheckoutError("Erreur réseau. Vérifiez votre connexion.");
    }
  };

  const packs = tab === "packs" ? B2C_PACKS : B2B_PACKS;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo-vimimo.png"
              alt="VIMIMO"
              width={120}
              height={32}
              className="h-8 w-auto"
              priority
            />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <AuthButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour
        </Link>

        {/* Hero */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mb-12 text-center"
        >
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-badge-gold-border bg-badge-gold-bg px-3 py-1 text-xs font-medium tracking-wide text-badge-gold-text uppercase">
            Tarifs transparents
          </span>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
            Un tarif par bien,{" "}
            <span className="text-gradient-gold">tout compris</span>
          </h1>
          <p className="mt-3 text-muted max-w-xl mx-auto">
            1 bien = staging IA complet + vidéo + validation expert. Choisissez le format adapté à votre activité.
          </p>
        </motion.div>

        {/* What's included */}
        <div className="mb-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {INCLUDED.map((item, i) => (
            <motion.div
              key={item.label}
              initial="hidden"
              animate="visible"
              custom={i}
              variants={fadeUp}
              className="group rounded-xl border border-border bg-surface/40 p-4 text-center transition-all duration-300 hover:border-badge-gold-border/40 hover:bg-surface/70"
            >
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-badge-gold-bg border border-badge-gold-border/30 transition-transform duration-300 group-hover:scale-110">
                <item.icon className="h-5 w-5 text-icon-accent" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="mt-1 text-xs text-muted leading-relaxed">{item.detail}</p>
            </motion.div>
          ))}
        </div>

        {checkoutError && (
          <div className="mb-6 flex items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-50 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" aria-hidden="true" />
            <p className="text-sm text-red-600">{checkoutError}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-10 flex justify-center">
          <div className="inline-flex rounded-xl border border-border bg-surface p-1">
            <button
              onClick={() => setTab("packs")}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                tab === "packs"
                  ? "gradient-gold text-white shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <User className="h-4 w-4" aria-hidden="true" />
              Packs par bien
            </button>
            <button
              onClick={() => setTab("abonnements")}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                tab === "abonnements"
                  ? "gradient-gold text-white shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Building2 className="h-4 w-4" aria-hidden="true" />
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
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
            className={`grid gap-6 mx-auto ${
              tab === "packs"
                ? "max-w-2xl grid-cols-1 sm:grid-cols-2"
                : "max-w-4xl grid-cols-1 sm:grid-cols-3"
            }`}
          >
            {packs.map((pack) => (
              <PackCard key={pack.id} pack={pack} onBuy={handleCheckout} />
            ))}
          </motion.div>
        </AnimatePresence>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 text-center text-xs text-muted"
        >
          Prix affichés HT. TVA 20% appliquée au paiement. Paiement sécurisé par Stripe. Sans engagement.
        </motion.p>
      </main>
    </div>
  );
}
