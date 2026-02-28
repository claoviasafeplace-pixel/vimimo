"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import Link from "next/link";

export default function CTASection() {
  return (
    <section className="py-24 px-6 border-t border-border">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-3xl text-center"
      >
        <h2 className="text-3xl font-bold sm:text-4xl">
          Prêt à transformer vos <span className="text-gradient-gold">annonces</span> ?
        </h2>
        <p className="mt-4 text-lg text-muted">
          Rejoignez les agences qui vendent plus vite grâce au staging virtuel IA.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/commander"
            className="inline-flex items-center gap-2 rounded-xl gradient-gold px-8 py-4 text-base font-semibold text-zinc-900 shadow-lg shadow-amber-900/20 transition-opacity hover:opacity-90"
          >
            <Sparkles className="h-5 w-5" />
            Essayer gratuitement
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface/50 px-6 py-4 text-base font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            Voir les tarifs
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
