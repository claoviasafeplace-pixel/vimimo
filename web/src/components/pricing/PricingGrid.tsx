"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import PricingCard from "./PricingCard";
import SubscriptionCard from "./SubscriptionCard";
import { CREDIT_PACKS, SUBSCRIPTION_PLANS } from "@/lib/types";

type Tab = "subscriptions" | "packs";

export default function PricingGrid() {
  const router = useRouter();
  const { data: session } = useSession();
  const [tab, setTab] = useState<Tab>("subscriptions");

  const handleCheckout = async (params: { packId?: string; planId?: string }) => {
    if (!session) {
      router.push("/login");
      return;
    }

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      console.error("Checkout error");
      return;
    }

    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  return (
    <div>
      {/* Tabs */}
      <div className="mb-8 flex justify-center">
        <div className="inline-flex rounded-xl border border-border bg-surface p-1">
          <button
            onClick={() => setTab("subscriptions")}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors cursor-pointer ${
              tab === "subscriptions"
                ? "gradient-gold text-zinc-900"
                : "text-muted hover:text-foreground"
            }`}
          >
            Abonnements
          </button>
          <button
            onClick={() => setTab("packs")}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors cursor-pointer ${
              tab === "packs"
                ? "gradient-gold text-zinc-900"
                : "text-muted hover:text-foreground"
            }`}
          >
            Packs ponctuels
          </button>
        </div>
      </div>

      {/* Content */}
      {tab === "subscriptions" ? (
        <div className="grid gap-6 md:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <SubscriptionCard
              key={plan.id}
              plan={plan}
              onSubscribe={(planId) => handleCheckout({ planId })}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {CREDIT_PACKS.map((pack) => (
            <PricingCard
              key={pack.id}
              pack={pack}
              onBuy={(packId) => handleCheckout({ packId })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
