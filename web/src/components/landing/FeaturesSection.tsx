"use client";

import { motion } from "framer-motion";
import { Camera, Wand2, Rocket, Shield, Eye, Clock, Building2, Users, Briefcase, TrendingUp } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.07 * i, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const FEATURES = [
  {
    icon: Camera,
    title: "1 bien = tout inclus",
    description:
      "Envoyez jusqu'à 6 photos par bien. Staging complet, vidéo et validation expert — tout est dans le prix.",
  },
  {
    icon: Wand2,
    title: "5 styles de décoration",
    description:
      "Scandinave, moderne, classique, industriel, bohème. Notre expert sélectionne le meilleur pour chaque pièce.",
  },
  {
    icon: Rocket,
    title: "Vidéos prêtes à publier",
    description:
      "Montages avant/après et vidéos de visite cinématiques. Idéal pour annonces, Instagram et TikTok.",
  },
  {
    icon: Shield,
    title: "Validé par un expert",
    description:
      "Chaque résultat est vérifié par notre équipe. Aucun risque de staging bancal envoyé à vos clients.",
  },
  {
    icon: Clock,
    title: "Livraison sous 24h",
    description:
      "Commandez le matin, recevez vos visuels le lendemain. Aucun allers-retours, aucun échange.",
  },
  {
    icon: Eye,
    title: "Projection immédiate",
    description:
      "Les acheteurs visualisent le potentiel de chaque pièce. Plus de visites qualifiées, moins de négociation.",
  },
];

const USE_CASES = [
  {
    icon: Building2,
    title: "Biens vides",
    description: "Valorisez une pièce sans mobilier avec un staging réaliste et élégant.",
  },
  {
    icon: Briefcase,
    title: "Biens à rénover",
    description: "Montrez le potentiel d'un bien à rénover sans réaliser les travaux.",
  },
  {
    icon: Users,
    title: "Logements meublés datés",
    description: "Remplacez le mobilier vieillissant par un décor contemporain.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6 lg:py-32 border-t border-border">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
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
            Vous envoyez vos photos brutes. Nous livrons une présentation complète du bien :
            images et vidéos prêtes pour vos annonces.
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              custom={i}
              variants={fadeUp}
              className="group relative rounded-2xl border border-border bg-surface/40 p-7 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-badge-gold-border/50 hover:bg-surface/70 hover:-translate-y-1 hover:shadow-lg hover:shadow-[rgba(196,122,90,0.06)]"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-badge-gold-bg border border-badge-gold-border/30 transition-transform duration-300 group-hover:scale-110">
                <feat.icon className="h-6 w-6 text-icon-accent" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold">{feat.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">{feat.description}</p>
            </motion.div>
          ))}
        </div>

        {/* For whom + use cases */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp}
          className="mt-20"
        >
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold sm:text-3xl">
              Pour qui ?
            </h3>
            <p className="mt-3 text-muted max-w-xl mx-auto">
              Agents immobiliers, mandataires, agences, marchands de biens — VIMIMO s&apos;adapte à tous les cas d&apos;usage.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {USE_CASES.map((uc, i) => (
              <motion.div
                key={uc.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="flex items-start gap-4 rounded-xl border border-border bg-surface/30 p-5 transition-all duration-300 hover:bg-surface/60"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-badge-blue-bg border border-badge-blue-border/30">
                  <uc.icon className="h-5 w-5 text-badge-blue-text" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold">{uc.title}</p>
                  <p className="mt-1 text-sm text-muted leading-relaxed">{uc.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Business benefit callout */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mt-14 mx-auto max-w-3xl rounded-2xl border border-badge-gold-border/30 bg-badge-gold-bg/30 p-8 text-center"
        >
          <TrendingUp className="mx-auto h-8 w-8 text-icon-accent mb-4" aria-hidden="true" />
          <p className="text-lg font-semibold">
            Vendez plus vite, négociez moins
          </p>
          <p className="mt-2 text-sm text-muted leading-relaxed max-w-lg mx-auto">
            Les biens avec staging virtuel se vendent 73% plus rapidement et génèrent 20% d&apos;offres en plus.
            Démarquez-vous sur les portails immobiliers avec des visuels qui attirent les contacts qualifiés.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
