"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Sparkles, ArrowRight, Play, Check, Camera, Wand2, Film } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.96]);

  return (
    <motion.section
      ref={heroRef}
      style={{ opacity: heroOpacity, scale: heroScale }}
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-16 text-center"
    >
      {/* Warm glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-[18%] h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[160px]"
          style={{
            background: "radial-gradient(circle, rgba(196,122,90,0.10) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute right-[15%] bottom-[25%] h-[400px] w-[400px] rounded-full blur-[120px]"
          style={{
            background: "radial-gradient(circle, rgba(30,58,95,0.06) 0%, transparent 70%)",
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
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Home staging virtuel par IA
        </span>
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
        className="relative z-10 max-w-5xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
      >
        De simples photos à une{" "}
        <span className="text-gradient-gold">présentation irrésistible</span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
        className="relative z-10 mt-7 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl"
      >
        Envoyez les photos brutes de votre bien. Notre IA meuble, décore et met en scène chaque pièce.
        Vous recevez des visuels et vidéos prêts à publier sous 24h.
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
          className="group inline-flex items-center gap-2.5 rounded-xl gradient-gold px-8 py-4 text-base font-semibold text-white shadow-xl shadow-[rgba(196,122,90,0.20)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_0_30px_rgba(196,122,90,0.30)] hover:scale-[1.02]"
        >
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          Transformer mes photos
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
        <a
          href="#demo"
          className="inline-flex items-center gap-2.5 rounded-xl border border-border bg-surface/60 px-7 py-4 text-base font-medium text-foreground backdrop-blur-sm transition-all hover:bg-surface-hover hover:border-border"
        >
          <Play className="h-4 w-4 text-icon-accent" aria-hidden="true" />
          Voir des exemples avant/après
        </a>
      </motion.div>

      {/* Value props */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.7 }}
        className="relative z-10 mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted"
      >
        <span className="flex items-center gap-2">
          <Check className="h-4 w-4 text-icon-accent" aria-hidden="true" />
          Livraison sous 24h
        </span>
        <span className="flex items-center gap-2">
          <Check className="h-4 w-4 text-icon-accent" aria-hidden="true" />
          Validé par un expert
        </span>
        <span className="flex items-center gap-2">
          <Check className="h-4 w-4 text-icon-accent" aria-hidden="true" />
          Sans engagement
        </span>
      </motion.div>

      {/* Visual mockup: 3 preview cards */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.85, ease: EASE }}
        className="relative z-10 mt-16 flex flex-col items-center gap-4 sm:flex-row sm:gap-5"
      >
        {[
          { icon: Camera, label: "Photos brutes", desc: "Envoyez vos photos" },
          { icon: Wand2, label: "IA + Expert", desc: "Staging automatique" },
          { icon: Film, label: "Visuels & Vidéos", desc: "Prêts à publier" },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1 + i * 0.15, ease: EASE }}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 px-5 py-3 backdrop-blur-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-badge-gold-bg border border-badge-gold-border/30">
              <item.icon className="h-5 w-5 text-icon-accent" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="text-xs text-muted">{item.desc}</p>
            </div>
            {i < 2 && (
              <ArrowRight className="hidden h-4 w-4 text-muted sm:block ml-2" aria-hidden="true" />
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
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
