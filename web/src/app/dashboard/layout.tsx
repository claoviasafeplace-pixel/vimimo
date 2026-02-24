import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — VIMIMO",
  description:
    "Gérez vos crédits, abonnements et projets de staging virtuel.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
