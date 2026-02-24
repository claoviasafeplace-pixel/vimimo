import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tarifs — VIMIMO",
  description:
    "1 Bien = staging IA complet + vidéo cinématique. Packs et abonnements sans engagement.",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
