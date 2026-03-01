import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Commander — VIMIMO",
  description:
    "Commandez votre staging virtuel IA : uploadez vos photos, choisissez votre style et recevez vos visuels sous 24h.",
  openGraph: {
    title: "Commander — VIMIMO",
    description:
      "Commandez votre staging virtuel IA : uploadez vos photos, choisissez votre style et recevez vos visuels sous 24h.",
    url: "https://vimimo.fr/commander",
    siteName: "VIMIMO",
    type: "website",
  },
};

export default function CommanderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
