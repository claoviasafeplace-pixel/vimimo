"use client";

import { motion } from "framer-motion";
import { CheckCircle, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default function OrderSuccess() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-md text-center space-y-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full gradient-gold"
      >
        <CheckCircle className="h-10 w-10 text-zinc-900" />
      </motion.div>

      <div>
        <h2 className="text-2xl font-bold">Commande confirmée !</h2>
        <p className="mt-3 text-muted">
          Notre IA est au travail. Un expert vérifiera chaque résultat avant de
          vous livrer.
        </p>
      </div>

      <div className="rounded-2xl border border-badge-gold-border/30 bg-badge-gold-bg/20 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-icon-accent" />
          <div className="text-left">
            <p className="text-sm font-semibold">Livraison sous 24h</p>
            <p className="text-xs text-muted">
              Vous recevrez un email dès que vos visuels sont prêts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-icon-accent" />
          <div className="text-left">
            <p className="text-sm font-semibold">Qualité garantie</p>
            <p className="text-xs text-muted">
              Chaque résultat est vérifié par notre équipe
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/dashboard">
          <Button variant="primary" size="md">
            Voir mes commandes
          </Button>
        </Link>
        <Link href="/commander">
          <Button variant="secondary" size="md">
            Nouvelle commande
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
