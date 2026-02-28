"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const FAQS = [
  {
    q: "Que comprend exactement le traitement d'un bien ?",
    a: "1 bien = jusqu'à 6 pièces d'un même bien immobilier. Notre IA génère 5 options de décoration par pièce. Un expert sélectionne la meilleure option et vous recevez les photos stagées + une vidéo avant/après.",
  },
  {
    q: "Combien de temps pour recevoir mes visuels ?",
    a: "Livraison sous 24h. Notre IA travaille en quelques minutes, puis un expert vérifie et valide chaque résultat avant de vous le livrer par email.",
  },
  {
    q: "Puis-je choisir le style de décoration ?",
    a: "Oui. Vous choisissez parmi 5 styles (Scandinave, Moderne, Classique, Industriel, Bohème) lors de votre commande. Notre expert sélectionne ensuite la meilleure option pour chaque pièce.",
  },
  {
    q: "Qui est l'expert qui valide les résultats ?",
    a: "Notre équipe interne de spécialistes en home staging vérifie la qualité de chaque résultat : cohérence du mobilier, perspective, éclairage. Vous ne recevez que des résultats impeccables.",
  },
  {
    q: "Puis-je utiliser les images dans mes annonces ?",
    a: "Absolument. Tous les visuels livrés vous appartiennent et peuvent être utilisés librement dans vos annonces immobilières, sur les portails et sur les réseaux sociaux.",
  },
  {
    q: "Quels formats de fichiers sont livrés ?",
    a: "Photos en haute résolution (JPEG), vidéos en MP4 (format paysage pour annonces, format vertical pour Reels/Stories). Tous les fichiers sont optimisés pour le web.",
  },
  {
    q: "Et si le résultat ne me convient pas ?",
    a: "Notre expert peut relancer la génération avec un prompt ajusté. Nous ne livrons que des résultats conformes à nos standards de qualité.",
  },
  {
    q: "Y a-t-il un engagement minimum ?",
    a: "Non. Les packs par bien sont sans engagement. Vous payez uniquement ce que vous consommez. Les abonnements sont mensuels et résiliables à tout moment.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/60 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left cursor-pointer group"
        aria-expanded={open}
      >
        <span className="text-base font-medium pr-4 group-hover:text-badge-gold-text transition-colors">
          {q}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-muted">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQSection() {
  return (
    <section id="faq" className="py-24 px-6 lg:py-32 border-t border-border">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="mx-auto max-w-3xl text-center mb-16"
        >
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-badge-gold-border bg-badge-gold-bg px-3 py-1 text-xs font-medium tracking-wide text-badge-gold-text uppercase">
            FAQ
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Questions <span className="text-gradient-gold">fréquentes</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            Tout ce que vous devez savoir avant de commander.
          </p>
        </motion.div>

        <div className="rounded-2xl border border-border bg-surface/40 px-6">
          {FAQS.map((faq) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>
    </section>
  );
}
