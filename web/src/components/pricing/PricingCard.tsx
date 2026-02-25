"use client";

import { Loader2, Check } from "lucide-react";
import { useState } from "react";
import Button from "@/components/ui/Button";
import type { CreditPack } from "@/lib/types";

interface PricingCardProps {
  pack: CreditPack;
  onBuy: (packId: string) => Promise<void>;
}

export default function PricingCard({ pack, onBuy }: PricingCardProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onBuy(pack.id);
    } finally {
      setLoading(false);
    }
  };

  const pricePerCredit = (pack.priceEur / pack.credits).toFixed(2);
  const priceTTC = (pack.priceEur * 1.2).toFixed(2).replace(".", ",");

  return (
    <div
      className={`relative rounded-2xl border p-6 flex flex-col ${
        pack.popular
          ? "border-accent-from/50 bg-badge-gold-bg shadow-lg shadow-amber-900/10"
          : "border-border bg-surface"
      }`}
    >
      {pack.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full gradient-gold px-4 py-1 text-xs font-semibold text-zinc-900">
            Populaire
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-bold">{pack.name}</h3>
        <p className="mt-1 text-sm text-muted">
          {pack.credits} crédit{pack.credits > 1 ? "s" : ""}
        </p>
        <p className="mt-1.5 text-xs text-badge-gold-text">{pack.tagline}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-bold">
            {pack.priceEur.toFixed(2).replace(".", ",")}€
          </span>
          <span className="text-sm font-medium text-muted">HT</span>
        </div>
        <p className="mt-1 text-xs text-muted">
          soit {priceTTC}€ TTC — {pricePerCredit.replace(".", ",")}€ HT / bien
        </p>
      </div>

      <ul className="mb-8 flex-1 space-y-2.5">
        <li className="flex items-center gap-2 text-sm text-feature-text">
          <Check className="h-4 w-4 text-icon-accent shrink-0" />
          {pack.credits} bien{pack.credits > 1 ? "s" : ""} immobilier{pack.credits > 1 ? "s" : ""} complet{pack.credits > 1 ? "s" : ""}
        </li>
        <li className="flex items-center gap-2 text-sm text-feature-text">
          <Check className="h-4 w-4 text-icon-accent shrink-0" />
          5 options de staging / pièce
        </li>
        <li className="flex items-center gap-2 text-sm text-feature-text">
          <Check className="h-4 w-4 text-icon-accent shrink-0" />
          Vidéo visite IA cinématique
        </li>
        <li className="flex items-center gap-2 text-sm text-feature-text">
          <Check className="h-4 w-4 text-icon-accent shrink-0" />
          Descriptions Insta &amp; TikTok
        </li>
      </ul>

      <Button
        onClick={handleClick}
        disabled={loading}
        variant={pack.popular ? "primary" : "secondary"}
        size="lg"
        className="w-full"
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        Acheter
      </Button>
    </div>
  );
}
