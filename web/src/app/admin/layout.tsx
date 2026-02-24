import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — VIMIMO",
  description: "Tableau de bord d'administration VIMIMO.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
