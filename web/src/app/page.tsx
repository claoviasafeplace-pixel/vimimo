"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useInView,
  AnimatePresence,
  useMotionValueEvent,
} from "framer-motion";
import {
  Sparkles,
  Play,
  Shield,
  Wand2,
  Clock,
  Camera,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Star,
  Menu,
  X,
  Zap,
  Eye,
  Film,
  Building2,
  SlidersHorizontal,
  Send,
  Minus,
  Plus,
} from "lucide-react";
import AuthButton from "@/components/auth/AuthButton";

/* ═══════════════════════════════════════════════════
   ANIMATION SYSTEM
   ═══════════════════════════════════════════════════ */

const EASE = [0.16, 1, 0.3, 1] as const;
const EASE_BOUNCE = [0.34, 1.56, 0.64, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

const fadeUpScale = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.9, ease: EASE } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
};

const fadeUpChild = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

/* ─── Animated counter hook ─── */

function useCounter(target: number, duration = 2000, enabled = true) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!inView || !enabled) return;
    let start = 0;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration, enabled]);

  return { count, ref };
}

/* ─── 3D tilt card ─── */

function TiltCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), { stiffness: 300, damping: 30 });

  function handleMouse(e: React.MouseEvent) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Floating particles ─── */

function Particles({ count = 30 }: { count?: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 15 + 10,
        delay: Math.random() * 5,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-amber-400"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0, 0.4, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Marquee logo bar ─── */

const TRUSTED_BY = [
  "Century 21",
  "ERA Immobilier",
  "Laforêt",
  "Guy Hoquet",
  "Orpi",
  "Stéphane Plaza",
  "Barnes",
  "Sotheby's",
];

function Marquee() {
  return (
    <div className="relative overflow-hidden py-6">
      <div className="absolute left-0 top-0 bottom-0 z-10 w-24 bg-gradient-to-r from-[#0A0A0B] to-transparent" />
      <div className="absolute right-0 top-0 bottom-0 z-10 w-24 bg-gradient-to-l from-[#0A0A0B] to-transparent" />
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      >
        {[...TRUSTED_BY, ...TRUSTED_BY].map((name, i) => (
          <span
            key={i}
            className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-700"
          >
            {name}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ─── Animated gradient border ─── */

function GradientBorder({
  children,
  className = "",
  active = true,
}: {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
}) {
  return (
    <div className={`relative rounded-3xl p-[2px] ${className}`}>
      {active && (
        <motion.div
          className="absolute inset-0 rounded-3xl"
          style={{
            background:
              "conic-gradient(from var(--angle, 0deg), #D4AF37, #18181b, #D4AF37, #18181b, #D4AF37)",
          }}
          animate={{ "--angle": ["0deg", "360deg"] } as Record<string, string[]>}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
      )}
      <div className="relative rounded-[22px] bg-zinc-900 h-full">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PRICING DATA
   ═══════════════════════════════════════════════════ */

function getEnterprisePrice(count: number): number {
  if (count <= 1) return 39;
  if (count <= 3) return Math.round(count * 33);
  if (count <= 5) return Math.round(count * 29.8);
  if (count <= 10) return Math.round(count * 24.9);
  return count * 24.9;
}

function getUnitPrice(count: number): number {
  return Math.round(getEnterprisePrice(count) / count);
}

/* ═══════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════ */

const NAV_LINKS = [
  { label: "Fonctionnalités", href: "#features" },
  { label: "Comment ça marche", href: "#how" },
  { label: "Tarifs", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

function Navbar() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: EASE }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        scrolled
          ? "glass shadow-[0_1px_30px_rgba(0,0,0,0.2)]"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <motion.div
            whileHover={{ rotate: [0, -10, 10, -5, 0] }}
            transition={{ duration: 0.5 }}
            className="flex h-9 w-9 items-center justify-center rounded-xl gradient-gold shadow-lg shadow-amber-900/25"
          >
            <Sparkles className="h-4.5 w-4.5 text-zinc-900" />
          </motion.div>
          <span
            className="text-xl font-bold tracking-wide text-gradient-gold"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            VIMIMO
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link, i) => (
            <motion.a
              key={link.href}
              href={link.href}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i + 0.3, duration: 0.5, ease: EASE }}
              className="relative text-sm text-zinc-400 transition-colors duration-300 hover:text-white group"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-300 group-hover:w-full" />
            </motion.a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {session ? (
            <AuthButton />
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
              >
                Se connecter
              </Link>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/commander"
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl px-6 py-2.5 text-sm font-semibold text-zinc-900 shadow-lg shadow-amber-900/25"
                >
                  <span className="absolute inset-0 gradient-gold" />
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                  <Sparkles className="relative h-3.5 w-3.5" />
                  <span className="relative">Démarrer un projet</span>
                </Link>
              </motion.div>
            </>
          )}
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 lg:hidden cursor-pointer"
          aria-label="Menu"
        >
          <AnimatePresence mode="wait">
            {mobileMenuOpen ? (
              <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <X className="h-5 w-5" />
              </motion.div>
            ) : (
              <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <Menu className="h-5 w-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden border-t border-zinc-800/50 glass lg:hidden"
          >
            <nav className="flex flex-col gap-1 px-6 pt-4">
              {NAV_LINKS.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  {link.label}
                </motion.a>
              ))}
            </nav>
            <div className="mx-6 mt-4 flex flex-col gap-2 border-t border-zinc-800 pb-6 pt-4">
              <Link href="/login" className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-center text-sm font-medium">
                Se connecter
              </Link>
              <Link
                href="/commander"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-lg gradient-gold px-4 py-2.5 text-sm font-semibold text-zinc-900"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Démarrer un projet
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

/* ═══════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════ */

const HERO_WORDS_LINE1 = ["Vendez", "le"];
const HERO_WORD_GOLD = "potentiel";
const HERO_WORDS_LINE2 = ["pas", "le"];
const HERO_WORD_MUTED = "vide.";

function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yBg = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);

  // SVG underline draw
  const lineRef = useRef<SVGPathElement>(null);
  const [lineLength, setLineLength] = useState(0);
  useEffect(() => {
    if (lineRef.current) setLineLength(lineRef.current.getTotalLength());
  }, []);

  return (
    <section ref={ref} className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Parallax glow orbs */}
      <motion.div className="pointer-events-none absolute inset-0" style={{ y: yBg, opacity }}>
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.04, 0.06, 0.04] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-1/2 top-1/3 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px]"
          style={{ background: "radial-gradient(circle, #D4AF37, transparent 70%)" }}
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.03, 0.05, 0.03] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute right-1/4 bottom-1/4 h-[500px] w-[500px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, #D4AF37, transparent 70%)" }}
        />
      </motion.div>

      {/* Floating particles */}
      <Particles count={25} />

      {/* Grid lines with parallax */}
      <motion.div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ opacity }}>
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(212,175,55,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.3) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
      </motion.div>

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 30, filter: "blur(10px)", scale: 0.9 }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
        transition={{ duration: 0.8, ease: EASE_BOUNCE }}
        className="relative z-10 mb-8 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-5 py-2 text-sm text-amber-300/80 backdrop-blur-sm"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
        </span>
        Intelligence Artificielle de Virtual Staging
      </motion.div>

      {/* Headline — staggered word reveal */}
      <motion.div style={{ scale }} className="relative z-10">
        <h1 className="max-w-5xl text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
          {HERO_WORDS_LINE1.map((word, i) => (
            <motion.span
              key={word}
              initial={{ opacity: 0, y: 50, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.15 + i * 0.08, ease: EASE }}
              className="inline-block mr-[0.3em]"
            >
              {word}
            </motion.span>
          ))}
          <motion.span
            initial={{ opacity: 0, y: 50, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
            className="relative inline-block mr-[0.15em]"
          >
            <span className="text-gradient-gold">{HERO_WORD_GOLD}</span>
            {/* SVG line draw animation */}
            <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
              <motion.path
                ref={lineRef}
                d="M2 8 Q75 2 150 6 Q225 10 298 4"
                stroke="url(#gold-line)"
                strokeWidth="2.5"
                strokeLinecap="round"
                initial={{ strokeDasharray: lineLength, strokeDashoffset: lineLength }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 1.2, delay: 0.8, ease: EASE }}
              />
              <defs>
                <linearGradient id="gold-line" x1="0" y1="0" x2="300" y2="0">
                  <stop offset="0%" stopColor="#c8a45a" />
                  <stop offset="100%" stopColor="#e8d48b" />
                </linearGradient>
              </defs>
            </svg>
          </motion.span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="inline-block"
          >
            ,
          </motion.span>
          <br />
          {HERO_WORDS_LINE2.map((word, i) => (
            <motion.span
              key={`l2-${word}`}
              initial={{ opacity: 0, y: 50, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.5 + i * 0.08, ease: EASE }}
              className="inline-block mr-[0.3em]"
            >
              {word}
            </motion.span>
          ))}
          <motion.span
            initial={{ opacity: 0, y: 50, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.7, ease: EASE }}
            className="inline-block text-zinc-500"
          >
            {HERO_WORD_MUTED}
          </motion.span>
        </h1>
      </motion.div>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.9, ease: EASE }}
        className="relative z-10 mt-8 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl"
      >
        Transformez instantanément vos biens immobiliers avec notre IA de
        Virtual Staging Cinématographique.{" "}
        <span className="text-zinc-300">Rendu hyper-réaliste garanti, livré en 24h.</span>
      </motion.p>

      {/* CTAs with magnetic hover */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.1, ease: EASE }}
        className="relative z-10 mt-12 flex flex-col items-center gap-4 sm:flex-row"
      >
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
          <Link
            href="/commander"
            className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-2xl px-8 py-4 text-base font-bold text-zinc-900 shadow-[0_0_50px_rgba(212,175,55,0.15)] transition-shadow duration-500 hover:shadow-[0_0_60px_rgba(212,175,55,0.3)]"
          >
            <span className="absolute inset-0 gradient-gold" />
            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
            <Sparkles className="relative h-5 w-5" />
            <span className="relative">Démarrer un projet</span>
            <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
        <motion.a
          href="#showcase"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-2.5 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-7 py-4 text-base font-medium text-zinc-300 backdrop-blur-sm transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-800/50 hover:text-white"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Play className="h-4 w-4 text-amber-400" />
          </motion.div>
          Voir la démo
        </motion.a>
      </motion.div>

      {/* Animated counters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1.4, ease: EASE }}
        className="relative z-10 mt-16 flex flex-wrap items-center justify-center gap-8 sm:gap-12"
      >
        <CounterStat target={500} suffix="+" label="Agences" />
        <CounterStat target={47} prefix="+" suffix="%" label="Visites" />
        <CounterStat target={24} suffix="h" label="Livraison" />
      </motion.div>

      {/* Trust marquee */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="relative z-10 mt-12 w-full max-w-3xl"
      >
        <p className="mb-3 text-center text-[10px] uppercase tracking-[0.25em] text-zinc-600">
          Ils nous font confiance
        </p>
        <Marquee />
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Scroll</span>
          <ChevronDown className="h-4 w-4 text-zinc-600" />
        </motion.div>
      </motion.div>
    </section>
  );
}

