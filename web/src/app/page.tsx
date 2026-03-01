import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import BeforeAfterSection from "@/components/landing/BeforeAfterSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";
import FooterSection from "@/components/landing/FooterSection";

export const metadata: Metadata = {
  openGraph: {
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    images: ["/og-image.png"],
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Que comprend exactement le traitement d'un bien ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "1 bien = jusqu'à 6 pièces d'un même bien immobilier. Notre IA génère 5 options de décoration par pièce. Un expert sélectionne la meilleure option et vous recevez les photos stagées + une vidéo avant/après.",
      },
    },
    {
      "@type": "Question",
      name: "Combien de temps pour recevoir mes visuels ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Livraison sous 24h. Notre IA travaille en quelques minutes, puis un expert vérifie et valide chaque résultat avant de vous le livrer par email.",
      },
    },
    {
      "@type": "Question",
      name: "Puis-je choisir le style de décoration ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Oui. Vous choisissez parmi 5 styles (Scandinave, Moderne, Classique, Industriel, Bohème) lors de votre commande. Notre expert sélectionne ensuite la meilleure option pour chaque pièce.",
      },
    },
    {
      "@type": "Question",
      name: "Qui est l'expert qui valide les résultats ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Notre équipe interne de spécialistes en home staging vérifie la qualité de chaque résultat : cohérence du mobilier, perspective, éclairage. Vous ne recevez que des résultats impeccables.",
      },
    },
    {
      "@type": "Question",
      name: "Puis-je utiliser les images dans mes annonces ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolument. Tous les visuels livrés vous appartiennent et peuvent être utilisés librement dans vos annonces immobilières, sur les portails et sur les réseaux sociaux.",
      },
    },
    {
      "@type": "Question",
      name: "Quels formats de fichiers sont livrés ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Photos en haute résolution (JPEG), vidéos en MP4 (format paysage pour annonces, format vertical pour Reels/Stories). Tous les fichiers sont optimisés pour le web.",
      },
    },
    {
      "@type": "Question",
      name: "Et si le résultat ne me convient pas ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Notre expert peut relancer la génération avec un prompt ajusté. Nous ne livrons que des résultats conformes à nos standards de qualité.",
      },
    },
    {
      "@type": "Question",
      name: "Y a-t-il un engagement minimum ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Non. Les packs par bien sont sans engagement. Vous payez uniquement ce que vous consommez. Les abonnements sont mensuels et résiliables à tout moment.",
      },
    },
  ],
};

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "VIMIMO Virtual Staging",
  provider: { "@type": "Organization", name: "VIMIMO" },
  description:
    "Service de home staging virtuel par intelligence artificielle",
  areaServed: "FR",
  serviceType: "Virtual Staging",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <Navbar />
      <HeroSection />
      <BeforeAfterSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <FooterSection />
    </div>
  );
}
