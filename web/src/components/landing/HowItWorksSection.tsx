"use client";

import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const STEPS = [
  {
    step: "01",
    title: "Uploadez vos photos",
    description:
      "Photographiez les pièces vides avec votre smartphone. Jusqu'à 6 photos par bien, choisissez votre style.",
  },
  {
    step: "02",
    title: "L'IA décore et filme",
    description:
      "Notre IA analyse chaque pièce, génère 5 options de décoration et compile une vidéo de visite cinématique.",
  },
  {
    step: "03",
    title: "Un expert valide",
    description:
      "Notre équipe vérifie chaque résultat et sélectionne la meilleure option. Qualité garantie.",
  },
  {
    step: "04",
    title: "Livraison sous 24h",
    description:
      "Vous recevez vos photos stagées et votre vidéo par email. Prêt à publier.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how" className="py-24 px-6 lg:py-32 border-t border-border/50">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="mx-auto max-w-3xl text-center mb-16"
        >
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-badge-gold-border bg-badge-gold-bg px-3 py-1 text-xs font-medium tracking-wide text-badge-gold-text uppercase">
            4 étapes
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Comment ça <span className="text-gradient-gold">marche</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            Du smartphone à l&apos;annonce en 24h. Aucun logiciel, aucune compétence technique requise.
          </p>
        </motion.div>

        <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="absolute top-12 left-[12.5%] right-[12.5%] hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />

          {STEPS.map((step, i) => (
            <motion.div
              key={step.step}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              custom={i}
              variants={fadeUp}
              className="relative text-center"
            >
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl gradient-gold text-xl font-bold text-zinc-900 shadow-lg shadow-amber-900/20">
                {step.step}
              </div>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
