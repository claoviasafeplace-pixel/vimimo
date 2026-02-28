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
    default: "VIMIMO — Home Staging Virtuel par IA",
    template: "%s | VIMIMO",
  },
  description:
    "Transformez vos photos de biens immobiliers en présentations irrésistibles. Staging IA + vidéo + validation expert. Livraison sous 24h.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "VIMIMO",
    title: "VIMIMO — Home Staging Virtuel par IA",
    description:
      "Transformez vos photos de biens immobiliers en présentations irrésistibles. Staging IA + vidéo + validation expert.",
  },
  twitter: {
    card: "summary_large_image",
    title: "VIMIMO — Home Staging Virtuel par IA",
    description:
      "Transformez vos photos de biens immobiliers en présentations irrésistibles. Staging IA + vidéo + validation expert.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
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
