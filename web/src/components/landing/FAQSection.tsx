"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

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
    q: "Que comprend exactement 1 Bien ?",
    a: "1 Bien = jusqu'à 6 photos de pièces vides d'un même bien immobilier. Notre IA génère 5 options de décoration par pièce. Un expert sélectionne la meilleure et vous recevez les photos stagées + une vidéo cinématique avant/après.",
  },
  {
    q: "Combien de temps pour recevoir mon staging ?",
    a: "Livraison sous 24h. Notre IA travaille en quelques minutes, puis un expert vérifie et valide chaque résultat avant de vous le livrer.",
  },
  {
    q: "Puis-je choisir le style de décoration ?",
    a: "Oui. Vous choisissez parmi 5 styles (Scandinave, Moderne, Classique, Industriel, Bohème) lors de votre commande. Notre expert sélectionne ensuite la meilleure option pour chaque pièce.",
  },
  {
    q: "Qui est l'expert qui valide ?",
    a: "Notre équipe interne de spécialistes en home staging vérifie la qualité de chaque résultat : cohérence du mobilier, perspective, éclairage. Vous ne recevez que des résultats impeccables.",
  },
  {
    q: "Puis-je essayer sans engagement ?",
    a: "Oui. Le pack Particulier à 39€ (1 bien) vous permet de tester le service complet sans engagement. Si le résultat vous convainc, passez à un pack plus avantageux.",
  },
  {
    q: "Que se passe-t-il si le résultat ne me convient pas ?",
    a: "Notre expert peut relancer la génération avec un prompt ajusté. Nous ne livrons que des résultats qui répondent à nos standards de qualité.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/60">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left cursor-pointer group"
      >
        <span className="text-base font-medium pr-4 group-hover:text-badge-gold-text transition-colors">
          {q}
        </span>
        <ChevronRight
          className={`h-5 w-5 shrink-0 text-muted transition-transform duration-300 ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-48 pb-5" : "max-h-0"
        }`}
      >
        <p className="text-sm leading-relaxed text-muted">{a}</p>
      </div>
    </div>
  );
}

export default function FAQSection() {
  return (
    <section id="faq" className="py-24 px-6 lg:py-32 border-t border-border/50 bg-surface/20">
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

        <div className="rounded-2xl border border-border/60 bg-surface/40 px-6 backdrop-blur-sm">
          {FAQS.map((faq) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>
    </section>
  );
}
