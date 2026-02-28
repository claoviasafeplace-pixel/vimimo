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
  title: "VIMIMO — Home Staging Virtuel par IA",
  description:
    "Transformez vos photos de biens immobiliers en présentations irrésistibles. Staging IA + vidéo + validation expert. Livraison sous 24h.",
  openGraph: {
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    images: ["/og-image.png"],
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
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
