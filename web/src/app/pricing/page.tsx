"use client";

import { ArrowLeft, Sparkles, Camera, Wand2, Film, MessageSquare } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import AuthButton from "@/components/auth/AuthButton";
import ThemeToggle from "@/components/ui/ThemeToggle";
import PricingGrid from "@/components/pricing/PricingGrid";

const INCLUDED = [
  {
    icon: Camera,
    label: "Nettoyage IA de la photo",
    detail: "L'IA supprime les meubles existants automatiquement",
  },
  {
    icon: Wand2,
    label: "5 options de staging",
    detail: "Scandinave, moderne, classique, industriel, bohème",
  },
  {
    icon: Film,
    label: "Vidéo cinématique",
    detail: "Montage avant/après prêt à publier",
  },
  {
    icon: MessageSquare,
    label: "Descriptions réseaux",
    detail: "Textes optimisés Instagram & TikTok",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.1 * i, ease: [0.21, 0.47, 0.32, 0.98] as const },
  }),
};

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-gold">
              <Sparkles className="h-3.5 w-3.5 text-zinc-900" />
            </div>
            <span className="text-xl font-bold text-gradient-gold">VIMIMO</span>
          </a>
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
          <ArrowLeft className="h-4 w-4" />
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
            1 Bien = <span className="text-gradient-gold">tout inclus</span>
          </h1>
          <p className="mt-3 text-muted max-w-lg mx-auto">
            Chaque crédit vous donne accès au pipeline complet pour un bien immobilier.
          </p>
        </motion.div>

        {/* What's included — animated cards */}
        <div className="mb-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {INCLUDED.map((item, i) => (
            <motion.div
              key={item.label}
              initial="hidden"
              animate="visible"
              custom={i}
              variants={fadeUp}
              className="group rounded-xl border border-border/60 bg-surface/40 p-4 text-center backdrop-blur-sm transition-all duration-300 hover:border-badge-gold-border/40 hover:bg-surface/70"
            >
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-badge-gold-bg border border-badge-gold-border/30 transition-transform duration-300 group-hover:scale-110">
                <item.icon className="h-5 w-5 text-icon-accent" />
              </div>
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="mt-1 text-xs text-muted leading-relaxed">{item.detail}</p>
            </motion.div>
          ))}
        </div>

        {/* Pricing Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <PricingGrid />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 text-center text-xs text-muted"
        >
          Prix affichés HT. TVA 20% appliquée au paiement. Paiement sécurisé par Stripe. Annulez à tout moment.
        </motion.p>
      </main>
    </div>
  );
}
