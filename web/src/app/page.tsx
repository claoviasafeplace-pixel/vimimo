"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import AuthButton from "@/components/auth/AuthButton";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Hero from "@/components/marketing/Hero";
import BeforeAfter from "@/components/marketing/BeforeAfter";
import HowItWorks from "@/components/marketing/HowItWorks";
import Stats from "@/components/marketing/Stats";
import CTASection from "@/components/marketing/CTASection";

export default function LandingPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen">
      {/* ─── Sticky Header ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <a href="/" className="text-xl font-bold text-gradient-gold tracking-wide">
            VIMIMO
          </a>
          <nav className="hidden items-center gap-6 sm:flex">
            <a href="#demo" className="text-sm text-muted hover:text-foreground transition-colors">
              Démo
            </a>
            <Link href="/pricing" className="text-sm text-muted hover:text-foreground transition-colors">
              Tarifs
            </Link>
            {session && (
              <Link href="/dashboard" className="text-sm text-muted hover:text-foreground transition-colors">
                Dashboard
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {session ? (
              <Link
                href="/new"
                className="rounded-lg gradient-gold px-4 py-2 text-sm font-semibold text-zinc-900 transition-opacity hover:opacity-90"
              >
                Nouveau projet
              </Link>
            ) : (
              <AuthButton />
            )}
          </div>
        </div>
      </header>

      {/* ─── Page content ─── */}
      <div className="pt-14">
        <Hero />
        <Stats />
        <BeforeAfter />
        <HowItWorks />
        <CTASection />
      </div>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border py-12 px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} VIMIMO. Tous droits réservés.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/pricing" className="text-sm text-muted hover:text-foreground transition-colors">
              Tarifs
            </Link>
            <Link href="/login" className="text-sm text-muted hover:text-foreground transition-colors">
              Connexion
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
