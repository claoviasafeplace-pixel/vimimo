"use client";

import { motion } from "framer-motion";
import { Upload, Wand2, Film } from "lucide-react";
import Card from "@/components/ui/Card";

const features = [
  {
    icon: Upload,
    title: "Upload",
    description: "Glissez-déposez vos photos de pièces vides. Jusqu'à 20 photos par projet.",
  },
  {
    icon: Wand2,
    title: "IA Staging",
    description:
      "L'IA analyse chaque pièce et génère 5 options de staging professionnel à choisir.",
  },
  {
    icon: Film,
    title: "Vidéo Cinématique",
    description:
      "Vidéos de morphing avant/après et compilation finale prête à partager.",
  },
];

export default function Features() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="grid gap-6 sm:grid-cols-3">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 * i }}
          >
            <Card className="h-full text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-badge-gold-bg">
                <feature.icon className="h-6 w-6 text-icon-accent" />
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {feature.description}
              </p>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
