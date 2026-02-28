"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { CheckCircle, ArrowRight, LogIn } from "lucide-react";
import { motion } from "framer-motion";

export default function SuccessPage() {
  const { data: session, update } = useSession();

  useEffect(() => {
    update();
  }, [update]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-md text-center"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-badge-gold-bg">
          <CheckCircle className="h-8 w-8 text-icon-accent" />
        </div>

        <h1 className="text-3xl font-bold">
          Paiement <span className="text-gradient-gold">confirmé</span>
        </h1>

        <p className="mt-4 text-muted">
          Commande reçue ! Notre IA est au travail. Un expert vérifiera chaque résultat
          avant de vous livrer sous 24h.
        </p>

        {session ? (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl gradient-gold px-6 py-3 text-sm font-semibold text-zinc-900 transition-opacity hover:opacity-90"
            >
              Voir mes commandes
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/commander"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface/50 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              Nouvelle commande
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-muted">
              Connectez-vous avec l&apos;email utilisé lors du paiement pour suivre votre commande.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl gradient-gold px-6 py-3 text-sm font-semibold text-zinc-900 transition-opacity hover:opacity-90"
            >
              <LogIn className="h-4 w-4" />
              Se connecter
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
