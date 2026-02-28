"use client";

import { motion } from "framer-motion";
import { Camera, Wand2, Rocket, Zap, Shield, UserCheck } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const FEATURES = [
  {
    icon: Camera,
    title: "1 Bien = tout inclus",
    description:
      "Importez jusqu'à 6 photos de pièces vides. Staging complet, vidéo cinématique et validation expert — tout est compris.",
  },
  {
    icon: Wand2,
    title: "5 décors par pièce",
    description:
      "Scandinave, moderne, classique, industriel, bohème. Le meilleur décor est sélectionné par notre expert.",
  },
  {
    icon: Rocket,
    title: "Vidéo cinématique",
    description:
      "Un montage avant/après professionnel prêt à publier sur vos annonces et réseaux sociaux.",
  },
  {
    icon: UserCheck,
    title: "Un expert valide le résultat",
    description:
      "Chaque staging est vérifié par notre équipe. Vous ne recevez que des résultats impeccables.",
  },
  {
    icon: Zap,
    title: "Livraison sous 24h",
    description:
      "Commandez maintenant, recevez vos visuels demain. Aucun échange, aucun allers-retours.",
  },
  {
    icon: Shield,
    title: "Projection immédiate",
    description:
      "Les acheteurs visualisent le potentiel de chaque pièce. Résultat : plus de visites, moins de négociation.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6 lg:py-32 border-t border-border/50">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="mx-auto max-w-3xl text-center mb-16"
        >
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-badge-gold-border bg-badge-gold-bg px-3 py-1 text-xs font-medium tracking-wide text-badge-gold-text uppercase">
            Fonctionnalités
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Un service <span className="text-gradient-gold">clé en main</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            Vous commandez, nous livrons. Staging IA + validation humaine pour un résultat premium garanti.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              custom={i}
              variants={fadeUp}
              className="group relative rounded-2xl border border-border/60 bg-surface/40 p-7 backdrop-blur-sm transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-badge-gold-border/40 hover:bg-surface/70"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-badge-gold-bg border border-badge-gold-border/30">
                <feat.icon className="h-6 w-6 text-icon-accent" />
              </div>
              <h3 className="text-lg font-semibold">{feat.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">{feat.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
