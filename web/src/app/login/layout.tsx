import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion — VIMIMO",
  description: "Connectez-vous à votre compte VIMIMO.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
