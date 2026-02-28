"use client";

import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function FooterSection() {
  return (
    <>
      {/* Final CTA */}
      <section className="relative py-32 px-6 border-t border-border overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute left-1/2 top-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[160px]"
            style={{
              background: "radial-gradient(circle, rgba(196,122,90,0.08) 0%, transparent 70%)",
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
            Prêt à transformer vos{" "}
            <span className="text-gradient-gold">annonces</span> ?
          </h2>
          <p className="mt-5 text-lg text-muted">
            Envoyez vos premières photos et recevez une présentation premium de votre bien sous 24h.
            Sans engagement, sans logiciel.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/commander"
              className="group inline-flex items-center gap-2.5 rounded-xl gradient-gold px-8 py-4 text-base font-semibold text-white shadow-xl shadow-[rgba(196,122,90,0.20)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_0_30px_rgba(196,122,90,0.30)] hover:scale-[1.02]"
            >
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              Transformer mes photos
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface/60 px-7 py-4 text-base font-medium text-foreground backdrop-blur-sm transition-all hover:bg-surface-hover"
            >
              Voir les tarifs
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface/40">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <div className="mb-4">
                <span className="text-xl font-bold tracking-widest text-gradient-gold">
                  VIMIMO
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted max-w-xs">
                Home staging virtuel par IA avec validation expert.
                Des visuels premium pour vos annonces immobilières.
              </p>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
                Produit
              </h4>
              <ul className="space-y-2.5">
                <li><a href="#demo" className="text-sm text-muted transition-colors hover:text-foreground">Avant / Après</a></li>
                <li><a href="#features" className="text-sm text-muted transition-colors hover:text-foreground">Fonctionnalités</a></li>
                <li><a href="#how" className="text-sm text-muted transition-colors hover:text-foreground">Comment ça marche</a></li>
                <li><a href="#pricing" className="text-sm text-muted transition-colors hover:text-foreground">Tarifs</a></li>
                <li><a href="#faq" className="text-sm text-muted transition-colors hover:text-foreground">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
                Accès
              </h4>
              <ul className="space-y-2.5">
                <li><Link href="/login" className="text-sm text-muted transition-colors hover:text-foreground">Connexion</Link></li>
                <li><Link href="/commander" className="text-sm text-muted transition-colors hover:text-foreground">Commander</Link></li>
                <li><Link href="/pricing" className="text-sm text-muted transition-colors hover:text-foreground">Tarifs détaillés</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
                Légal
              </h4>
              <ul className="space-y-2.5">
                <li><Link href="/mentions-legales" className="text-sm text-muted transition-colors hover:text-foreground">Mentions légales</Link></li>
                <li><Link href="/confidentialite" className="text-sm text-muted transition-colors hover:text-foreground">Politique de confidentialité</Link></li>
                <li><Link href="/cgv" className="text-sm text-muted transition-colors hover:text-foreground">CGV</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
            <p className="text-xs text-muted">
              &copy; {new Date().getFullYear()} VIMIMO. Tous droits réservés.
            </p>
            <p className="text-xs text-muted">
              Fait avec <span className="text-gradient-gold font-medium">&#9829;</span> à Paris
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
