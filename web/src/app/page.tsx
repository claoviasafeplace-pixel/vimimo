"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Sparkles,
  Play,
  Camera,
  Wand2,
  Rocket,
  Check,
  ArrowRight,
  Star,
  Clock,
  Zap,
  Shield,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import AuthButton from "@/components/auth/AuthButton";
import ThemeToggle from "@/components/ui/ThemeToggle";
import PricingGrid from "@/components/pricing/PricingGrid";

/* ─────────────────────────────────────────────
   Data
   ───────────────────────────────────────────── */

const NAV_LINKS = [
  { label: "Fonctionnalités", href: "#features" },
  { label: "Comment ça marche", href: "#how" },
  { label: "Tarifs", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const STATS = [
  { value: "5", label: "styles de décoration" },
  { value: "100%", label: "automatisé" },
  { value: "1 Bien", label: "= photos + vidéo pub" },
  { value: "4K", label: "vidéo cinématique" },
];

const FEATURES = [
  {
    icon: Camera,
    title: "1 Bien = 1 Crédit",
    description:
      "Importez jusqu'à 6 photos de pièces vides d'un même bien. Notre IA analyse chaque pièce et génère un staging complet avec vidéo de visite.",
  },
  {
    icon: Wand2,
    title: "5 décors par pièce",
    description:
      "Scandinave, moderne, classique, industriel, bohème. Choisissez le style qui correspond à votre cible d'acheteurs.",
  },
  {
    icon: Rocket,
    title: "Vidéo de visite pub",
    description:
      "Recevez une vidéo avant/après prête à publier. L'effet waouh qui déclenche les visites sur vos annonces et réseaux.",
  },
  {
    icon: Zap,
    title: "Décrochez des mandats",
    description:
      "Différenciez-vous de la concurrence en proposant un service de staging virtuel à vos vendeurs. Justifiez vos honoraires.",
  },
  {
    icon: Shield,
    title: "Vendez au prix fort",
    description:
      "Les acheteurs se projettent instantanément. Coup de cœur garanti, moins de négociation, vente plus rapide.",
  },
  {
    icon: Star,
    title: "Descriptions IA",
    description:
      "Générez automatiquement des descriptions optimisées pour Instagram et TikTok avec chaque bien.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Photographiez le bien",
    description:
      "Photographiez les pièces vides avec votre smartphone. Jusqu'à 6 photos par bien, aucun matériel spécial requis.",
  },
  {
    step: "02",
    title: "L'IA décore et filme",
    description:
      "Notre IA analyse chaque pièce, génère 5 options de décoration et compile une vidéo de visite cinématique avant/après.",
  },
  {
    step: "03",
    title: "Décrochez le mandat",
    description:
      "Présentez le résultat à votre vendeur. Publiez les photos et la vidéo sur vos annonces. Vendez plus vite, au prix fort.",
  },
];

const TESTIMONIALS = [
  {
    name: "Sophie Martin",
    role: "Directrice, Agence Prestige Immobilier",
    quote:
      "Nos biens se vendent 40% plus vite depuis qu'on utilise VIMIMO. Les acquéreurs se projettent immédiatement.",
    stars: 5,
  },
  {
    name: "Thomas Durand",
    role: "Agent indépendant, Paris 16e",
    quote:
      "J'économise 2 000€ par mois en staging physique. La qualité IA est bluffante, mes clients ne voient pas la différence.",
    stars: 5,
  },
  {
    name: "Claire Benoit",
    role: "Responsable marketing, Century 21",
    quote:
      "Les vidéos avant/après sont notre meilleur outil marketing. Les vues sur nos annonces ont triplé.",
    stars: 5,
  },
];

const FAQS = [
  {
    q: "Que comprend exactement 1 Bien (1 crédit) ?",
    a: "1 Bien = jusqu'à 6 photos de pièces vides d'un même bien immobilier. Chaque pièce reçoit 5 options de décoration IA + 1 vidéo de visite cinématique compilée. Tout est inclus.",
  },
  {
    q: "Combien de temps pour obtenir le résultat ?",
    a: "Le pipeline complet — nettoyage, staging 5 options, vidéo cinématique — prend entre 5 et 10 minutes par bien. Tout est automatisé, vous n'avez rien à faire.",
  },
  {
    q: "Puis-je essayer avant de m'abonner ?",
    a: "Oui. Achetez un pack ponctuel d'1 Bien à 19€ pour tester le service sans engagement. Si le résultat vous convainc, passez à l'abonnement.",
  },
  {
    q: "Comment ça aide à décrocher des mandats exclusifs ?",
    a: "Lors du R1 avec votre vendeur, montrez-lui ce que VIMIMO peut faire pour son bien. Un staging virtuel professionnel + vidéo pub est un argument concret que les autres agents ne proposent pas.",
  },
  {
    q: "Si je supprime un projet, est-ce que je récupère mon crédit ?",
    a: "Non. Le crédit (Bien) est consommé définitivement à la création du projet. La suppression d'un projet ne recrédite pas votre compte.",
  },
  {
    q: "Puis-je annuler mon abonnement ?",
    a: "Oui, à tout moment. Vos biens restants restent disponibles jusqu'à la fin de la période en cours.",
  },
];

const COMPARISONS = [
  {
    before: "https://instahomevirtualstaging.com/wp-content/uploads/2024/10/Before-Empty-Livingroom-1.jpeg",
    after: "https://instahomevirtualstaging.com/wp-content/uploads/2024/10/After-Virtually-Staged-Livingroom-in-Standard-Style-1.png",
    label: "Salon — Staging Moderne",
  },
  {
    before: "https://instahomevirtualstaging.com/wp-content/uploads/2024/10/Before-Empty-Master-BedRoom-1.jpeg",
    after: "https://instahomevirtualstaging.com/wp-content/uploads/2024/10/After-Virtually-Staged-Bedroom-in-Standard-Style-1.webp",
    label: "Chambre — Staging Contemporain",
  },
];

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.08 * i, ease: [0.21, 0.47, 0.32, 0.98] as const },
  }),
};

