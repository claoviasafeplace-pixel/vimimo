"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Film, Image } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const COMPARISONS = [
  {
    before: "https://instahomevirtualstaging.com/wp-content/uploads/2024/10/Before-Empty-Livingroom-1.jpeg",
    after: "https://instahomevirtualstaging.com/wp-content/uploads/2024/10/After-Virtually-Staged-Livingroom-in-Standard-Style-1.png",
    label: "Salon — Staging Contemporain",
    beforeText: "Pièce vide, difficile de se projeter",
    afterText: "Salon chaleureux, prêt à déclencher le coup de cœur",
  },
  {
    before: "https://instahomevirtualstaging.com/wp-content/uploads/2024/10/Before-Empty-Master-BedRoom-1.jpeg",
    after: "https://instahomevirtualstaging.com/wp-content/uploads/2024/10/After-Virtually-Staged-Bedroom-in-Standard-Style-1.webp",
    label: "Chambre — Staging Scandinave",
    beforeText: "Chambre vide, sans âme",
    afterText: "Ambiance cosy et lumineuse, envie d'y vivre",
  },
];

const STATS = [
  { value: "+47%", label: "de visites en plus" },
  { value: "24h", label: "délai de livraison" },
  { value: "5", label: "styles au choix" },
  { value: "100%", label: "vérifié par un expert" },
];

function BeforeAfterSlider({ before, after, label, beforeText, afterText }: {
  before: string; after: string; label: string; beforeText: string; afterText: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const updatePosition = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

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
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border cursor-col-resize select-none shadow-lg shadow-[rgba(28,25,23,0.06)]"
        onMouseDown={(e) => { setIsDragging(true); updatePosition(e.clientX); }}
        onTouchStart={(e) => { setIsDragging(true); updatePosition(e.touches[0].clientX); }}
        role="slider"
        aria-label={`Curseur avant/après : ${label}`}
        aria-valuenow={Math.round(position)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 2));
          if (e.key === "ArrowRight") setPosition((p) => Math.min(100, p + 2));
        }}
      >
        {/* After (background) */}
        <img src={after} alt={`Après staging IA — ${afterText}`} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        {/* Before (clipped) */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
          <img src={before} alt={`Avant — ${beforeText}`} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        </div>
        {/* Divider */}
        <div
          className="absolute top-0 bottom-0 z-10 w-0.5 bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.3)]"
          style={{ left: `${position}%`, transform: "translateX(-50%)" }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg border border-[rgba(28,25,23,0.1)]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4.5 3L1.5 8L4.5 13M11.5 3L14.5 8L11.5 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground" />
            </svg>
          </div>
        </div>
        {/* Labels */}
        <div className="absolute top-4 left-4 z-20">
          <span className="rounded-full bg-foreground/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">AVANT</span>
        </div>
        <div className="absolute top-4 right-4 z-20">
          <span className="rounded-full gradient-gold px-3 py-1 text-xs font-semibold text-white">APRÈS</span>
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted px-1">
        <span>{beforeText}</span>
        <span className="font-medium text-badge-gold-text">{afterText}</span>
      </div>
    </div>
  );
}

export default function BeforeAfterSection() {
  return (
    <>
      {/* Stats bar */}
      <section className="relative z-10 border-y border-border bg-surface/40">
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
              <p className="text-3xl font-bold text-gradient-gold sm:text-4xl">{stat.value}</p>
              <p className="mt-1.5 text-sm text-muted">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Before / After */}
      <section id="demo" className="py-24 px-6 lg:py-32">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="mx-auto max-w-3xl text-center mb-16"
          >
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-badge-gold-border bg-badge-gold-bg px-3 py-1 text-xs font-medium tracking-wide text-badge-gold-text uppercase">
              Avant / Après
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Jugez par <span className="text-gradient-gold">vous-même</span>
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              Glissez le curseur pour révéler la transformation.
              C&apos;est exactement ce que vos acheteurs verront dans l&apos;annonce.
            </p>
          </motion.div>

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
                <BeforeAfterSlider {...comp} />
              </motion.div>
            ))}
          </div>

          {/* Video + media mention */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mt-14 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/50 px-5 py-3 backdrop-blur-sm">
              <Film className="h-5 w-5 text-icon-accent shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">Vidéos avant/après incluses</p>
                <p className="text-xs text-muted">Montages cinématiques prêts pour vos annonces</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/50 px-5 py-3 backdrop-blur-sm">
              <Image className="h-5 w-5 text-icon-accent shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">Reels & stories prêts</p>
                <p className="text-xs text-muted">Format vertical pour Instagram & TikTok</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
