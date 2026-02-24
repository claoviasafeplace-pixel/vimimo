import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/hooks/useTheme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <SessionProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
