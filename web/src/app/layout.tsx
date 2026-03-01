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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "VIMIMO",
              url: "https://vimimo.fr",
              logo: "https://vimimo.fr/logo.png",
              description:
                "Virtual staging IA pour l'immobilier — photos meublées et vidéos cinématiques",
              sameAs: [],
            }),
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${playfair.variable} antialiased bg-background text-foreground`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-lg focus:bg-amber-500 focus:px-4 focus:py-2 focus:text-black focus:font-medium"
        >
          Aller au contenu principal
        </a>
        <SessionProvider>
          <ThemeProvider>
            <div id="main-content">{children}</div>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
