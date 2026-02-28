import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Commander — VIMIMO",
  description:
    "Commandez votre staging virtuel IA : uploadez vos photos, choisissez votre style et recevez vos visuels sous 24h.",
};

export default function CommanderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
