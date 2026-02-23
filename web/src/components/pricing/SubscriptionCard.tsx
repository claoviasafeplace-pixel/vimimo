"use client";

import { Loader2, Check } from "lucide-react";
import { useState } from "react";
import Button from "@/components/ui/Button";
import type { SubscriptionPlan } from "@/lib/types";

interface SubscriptionCardProps {
  plan: SubscriptionPlan;
  billing: "monthly" | "yearly";
  onSubscribe: (planId: string, billing: "monthly" | "yearly") => Promise<void>;
}

export default function SubscriptionCard({ plan, billing, onSubscribe }: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onSubscribe(plan.id, billing);
    } finally {
      setLoading(false);
    }
  };

  const isYearly = billing === "yearly";
  const displayPrice = isYearly
    ? Math.round(plan.priceEurYearly / 12)
    : plan.priceEur;
  const savings = isYearly
    ? plan.priceEur * 12 - plan.priceEurYearly
    : 0;
  const pricePerCredit = (displayPrice / plan.creditsPerMonth).toFixed(2);

  return (
    <div
      className={`relative rounded-2xl border p-6 flex flex-col ${
        plan.popular
          ? "border-accent-from/50 bg-badge-gold-bg shadow-lg shadow-amber-900/10"
          : "border-border bg-surface"
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full gradient-gold px-4 py-1 text-xs font-semibold text-zinc-900">
            Populaire
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-bold">{plan.name}</h3>
        <p className="mt-1 text-sm text-muted">
          {plan.creditsPerMonth} crédits / mois
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold">{displayPrice}€</span>
          <span className="text-sm text-muted"> / mois</span>
        </div>
        {isYearly && (
          <>
            <p className="mt-1 text-sm text-muted line-through">
              {plan.priceEur}€ / mois
            </p>
            <p className="mt-0.5 text-xs font-semibold text-green-400">
              Économisez {savings}€ / an
            </p>
          </>
        )}
        <p className="mt-1 text-xs text-muted">
          soit {pricePerCredit.replace(".", ",")}€ / pièce
        </p>
      </div>

      <ul className="mb-8 flex-1 space-y-2.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-feature-text">
            <Check className="h-4 w-4 text-icon-accent shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      <Button
        onClick={handleClick}
        disabled={loading}
        variant={plan.popular ? "primary" : "secondary"}
        size="lg"
        className="w-full"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        S&apos;abonner
      </Button>
    </div>
  );
}
