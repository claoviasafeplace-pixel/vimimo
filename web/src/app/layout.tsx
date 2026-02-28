import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/hooks/useTheme";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://vimimo.fr"),
  title: {
    default: "VIMIMO — Virtual Staging IA",
    template: "%s | VIMIMO",
  },
  description:
    "Transformez vos photos de pièces vides en vidéos de staging professionnel grâce à l'intelligence artificielle.",
  openGraph: {
    type: "website",
    siteName: "VIMIMO",
    title: "VIMIMO — Virtual Staging IA",
    description:
      "Transformez vos photos de pièces vides en vidéos de staging professionnel grâce à l'IA.",
  },
  twitter: {
    card: "summary_large_image",
    title: "VIMIMO — Virtual Staging IA",
    description:
      "Transformez vos photos de pièces vides en vidéos de staging professionnel grâce à l'IA.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${playfair.variable} antialiased bg-background text-foreground`}
      >
        <SessionProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
