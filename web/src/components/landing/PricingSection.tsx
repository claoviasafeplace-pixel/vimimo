"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, User, Building2, ArrowRight } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

type Tab = "packs" | "abonnements";

const PACKS = [
  {
    name: "Découverte",
    biens: 1,
    price: 19,
    perBien: 19,
    tagline: "Testez le service complet",
    target: "Propriétaire ou agent qui veut essayer",
    popular: false,
  },
  {
    name: "Essentiel",
    biens: 3,
    price: 49,
    perBien: 16,
    tagline: "Le plus demandé",
    target: "Agent avec quelques mandats à valoriser",
    popular: true,
  },
  {
    name: "Performance",
    biens: 5,
    price: 79,
    perBien: 16,
    tagline: "Meilleur rapport qualité-prix",
    target: "Agent actif avec un portefeuille régulier",
    popular: false,
  },
];

const SUBSCRIPTIONS = [
  {
    name: "Starter",
    biensPerMonth: 5,
    price: 49,
    perBien: 10,
    tagline: "Pour démarrer sereinement",
    target: "Mandataire indépendant",
    features: ["5 biens / mois", "Staging IA + vidéo", "Validation expert", "Support email"],
    popular: false,
  },
  {
    name: "Pro",
    biensPerMonth: 10,
    price: 79,
    perBien: 8,
    tagline: "Le choix des agences",
    target: "Petite agence (2-5 agents)",
    features: ["10 biens / mois", "Staging IA + vidéo", "Validation expert", "Support prioritaire", "Biens supplémentaires à 8€"],
    popular: true,
  },
  {
    name: "Agency",
    biensPerMonth: 25,
    price: 149,
    perBien: 6,
    tagline: "Volume et performance",
    target: "Agence ou réseau (5+ agents)",
    features: ["25 biens / mois", "Staging IA + vidéo", "Validation expert", "Account manager dédié", "Biens supplémentaires à 6€"],
    popular: false,
  },
];

const INCLUDED_FEATURES = [
  "Staging IA complet de chaque pièce",
  "5 styles de décoration au choix",
  "Vidéo avant/après cinématique",
  "Validation par un expert qualité",
  "Livraison sous 24h par email",
  "Format haute résolution",
];

export default function PricingSection() {
  const [tab, setTab] = useState<Tab>("packs");

  return (
    <section id="pricing" className="py-24 px-6 lg:py-32 border-t border-border">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="mx-auto max-w-3xl text-center mb-10"
        >
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-badge-gold-border bg-badge-gold-bg px-3 py-1 text-xs font-medium tracking-wide text-badge-gold-text uppercase">
            Tarifs
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Un tarif par bien,{" "}
            <span className="text-gradient-gold">tout compris</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            1 bien = staging complet + vidéo + validation expert.
            Choisissez le format qui correspond à votre activité.
          </p>
        </motion.div>

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
              Abonnements agence
            </button>
          </div>
        </div>

        {/* Cards */}
        <AnimatePresence mode="wait">
          {tab === "packs" ? (
            <motion.div
              key="packs"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
              className="grid gap-6 mx-auto max-w-4xl sm:grid-cols-3"
            >
              {PACKS.map((pack, i) => (
                <motion.div
                  key={pack.name}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                  variants={fadeUp}
                  className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-lg ${
                    pack.popular
                      ? "border-accent-from/40 bg-badge-gold-bg/20 shadow-lg shadow-[rgba(196,122,90,0.08)]"
                      : "border-border bg-surface/40 hover:shadow-[rgba(28,25,23,0.06)]"
                  }`}
                >
                  {pack.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="rounded-full gradient-gold px-4 py-1 text-xs font-semibold text-white whitespace-nowrap">
                        Le plus demandé
                      </span>
                    </div>
                  )}

                  <div className="mb-5">
                    <h3 className="text-lg font-bold">{pack.name}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {pack.biens} bien{pack.biens > 1 ? "s" : ""} immobilier{pack.biens > 1 ? "s" : ""}
                    </p>
                    <p className="mt-1.5 text-xs text-badge-gold-text font-medium">{pack.target}</p>
                  </div>

                  <div className="mb-5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-bold">{pack.price}€</span>
                      <span className="text-sm font-medium text-muted">HT</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      soit {pack.perBien}€ HT / bien
                    </p>
                  </div>

                  <ul className="mb-8 flex-1 space-y-2.5">
                    {INCLUDED_FEATURES.slice(0, 4).map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-feature-text">
                        <Check className="h-4 w-4 text-icon-accent shrink-0" aria-hidden="true" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/commander"
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-300 ${
                      pack.popular
                        ? "gradient-gold text-white shadow-lg shadow-[rgba(196,122,90,0.15)] hover:shadow-[0_0_20px_rgba(196,122,90,0.25)] hover:scale-[1.02]"
                        : "bg-surface border border-border text-foreground hover:bg-surface-hover"
                    }`}
                  >
                    Choisir ce pack
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="abonnements"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
              className="grid gap-6 mx-auto max-w-4xl sm:grid-cols-3"
            >
              {SUBSCRIPTIONS.map((sub, i) => (
                <motion.div
                  key={sub.name}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                  variants={fadeUp}
                  className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-lg ${
                    sub.popular
                      ? "border-accent-from/40 bg-badge-gold-bg/20 shadow-lg shadow-[rgba(196,122,90,0.08)]"
                      : "border-border bg-surface/40 hover:shadow-[rgba(28,25,23,0.06)]"
                  }`}
                >
                  {sub.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="rounded-full gradient-gold px-4 py-1 text-xs font-semibold text-white whitespace-nowrap">
                        Le plus utilisé
                      </span>
                    </div>
                  )}

                  <div className="mb-5">
                    <h3 className="text-lg font-bold">{sub.name}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {sub.biensPerMonth} biens / mois
                    </p>
                    <p className="mt-1.5 text-xs text-badge-gold-text font-medium">{sub.target}</p>
                  </div>

                  <div className="mb-5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-bold">{sub.price}€</span>
                      <span className="text-sm font-medium text-muted">HT / mois</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      soit {sub.perBien}€ HT / bien
                    </p>
                  </div>

                  <ul className="mb-8 flex-1 space-y-2.5">
                    {sub.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-feature-text">
                        <Check className="h-4 w-4 text-icon-accent shrink-0" aria-hidden="true" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/pricing"
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-300 ${
                      sub.popular
                        ? "gradient-gold text-white shadow-lg shadow-[rgba(196,122,90,0.15)] hover:shadow-[0_0_20px_rgba(196,122,90,0.25)] hover:scale-[1.02]"
                        : "bg-surface border border-border text-foreground hover:bg-surface-hover"
                    }`}
                  >
                    S&apos;abonner
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* What's included */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mt-14 rounded-2xl border border-border bg-surface/30 p-8"
        >
          <h3 className="text-center text-lg font-bold mb-6">
            Inclus dans chaque bien traité
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {INCLUDED_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-feature-text">
                <Check className="h-4 w-4 text-icon-accent shrink-0" aria-hidden="true" />
                {f}
              </div>
            ))}
          </div>
        </motion.div>

        <p className="mt-8 text-center text-xs text-muted">
          Prix affichés HT. TVA 20% appliquée au paiement. Paiement sécurisé par Stripe. Sans engagement.
        </p>
      </div>
    </section>
  );
}
