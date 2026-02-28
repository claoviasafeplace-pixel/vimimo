"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const TESTIMONIALS = [
  {
    name: "Sophie M.",
    role: "Agent immobilier, Lyon",
    quote:
      "J'uploade mes photos le matin, je reçois tout le lendemain. La qualité est irréprochable grâce à la validation par un expert.",
    stars: 5,
  },
  {
    name: "Thomas D.",
    role: "Agent indépendant, Paris",
    quote:
      "Avant je passais des heures sur le staging. Maintenant je commande et je reçois un résultat premium sans effort.",
    stars: 5,
  },
  {
    name: "Claire B.",
    role: "Directrice d'agence, Bordeaux",
    quote:
      "Le fait qu'un expert valide chaque résultat change tout. Aucun risque de staging bancal envoyé aux clients.",
    stars: 5,
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-24 px-6 lg:py-32 border-t border-border/50 bg-surface/20">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="mx-auto max-w-3xl text-center mb-16"
        >
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-badge-gold-border bg-badge-gold-bg px-3 py-1 text-xs font-medium tracking-wide text-badge-gold-text uppercase">
            Témoignages
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Ils nous font <span className="text-gradient-gold">confiance</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            Ce que disent les professionnels de l&apos;immobilier qui utilisent VIMIMO.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              custom={i}
              variants={fadeUp}
              className="rounded-2xl border border-border/60 bg-surface/40 p-7 backdrop-blur-sm"
            >
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-feature-text italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-gold text-sm font-bold text-zinc-900">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
