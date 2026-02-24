"use client";

import { motion } from "framer-motion";

const BEFORE_IMG = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80";
const AFTER_IMG = "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&q=80";

export default function BeforeAfter() {
  return (
    <section id="demo" className="py-24 px-6">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold sm:text-4xl">
            Le résultat parle de <span className="text-gradient-gold">lui-même</span>
          </h2>
          <p className="mt-4 text-lg text-muted max-w-xl mx-auto">
            Comparez une pièce vide et son staging IA. Même angle, même lumière,
            un tout autre impact émotionnel.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Before */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="group relative overflow-hidden rounded-2xl border border-border"
          >
            <img
              src={BEFORE_IMG}
              alt="Pièce vide avant staging"
              className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute top-4 left-4">
              <span className="rounded-full bg-black/70 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
                AVANT
              </span>
            </div>
          </motion.div>

          {/* After */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="group relative overflow-hidden rounded-2xl border border-badge-gold-border"
          >
            <img
              src={AFTER_IMG}
              alt="Pièce meublée par staging IA"
              className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute top-4 left-4">
              <span className="rounded-full gradient-gold px-4 py-1.5 text-sm font-semibold text-zinc-900">
                APRES — IA
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
