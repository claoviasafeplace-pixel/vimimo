import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nouveau projet — VIMIMO",
  description: "Créez un projet de staging virtuel IA en quelques clics.",
};

export default function NewProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
