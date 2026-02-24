"use client";

import { motion } from "framer-motion";
import { Sparkles, Play } from "lucide-react";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Glow background */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-1/4 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
          style={{ background: "rgba(200, 164, 90, var(--glow-opacity))" }}
        />
        <div
          className="absolute right-1/4 bottom-1/4 h-[400px] w-[400px] rounded-full blur-[100px]"
          style={{ background: "rgba(200, 164, 90, calc(var(--glow-opacity) * 0.5))" }}
        />
      </div>

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 mb-6 inline-flex items-center gap-2 rounded-full border border-badge-gold-border bg-badge-gold-bg px-4 py-1.5 text-sm text-badge-gold-text"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Propulsé par l&apos;Intelligence Artificielle
      </motion.div>

      {/* Heading */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="relative z-10 max-w-4xl text-5xl font-bold leading-[1.1] tracking-tight sm:text-7xl"
      >
        Vendez <span className="text-gradient-gold">2× plus vite</span>
        <br />
        grâce au staging virtuel
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25 }}
        className="relative z-10 mt-6 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl"
      >
        Transformez vos photos de pièces vides en visuels et vidéos de staging
        professionnel. En quelques minutes, pas en quelques semaines.
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="relative z-10 mt-10 flex flex-col items-center gap-4 sm:flex-row"
      >
        <Link
          href="/new"
          className="inline-flex items-center gap-2 rounded-xl gradient-gold px-8 py-4 text-base font-semibold text-zinc-900 shadow-lg shadow-amber-900/20 transition-opacity hover:opacity-90"
        >
          <Sparkles className="h-5 w-5" />
          Commencer gratuitement
        </Link>
        <a
          href="#demo"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface/50 px-6 py-4 text-base font-medium text-foreground transition-colors hover:bg-surface-hover"
        >
          <Play className="h-4 w-4 text-icon-accent" />
          Voir la démo
        </a>
      </motion.div>

      {/* Social proof */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="relative z-10 mt-8 text-sm text-muted"
      >
        Utilisé par <span className="font-semibold text-foreground">500+</span> agences immobilières
      </motion.p>
    </section>
  );
}
