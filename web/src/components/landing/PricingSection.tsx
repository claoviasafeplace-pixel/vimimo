"use client";

import { motion } from "framer-motion";
import PricingTiers from "@/components/pricing/PricingTiers";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function PricingSection() {
  return (
    <section id="pricing" className="py-24 px-6 lg:py-32 border-t border-border/50">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="mx-auto max-w-3xl text-center mb-16"
        >
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-badge-gold-border bg-badge-gold-bg px-3 py-1 text-xs font-medium tracking-wide text-badge-gold-text uppercase">
            Tarifs
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Des tarifs <span className="text-gradient-gold">simples et transparents</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            1 Bien = staging IA complet + vidéo cinématique + validation expert. Sans engagement.
          </p>
        </motion.div>

        <PricingTiers />

        <p className="mt-10 text-center text-xs text-muted">
          Prix affichés HT. TVA 20% appliquée au paiement. Paiement sécurisé par Stripe.
        </p>
      </div>
    </section>
  );
}