function CounterStat({
  target,
  prefix = "",
  suffix = "",
  label,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  label: string;
}) {
  const { count, ref } = useCounter(target);
  return (
    <div className="text-center">
      <p ref={ref} className="text-2xl font-bold text-gradient-gold sm:text-3xl tabular-nums">
        {prefix}{count}{suffix}
      </p>
      <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">{label}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   VIDEO SHOWCASE
   ═══════════════════════════════════════════════════ */

function ShowcaseSection() {
  return (
    <section id="showcase" className="relative py-32 px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/[0.02] to-transparent" />
      <motion.div
        variants={fadeUpScale}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="relative mx-auto max-w-5xl"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-12 text-center"
        >
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-amber-400">
            <Eye className="h-3 w-3" />
            Résultat en temps réel
          </span>
          <h2 className="mt-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
            D&apos;un bien <span className="text-zinc-500">vide</span> à un espace{" "}
            <span className="text-gradient-gold">irrésistible</span>
          </h2>
        </motion.div>

        {/* Video placeholder with 3D tilt */}
        <TiltCard className="relative aspect-video w-full cursor-pointer">
          <div className="relative h-full w-full overflow-hidden rounded-[22px]">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 via-transparent to-zinc-900" />

            {/* Play button overlay with pulse ring */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full border-2 border-amber-500/30"
                />
                <motion.div
                  animate={{ scale: [1, 1.7, 1], opacity: [0.2, 0, 0.2] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                  className="absolute inset-0 rounded-full border border-amber-500/20"
                />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 backdrop-blur-xl shadow-[0_0_40px_rgba(212,175,55,0.15)]">
                  <Play className="ml-1 h-8 w-8 text-amber-400" />
                </div>
              </motion.div>
            </div>

            {/* Animated corner accents */}
            {[
              "top-4 left-4 border-t-2 border-l-2 rounded-tl-lg",
              "top-4 right-4 border-t-2 border-r-2 rounded-tr-lg",
              "bottom-4 left-4 border-b-2 border-l-2 rounded-bl-lg",
              "bottom-4 right-4 border-b-2 border-r-2 rounded-br-lg",
            ].map((pos, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.5, ease: EASE_BOUNCE }}
                className={`absolute h-8 w-8 border-amber-500/20 ${pos}`}
              />
            ))}
          </div>
        </TiltCard>
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   FEATURES
   ═══════════════════════════════════════════════════ */

const FEATURES = [
  {
    icon: Shield,
    title: "Qualité Architecturale",
    description:
      "Pas d'hallucination IA. Respect total des matériaux, perspectives et lumières existants. Chaque pixel est cohérent.",
    gradient: "from-emerald-500/10 to-emerald-500/5",
    iconColor: "text-emerald-400",
    borderColor: "border-emerald-500/10",
    glowColor: "rgba(16,185,129,0.1)",
  },
  {
    icon: Film,
    title: "Assemblage Magique",
    description:
      "Vidéos cinématiques virales pour les réseaux. Transitions fluides, musique intégrée, format prêt à poster.",
    gradient: "from-violet-500/10 to-violet-500/5",
    iconColor: "text-violet-400",
    borderColor: "border-violet-500/10",
    glowColor: "rgba(139,92,246,0.1)",
  },
  {
    icon: Clock,
    title: "Livraison sous 24h",
    description:
      "Notre équipe d'experts valide chaque frame avant livraison. Qualité premium garantie, sans compromis.",
    gradient: "from-amber-500/10 to-amber-500/5",
    iconColor: "text-amber-400",
    borderColor: "border-amber-500/10",
    glowColor: "rgba(212,175,55,0.1)",
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="relative py-32 px-6">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="mx-auto max-w-6xl"
      >
        <motion.div variants={fadeUpChild} className="text-center mb-16">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-amber-400">
            <Zap className="h-3 w-3" />
            Pourquoi VIMIMO
          </span>
          <h2 className="mt-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
            Un staging virtuel{" "}
            <span className="text-gradient-gold">de classe mondiale</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            La technologie IA la plus avancée, supervisée par des experts en architecture d&apos;intérieur.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map((feat) => (
            <motion.div key={feat.title} variants={fadeUpChild}>
              <TiltCard
                className={`group relative overflow-hidden rounded-3xl border ${feat.borderColor} bg-zinc-900/50 transition-all duration-500 hover:border-zinc-700 hover:bg-zinc-900/80`}
              >
                <div className="p-8">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${feat.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
                  />
                  {/* Hover glow */}
                  <div
                    className="absolute -inset-px rounded-3xl opacity-0 blur-xl transition-opacity duration-700 group-hover:opacity-100"
                    style={{ background: feat.glowColor }}
                  />
                  <div className="relative" style={{ transform: "translateZ(20px)" }}>
                    <motion.div
                      whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
                      transition={{ duration: 0.5 }}
                      className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border ${feat.borderColor} bg-zinc-800/50`}
                    >
                      <feat.icon className={`h-7 w-7 ${feat.iconColor}`} />
                    </motion.div>
                    <h3 className="mb-3 text-xl font-bold text-white">{feat.title}</h3>
                    <p className="text-sm leading-relaxed text-zinc-400">
                      {feat.description}
                    </p>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   HOW IT WORKS
   ═══════════════════════════════════════════════════ */

const STEPS = [
  { step: "01", icon: Camera, title: "Uploadez vos photos", description: "Glissez-déposez vos photos de pièces vides. Tous les formats acceptés." },
  { step: "02", icon: Wand2, title: "L'IA transforme", description: "Notre IA génère 5 options de staging par pièce en quelques minutes." },
  { step: "03", icon: Eye, title: "Un expert valide", description: "Un architecte d'intérieur vérifie chaque résultat avant livraison." },
  { step: "04", icon: Sparkles, title: "Recevez tout en 24h", description: "Photos HD + vidéo cinématique prêtes à publier. Livraison garantie." },
];

function HowItWorksSection() {
  return (
    <section id="how" className="relative py-32 px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/[0.015] to-transparent" />
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="relative mx-auto max-w-5xl"
      >
        <motion.div variants={fadeUpChild} className="text-center mb-20">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-amber-400">
            <SlidersHorizontal className="h-3 w-3" />
            Processus
          </span>
          <h2 className="mt-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
            Comment ça <span className="text-gradient-gold">marche</span>
          </h2>
        </motion.div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.step}
              variants={fadeUpChild}
              whileHover={{ y: -8 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="group relative text-center"
            >
              {/* Animated connector line */}
              {i < STEPS.length - 1 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + i * 0.2, duration: 0.8, ease: EASE }}
                  className="absolute top-10 left-[calc(50%+40px)] hidden h-px w-[calc(100%-80px)] origin-left bg-gradient-to-r from-amber-500/30 to-transparent lg:block"
                />
              )}
              <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
                <motion.div
                  whileHover={{ scale: 1.08, borderColor: "rgba(212,175,55,0.3)" }}
                  className="absolute inset-0 rounded-2xl border border-zinc-800 bg-zinc-900/80 transition-all duration-500"
                />
                {/* Glow behind on hover */}
                <div className="absolute inset-0 rounded-2xl opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100 bg-amber-500/10" />
                <s.icon className="relative h-8 w-8 text-zinc-400 transition-colors duration-500 group-hover:text-amber-400" />
                <motion.span
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.15, type: "spring", stiffness: 400, damping: 15 }}
                  className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full gradient-gold text-[10px] font-bold text-zinc-900 shadow-lg shadow-amber-900/30"
                >
                  {s.step}
                </motion.span>
              </div>
              <h3 className="mb-2 text-lg font-bold text-white">{s.title}</h3>
              <p className="text-sm text-zinc-500">{s.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   TESTIMONIALS
   ═══════════════════════════════════════════════════ */

const TESTIMONIALS = [
  { name: "Sophie Martin", role: "Directrice, Agence Prestige Immobilier", text: "Nos biens se vendent 2× plus vite depuis qu'on utilise VIMIMO. La qualité des vidéos est bluffante, nos clients adorent.", rating: 5 },
  { name: "Thomas Leclerc", role: "Agent indépendant, Lyon", text: "Le rapport qualité-prix est imbattable. Un staging photo + vidéo professionnel en 24h pour le prix d'un café au resto. Game changer.", rating: 5 },
  { name: "Émilie Dubois", role: "Réseau Century 21, Paris", text: "On a testé 3 solutions de staging virtuel. VIMIMO est la seule où le résultat passe le test du 'c'est vraiment meublé ?'", rating: 5 },
];

function TestimonialsSection() {
  return (
    <section className="relative py-32 px-6">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="mx-auto max-w-6xl"
      >
        <motion.div variants={fadeUpChild} className="text-center mb-16">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-amber-400">
            <Star className="h-3 w-3" />
            Témoignages
          </span>
          <h2 className="mt-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
            Ils nous font <span className="text-gradient-gold">confiance</span>
          </h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              variants={fadeUpChild}
              whileHover={{ y: -6, transition: { type: "spring", stiffness: 300 } }}
              className="group relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/30 p-8 transition-all duration-500 hover:border-zinc-700 hover:bg-zinc-900/60"
            >
              {/* Hover glow */}
              <div className="absolute -inset-px rounded-3xl opacity-0 blur-xl transition-opacity duration-700 group-hover:opacity-100 bg-amber-500/5" />
              <div className="relative">
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <motion.div
                      key={j}
                      initial={{ opacity: 0, scale: 0, rotate: -180 }}
                      whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + j * 0.08, type: "spring", stiffness: 400 }}
                    >
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    </motion.div>
                  ))}
                </div>
                <p className="mb-6 text-sm leading-relaxed text-zinc-300">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-gold text-sm font-bold text-zinc-900">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-zinc-500">{t.role}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   PRICING
   ═══════════════════════════════════════════════════ */

function AnimatedPrice({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 100, damping: 20 });
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useMotionValueEvent(spring, "change", (v) => {
    setDisplay(Math.round(v));
  });

  return <span className="tabular-nums">{display}€</span>;
}

function PricingSection() {
  const [sliderValue, setSliderValue] = useState(3);

  const totalPrice = getEnterprisePrice(sliderValue);
  const unitPrice = getUnitPrice(sliderValue);

  const increment = () => setSliderValue((v) => Math.min(v + 1, 10));
  const decrement = () => setSliderValue((v) => Math.max(v - 1, 1));

  return (
    <section id="pricing" className="relative py-32 px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/[0.02] to-transparent" />
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="relative mx-auto max-w-5xl"
      >
        <motion.div variants={fadeUpChild} className="text-center mb-16">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-amber-400">
            <Building2 className="h-3 w-3" />
            Tarifs transparents
          </span>
          <h2 className="mt-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
            Un prix simple,{" "}
            <span className="text-gradient-gold">sans surprise</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
            Payez uniquement ce dont vous avez besoin. Plus vous commandez, moins c&apos;est cher.
          </p>
        </motion.div>

        <motion.div variants={fadeUpChild} className="grid gap-8 lg:grid-cols-2">
          {/* Slider card with animated gradient border */}
          <GradientBorder active>
            <div className="relative overflow-hidden p-10">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 via-transparent to-transparent" />
              <div className="relative">
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 400 }}
                  className="absolute -top-2 -right-2 rounded-full gradient-gold px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-900"
                >
                  Populaire
                </motion.div>

                <h3 className="text-2xl font-bold text-white">Pack Personnalisé</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  Choisissez le nombre de biens qui vous convient
                </p>

                <div className="mt-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-zinc-400">Nombre de biens</span>
                    <div className="flex items-center gap-3">
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.85 }}
                        onClick={decrement}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 transition hover:border-amber-500/30 hover:text-white cursor-pointer"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </motion.button>
                      <motion.span
                        key={sliderValue}
                        initial={{ scale: 1.4, opacity: 0.5 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-10 text-center text-2xl font-bold text-gradient-gold"
                      >
                        {sliderValue}
                      </motion.span>
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.85 }}
                        onClick={increment}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 transition hover:border-amber-500/30 hover:text-white cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </motion.button>
                    </div>
                  </div>

                  <div className="relative mt-4">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={sliderValue}
                      onChange={(e) => setSliderValue(parseInt(e.target.value))}
                      className="slider-gold w-full cursor-pointer appearance-none bg-transparent"
                    />
                    <div className="flex justify-between px-[2px] mt-2">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <motion.span
                          key={i}
                          animate={{
                            color: i + 1 <= sliderValue ? "#fbbf24" : "#3f3f46",
                            scale: i + 1 === sliderValue ? 1.3 : 1,
                          }}
                          className="text-[10px] tabular-nums"
                        >
                          {i + 1}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Animated price */}
                <div className="mt-10 flex items-end gap-2">
                  <span className="text-5xl font-extrabold text-white">
                    <AnimatedPrice value={totalPrice} />
                  </span>
                  <div className="mb-1.5 flex flex-col">
                    <span className="text-sm text-zinc-500">soit {unitPrice}€/bien</span>
                    <AnimatePresence mode="wait">
                      {sliderValue >= 5 && (
                        <motion.span
                          key="discount"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-xs text-emerald-400 font-medium"
                        >
                          -{Math.round((1 - unitPrice / 39) * 100)}% vs. unitaire
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <ul className="mt-8 space-y-3">
                  {[
                    "5 options de staging IA / pièce",
                    "Vidéo cinématique HD par bien",
                    "Expert valide chaque résultat",
                    "Livraison sous 24h garantie",
                    "Photos + Vidéos sans filigrane",
                  ].map((f, i) => (
                    <motion.li
                      key={f}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 * i, ease: EASE }}
                      className="flex items-center gap-3 text-sm text-zinc-300"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" />
                      {f}
                    </motion.li>
                  ))}
                </ul>

                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="mt-10">
                  <Link
                    href="/commander"
                    className="group/btn flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 font-bold text-zinc-900 shadow-lg shadow-amber-900/20 transition-shadow duration-500 hover:shadow-[0_0_40px_rgba(212,175,55,0.3)] gradient-gold relative"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-700" />
                    <span className="relative">Commander {sliderValue} bien{sliderValue > 1 ? "s" : ""}</span>
                    <ArrowRight className="relative h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Link>
                </motion.div>
              </div>
            </div>
          </GradientBorder>

          {/* Enterprise card */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/50 p-10 transition-all duration-500 hover:border-zinc-700"
          >
            <div className="absolute -inset-px rounded-3xl opacity-0 blur-xl transition-opacity duration-700 group-hover:opacity-100 bg-zinc-500/5" />
            <div className="relative flex h-full flex-col">
              <div className="flex items-center gap-3 mb-2">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800"
                >
                  <Building2 className="h-5 w-5 text-zinc-400" />
                </motion.div>
                <h3 className="text-2xl font-bold text-white">Entreprise</h3>
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                Plus de 10 biens ? Tarifs dégressifs sur mesure, facturation, et accompagnement dédié.
              </p>

              <div className="mt-8 flex items-end gap-2">
                <span className="text-5xl font-extrabold text-white">Sur mesure</span>
              </div>

              <ul className="mt-8 space-y-3 flex-1">
                {[
                  "Volume illimité (10+ biens)",
                  "Tarif dégressif négocié",
                  "Account manager dédié",
                  "Facturation mensuelle",
                  "Intégration API disponible",
                  "SLA de livraison garanti",
                  "Marque blanche possible",
                ].map((f, i) => (
                  <motion.li
                    key={f}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 * i, ease: EASE }}
                    className="flex items-center gap-3 text-sm text-zinc-300"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-zinc-500" />
                    {f}
                  </motion.li>
                ))}
              </ul>

              <motion.a
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                href="mailto:contact@vimimo.fr?subject=Plan Entreprise VIMIMO"
                className="mt-10 flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-800/50 py-4 font-bold text-white transition-all duration-300 hover:border-zinc-600 hover:bg-zinc-800"
              >
                <Send className="h-4 w-4" />
                Nous contacter
              </motion.a>
            </div>
          </motion.div>
        </motion.div>

        <motion.p
          variants={fadeUpChild}
          className="mt-10 text-center text-sm text-zinc-600"
        >
          Paiement sécurisé par Stripe. Satisfait ou remboursé sous 7 jours.
        </motion.p>
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   FAQ
   ═══════════════════════════════════════════════════ */

const FAQS = [
  { q: "Qu'est-ce que le virtual staging ?", a: "Le virtual staging consiste à meubler et décorer numériquement des photos de pièces vides. Notre IA produit des résultats photoréalistes, validés par un expert, en moins de 24h." },
  { q: "Combien de temps pour recevoir mes visuels ?", a: "Livraison garantie sous 24h après validation du paiement. La plupart des commandes sont livrées en moins de 12h." },
  { q: "Qui valide le résultat ?", a: "Un expert en architecture d'intérieur vérifie chaque rendu avant livraison : cohérence des matériaux, perspectives, lumières. Zéro hallucination IA." },
  { q: "Est-ce que la vidéo est incluse ?", a: "Oui, chaque bien inclut une vidéo cinématique HD avec transitions fluides, prête à publier sur les réseaux sociaux ou les plateformes immobilières." },
  { q: "Puis-je avoir un devis pour plus de 10 biens ?", a: "Absolument. Contactez-nous à contact@vimimo.fr pour un tarif dégressif personnalisé, avec facturation mensuelle et account manager dédié." },
];

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="relative py-32 px-6">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="mx-auto max-w-3xl"
      >
        <motion.div variants={fadeUpChild} className="text-center mb-16">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-amber-400">
            FAQ
          </span>
          <h2 className="mt-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
            Questions <span className="text-gradient-gold">fréquentes</span>
          </h2>
        </motion.div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <motion.div
              key={i}
              variants={fadeUpChild}
              className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30 transition-colors hover:border-zinc-700"
            >
              <motion.button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                whileHover={{ backgroundColor: "rgba(39,39,42,0.3)" }}
                className="flex w-full items-center justify-between p-6 text-left cursor-pointer"
              >
                <span className="pr-4 font-semibold text-white">{faq.q}</span>
                <motion.div
                  animate={{ rotate: openIndex === i ? 90 : 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <ChevronRight className="h-5 w-5 shrink-0 text-zinc-500" />
                </motion.div>
              </motion.button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-6 text-sm leading-relaxed text-zinc-400">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   FINAL CTA
   ═══════════════════════════════════════════════════ */

function FinalCTASection() {
  return (
    <section className="relative py-32 px-6">
      <div className="absolute inset-0 bg-gradient-to-t from-amber-500/[0.03] via-transparent to-transparent" />
      <Particles count={15} />
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="relative mx-auto max-w-3xl text-center"
      >
        <h2 className="text-4xl font-bold sm:text-5xl lg:text-6xl">
          Prêt à vendre le{" "}
          <span className="text-gradient-gold">potentiel</span> ?
        </h2>
        <p className="mt-6 text-lg text-zinc-400">
          Rejoignez les 500+ agences qui transforment leurs annonces avec VIMIMO.
          Votre premier projet en moins de 5 minutes.
        </p>
        <motion.div
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, ease: EASE }}
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/commander"
              className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-2xl px-10 py-5 text-lg font-bold text-zinc-900 shadow-[0_0_50px_rgba(212,175,55,0.2)] transition-shadow duration-500 hover:shadow-[0_0_70px_rgba(212,175,55,0.35)]"
            >
              <span className="absolute inset-0 gradient-gold" />
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
              <Sparkles className="relative h-5 w-5" />
              <span className="relative">Démarrer un projet</span>
              <ArrowRight className="relative h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════ */

function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="border-t border-zinc-800/50 py-12 px-6"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-gold">
            <Sparkles className="h-4 w-4 text-zinc-900" />
          </div>
          <span
            className="text-lg font-bold text-gradient-gold"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            VIMIMO
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500">
          <a href="mailto:contact@vimimo.fr" className="transition-colors hover:text-zinc-300">Contact</a>
          <Link href="/pricing" className="transition-colors hover:text-zinc-300">Tarifs</Link>
          <Link href="/login" className="transition-colors hover:text-zinc-300">Connexion</Link>
        </div>
        <p className="text-xs text-zinc-700">
          &copy; {new Date().getFullYear()} VIMIMO. Tous droits réservés.
        </p>
      </div>
    </motion.footer>
  );
}

/* ═══════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════ */

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0A0A0B]">
      <Navbar />
      <HeroSection />
      <ShowcaseSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <FinalCTASection />
      <Footer />
    </div>
  );
}
