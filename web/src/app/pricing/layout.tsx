import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tarifs — VIMIMO",
  description:
    "Packs de crédits et abonnements pour le home staging virtuel par IA.",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
