import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Paiement confirmé",
  description: "Votre paiement a été confirmé. Vos crédits sont disponibles.",
  robots: { index: false, follow: false },
};

export default function SuccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
