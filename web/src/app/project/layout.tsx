import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projet — VIMIMO",
  description:
    "Suivez l'avancement de votre projet de staging virtuel par IA.",
};

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
