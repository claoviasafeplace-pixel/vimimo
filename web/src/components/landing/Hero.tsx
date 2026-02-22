"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface HeroProps {
  onStart: () => void;
}

export default function Hero({ onStart }: HeroProps) {
  return (
    <section className="relative flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10"
      >
        <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
          <span className="text-gradient-gold">VIMIMO</span>
        </h1>
        <p className="mt-2 text-lg text-muted sm:text-xl">Virtual Staging IA</p>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="relative z-10 mt-8 max-w-xl text-lg leading-relaxed text-zinc-400 sm:text-xl"
      >
        Transformez vos photos de pièces vides en vidéos de staging professionnel
        grâce à l&apos;intelligence artificielle.
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        onClick={onStart}
        className="relative z-10 mt-10 inline-flex items-center gap-2 rounded-xl gradient-gold px-8 py-4 text-base font-semibold text-zinc-900 shadow-lg shadow-amber-900/20 transition-opacity hover:opacity-90 cursor-pointer"
      >
        <Sparkles className="h-5 w-5" />
        Commencer un projet
      </motion.button>
    </section>
  );
}
