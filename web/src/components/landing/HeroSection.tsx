"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Sparkles, Play, Check, ArrowRight } from "lucide-react";

export default function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  return (
    <motion.section
      ref={heroRef}
      style={{ opacity: heroOpacity, scale: heroScale }}
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 pt-20 text-center"
    >
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-[20%] h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px]"
          style={{
            background: "radial-gradient(circle, rgba(200,164,90,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute right-[20%] bottom-[20%] h-[500px] w-[500px] rounded-full blur-[120px]"
          style={{
            background: "radial-gradient(circle, rgba(200,164,90,0.06) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 mb-8"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-badge-gold-border bg-badge-gold-bg/60 px-5 py-2 text-sm font-medium text-badge-gold-text backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" />
          Staging premium + validation expert
        </span>
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] as const }}
        className="relative z-10 max-w-5xl text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl"
      >
        Vendez le{" "}
        <span className="text-gradient-gold">potentiel</span>,
        <br />
        pas le <span className="text-muted">vide.</span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] as const }}
        className="relative z-10 mt-8 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl"
      >
        Uploadez vos photos de pièces vides. Notre IA meuble, décore et filme.
        Un expert valide le résultat. Vous recevez tout sous 24h.
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="relative z-10 mt-10 flex flex-col items-center gap-4 sm:flex-row"
      >
        <Link
          href="/commander"
          className="group inline-flex items-center gap-2.5 rounded-xl gradient-gold px-8 py-4 text-base font-semibold text-zinc-900 shadow-xl shadow-amber-900/25 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_0_30px_rgba(200,164,90,0.35)] hover:scale-[1.02]"
        >
          <Sparkles className="h-5 w-5" />
          Créer ma vidéo premium
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <a
          href="#demo"
          className="inline-flex items-center gap-2.5 rounded-xl border border-border bg-surface/60 px-7 py-4 text-base font-medium text-foreground backdrop-blur-sm transition-all hover:bg-surface-hover hover:border-border"
        >
          <Play className="h-4 w-4 text-icon-accent" />
          Voir le résultat
        </a>
      </motion.div>

      {/* Value props */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.7 }}
        className="relative z-10 mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted"
      >
        <span className="flex items-center gap-1.5">
          <Check className="h-4 w-4 text-icon-accent" />
          Expert qualité inclus
        </span>
        <span className="flex items-center gap-1.5">
          <Check className="h-4 w-4 text-icon-accent" />
          Livraison sous 24h
        </span>
        <span className="flex items-center gap-1.5">
          <Check className="h-4 w-4 text-icon-accent" />
          Sans engagement
        </span>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="flex h-8 w-5 items-start justify-center rounded-full border border-border/50 pt-1.5">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="h-1.5 w-1 rounded-full gradient-gold"
          />
        </div>
      </motion.div>
    </motion.section>
  );
}