function SectionHeading({
  badge,
  title,
  highlight,
  subtitle,
}: {
  badge?: string;
  title: string;
  highlight: string;
  subtitle: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={fadeUp}
      className="mx-auto max-w-3xl text-center mb-16"
    >
      {badge && (
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-badge-gold-border bg-badge-gold-bg px-3 py-1 text-xs font-medium tracking-wide text-badge-gold-text uppercase">
          {badge}
        </span>
      )}
      <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
        {title} <span className="text-gradient-gold">{highlight}</span>
      </h2>
      <p className="mt-5 text-lg leading-relaxed text-muted">{subtitle}</p>
    </motion.div>
  );
}

function BeforeAfterSlider({
  before,
  after,
  label,
}: {
  before: string;
  after: string;
  label: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const updatePosition = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      setPosition((x / rect.width) * 100);
    },
    [],
  );

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => updatePosition(e.clientX);
    const onTouchMove = (e: TouchEvent) => updatePosition(e.touches[0].clientX);
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [isDragging, updatePosition]);

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border/60 cursor-col-resize select-none"
        onMouseDown={(e) => {
          setIsDragging(true);
          updatePosition(e.clientX);
        }}
        onTouchStart={(e) => {
          setIsDragging(true);
          updatePosition(e.touches[0].clientX);
        }}
      >
        {/* After image (full background) */}
        <img
          src={after}
          alt="Après staging IA"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />

        {/* Before image (clipped via clip-path for pixel-perfect alignment) */}
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <img
            src={before}
            alt="Avant — pièce vide"
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        </div>

        {/* Slider line */}
        <div
          className="absolute top-0 bottom-0 z-10 w-0.5 bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.3)]"
          style={{ left: `${position}%`, transform: "translateX(-50%)" }}
        >
          {/* Handle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm border border-white/20">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="text-zinc-800"
            >
              <path
                d="M4.5 3L1.5 8L4.5 13M11.5 3L14.5 8L11.5 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-4 left-4 z-20">
          <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md border border-white/10">
            AVANT
          </span>
        </div>
        <div className="absolute top-4 right-4 z-20">
          <span className="rounded-full gradient-gold px-3 py-1 text-xs font-semibold text-zinc-900">
            APRÈS — IA
          </span>
        </div>
      </div>
      <p className="text-center text-sm text-muted">{label}</p>
    </div>
  );
}

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

/* ─────────────────────────────────────────────
   Page
   ───────────────────────────────────────────── */

export default function LandingPage() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          NAVBAR
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/70 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_1px_30px_rgba(0,0,0,0.2)]"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-gold">
              <Sparkles className="h-4 w-4 text-zinc-900" />
            </div>
            <span className="text-xl font-bold tracking-wide text-gradient-gold">
              VIMIMO
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop Right */}
          <div className="hidden items-center gap-3 lg:flex">
            <ThemeToggle />
            {session ? (
              <AuthButton />
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
                >
                  Se connecter
                </Link>
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-2 rounded-lg gradient-gold px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-lg shadow-amber-900/20 transition-all hover:opacity-90 hover:shadow-amber-900/30"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Voir les tarifs
                </a>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface lg:hidden cursor-pointer"
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-border/50 bg-background/95 backdrop-blur-xl px-6 pb-6 pt-4 lg:hidden"
          >
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-surface hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
              <Link
                href="/login"
                className="rounded-lg border border-border bg-surface px-4 py-2.5 text-center text-sm font-medium"
              >
                Se connecter
              </Link>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-lg gradient-gold px-4 py-2.5 text-sm font-semibold text-zinc-900"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Voir les tarifs
              </a>
            </div>
          </motion.div>
        )}
      </header>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HERO
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
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
              background:
                "radial-gradient(circle, rgba(200,164,90,0.12) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute right-[20%] bottom-[20%] h-[500px] w-[500px] rounded-full blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(200,164,90,0.06) 0%, transparent 70%)",
            }}
          />
          {/* Grid pattern */}
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
            L'arme secrète des agents immobiliers
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.21, 0.47, 0.32, 0.98] as const }}
          className="relative z-10 max-w-5xl text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl"
        >
          <span className="text-gradient-gold">Décrochez</span> des mandats.
          <br />
          <span className="text-muted">Vendez</span>{" "}
          <span className="text-gradient-gold">plus vite.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.21, 0.47, 0.32, 0.98] as const }}
          className="relative z-10 mt-8 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl"
        >
          Transformez chaque bien vide en vitrine irrésistible.
          Staging IA photoréaliste + vidéo de visite cinématique — l'argument qui fait signer des mandats exclusifs.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="relative z-10 mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <a
            href="#pricing"
            className="group inline-flex items-center gap-2.5 rounded-xl gradient-gold px-8 py-4 text-base font-semibold text-zinc-900 shadow-xl shadow-amber-900/25 transition-all hover:shadow-amber-900/40 hover:scale-[1.02]"
          >
            <Sparkles className="h-5 w-5" />
            Voir les tarifs
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
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
            1 Bien = Photos + Vidéo pub
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-4 w-4 text-icon-accent" />
            5 décors par pièce
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
              transition={{
                repeat: Infinity,
                duration: 1.5,
                ease: "easeInOut",
              }}
              className="h-1.5 w-1 rounded-full gradient-gold"
            />
          </div>
        </motion.div>
      </motion.section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          STATS BAR
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative z-10 border-y border-border/50 bg-surface/30 backdrop-blur-sm">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-12 sm:grid-cols-4 sm:gap-8">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              variants={fadeUp}
              className="text-center"
            >
              <p className="text-3xl font-bold text-gradient-gold sm:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1.5 text-sm text-muted">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          BEFORE / AFTER
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="demo" className="py-24 px-6 lg:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            badge="Avant / Après"
            title="Jugez par"
            highlight="vous-même"
            subtitle="Glissez le curseur pour révéler la transformation. C'est ce que vos acheteurs verront sur l'annonce."
          />

          <div className="grid gap-8 lg:grid-cols-2">
            {COMPARISONS.map((comp, i) => (
              <motion.div
                key={comp.label}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                custom={i}
                variants={fadeUp}
              >
                <BeforeAfterSlider
                  before={comp.before}
                  after={comp.after}
                  label={comp.label}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FEATURES
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        id="features"
        className="py-24 px-6 lg:py-32 border-t border-border/50"
      >
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            badge="Fonctionnalités"
            title="Décrochez des mandats,"
            highlight="vendez plus vite"
            subtitle="L&apos;outil complet qui vous différencie de la concurrence et aide vos vendeurs à vendre au prix fort."
          />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                custom={i}
                variants={fadeUp}
                className="group relative rounded-2xl border border-border/60 bg-surface/40 p-7 backdrop-blur-sm transition-all duration-300 hover:border-badge-gold-border/40 hover:bg-surface/70"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-badge-gold-bg border border-badge-gold-border/30">
                  <feat.icon className="h-6 w-6 text-icon-accent" />
                </div>
                <h3 className="text-lg font-semibold">{feat.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">
                  {feat.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HOW IT WORKS
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        id="how"
        className="py-24 px-6 lg:py-32 border-t border-border/50"
      >
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            badge="3 étapes"
            title="Comment ça"
            highlight="marche"
            subtitle="Du smartphone à l&apos;annonce en quelques minutes. 1 Bien = jusqu&apos;à 6 pièces décorées + 1 vidéo de visite."
          />

          <div className="relative grid gap-8 sm:grid-cols-3">
            {/* Connector line (desktop) */}
            <div className="absolute top-12 left-[16.6%] right-[16.6%] hidden h-px bg-gradient-to-r from-transparent via-border to-transparent sm:block" />

            {STEPS.map((step, i) => (
              <motion.div
                key={step.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                custom={i}
                variants={fadeUp}
                className="relative text-center"
              >
                {/* Step number */}
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl gradient-gold text-xl font-bold text-zinc-900 shadow-lg shadow-amber-900/20">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TESTIMONIALS
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 px-6 lg:py-32 border-t border-border/50 bg-surface/20">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            badge="Témoignages"
            title="Ils nous font"
            highlight="confiance"
            subtitle="Ce que disent les professionnels de l'immobilier qui utilisent VIMIMO."
          />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                custom={i}
                variants={fadeUp}
                className="rounded-2xl border border-border/60 bg-surface/40 p-7 backdrop-blur-sm"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star
                      key={j}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-feature-text italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-gold text-sm font-bold text-zinc-900">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PRICING
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        id="pricing"
        className="py-24 px-6 lg:py-32 border-t border-border/50"
      >
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            badge="Tarifs"
            title="Des tarifs"
            highlight="simples et transparents"
            subtitle="1 Crédit = 1 Bien Immobilier Complet (jusqu&apos;à 6 pièces décorées + vidéo de visite pub). Sans engagement, sans abonnement obligatoire."
          />

          <PricingGrid />
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FAQ
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        id="faq"
        className="py-24 px-6 lg:py-32 border-t border-border/50 bg-surface/20"
      >
        <div className="mx-auto max-w-3xl">
          <SectionHeading
            badge="FAQ"
            title="Questions"
            highlight="fréquentes"
            subtitle="Tout ce que vous devez savoir avant de commencer."
          />

          <div className="rounded-2xl border border-border/60 bg-surface/40 px-6 backdrop-blur-sm">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FINAL CTA
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative py-32 px-6 border-t border-border/50 overflow-hidden">
        {/* Glow */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute left-1/2 top-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[160px]"
            style={{
              background:
                "radial-gradient(circle, rgba(200,164,90,0.08) 0%, transparent 70%)",
            }}
          />
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="relative z-10 mx-auto max-w-3xl text-center"
        >
          <h2 className="text-3xl font-bold sm:text-4xl lg:text-5xl">
            Prêt à décrocher plus de{" "}
            <span className="text-gradient-gold">mandats</span> ?
          </h2>
          <p className="mt-5 text-lg text-muted">
            Proposez un service que vos concurrents n'ont pas.
            Staging IA + vidéo pub pour chaque bien de votre portefeuille.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="#pricing"
              className="group inline-flex items-center gap-2.5 rounded-xl gradient-gold px-8 py-4 text-base font-semibold text-zinc-900 shadow-xl shadow-amber-900/25 transition-all hover:shadow-amber-900/40 hover:scale-[1.02]"
            >
              <Sparkles className="h-5 w-5" />
              Voir les tarifs
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <Link
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface/60 px-7 py-4 text-base font-medium text-foreground backdrop-blur-sm transition-all hover:bg-surface-hover"
            >
              Voir les tarifs
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FOOTER
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="border-t border-border/50 bg-surface/20">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-gold">
                  <Sparkles className="h-3.5 w-3.5 text-zinc-900" />
                </div>
                <span className="text-lg font-bold tracking-wide text-gradient-gold">
                  VIMIMO
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted max-w-xs">
                Le staging virtuel IA pour les professionnels de l&apos;immobilier.
                Vendez plus vite, impressionnez vos clients.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
                Produit
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <a
                    href="#features"
                    className="text-sm text-muted transition-colors hover:text-foreground"
                  >
                    Fonctionnalités
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="text-sm text-muted transition-colors hover:text-foreground"
                  >
                    Tarifs
                  </a>
                </li>
                <li>
                  <a
                    href="#how"
                    className="text-sm text-muted transition-colors hover:text-foreground"
                  >
                    Comment ça marche
                  </a>
                </li>
                <li>
                  <a
                    href="#faq"
                    className="text-sm text-muted transition-colors hover:text-foreground"
                  >
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
                Entreprise
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link
                    href="/login"
                    className="text-sm text-muted transition-colors hover:text-foreground"
                  >
                    Connexion
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="text-sm text-muted transition-colors hover:text-foreground"
                  >
                    Tarifs
                  </Link>
                </li>
              </ul>
            </div>

            {/* Légal */}
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
                Légal
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <span className="text-sm text-muted">
                    Mentions légales
                  </span>
                </li>
                <li>
                  <span className="text-sm text-muted">
                    Politique de confidentialité
                  </span>
                </li>
                <li>
                  <span className="text-sm text-muted">CGV</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 sm:flex-row">
            <p className="text-xs text-muted">
              &copy; {new Date().getFullYear()} VIMIMO. Tous droits réservés.
            </p>
            <p className="text-xs text-muted">
              Fait avec{" "}
              <span className="text-gradient-gold font-medium">&#9829;</span> a
              Paris
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
