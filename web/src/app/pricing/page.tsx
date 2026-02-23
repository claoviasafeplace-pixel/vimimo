"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import AuthButton from "@/components/auth/AuthButton";
import ThemeToggle from "@/components/ui/ThemeToggle";
import PricingGrid from "@/components/pricing/PricingGrid";

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <a href="/" className="text-xl font-bold text-gradient-gold">
            VIMIMO
          </a>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <AuthButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold">Tarifs</h1>
          <p className="mt-3 text-muted">
            1 crédit = 1 pièce traitée (nettoyage + analyse + 5 options + vidéo IA)
          </p>
        </div>

        <PricingGrid />

        <p className="mt-10 text-center text-xs text-muted">
          Paiement sécurisé par Stripe. Annulez votre abonnement à tout moment.
        </p>
      </main>
    </div>
  );
}
