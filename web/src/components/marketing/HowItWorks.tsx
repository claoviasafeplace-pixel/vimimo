"use client";

import { motion } from "framer-motion";
import { Camera, Wand2, Rocket } from "lucide-react";

const steps = [
  {
    icon: Camera,
    step: "01",
    title: "Photographiez",
    description:
      "Prenez en photo vos pièces vides avec votre smartphone. Aucun matériel spécial requis.",
  },
  {
    icon: Wand2,
    step: "02",
    title: "L'IA décore",
    description:
      "Notre IA analyse la géométrie, la lumière et génère un staging professionnel en quelques minutes.",
  },
  {
    icon: Rocket,
    step: "03",
    title: "Vendez plus vite",
    description:
      "Recevez photos + vidéo cinématique avant/après prêtes à publier sur vos annonces.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 px-6 border-t border-border">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold sm:text-4xl">
            Comment ça <span className="text-gradient-gold">marche</span>
          </h2>
          <p className="mt-4 text-lg text-muted">
            3 étapes. Aucune compétence technique requise.
          </p>
        </motion.div>

        <div className="grid gap-8 sm:grid-cols-3">
          {steps.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              className="relative rounded-2xl border border-border bg-surface/50 p-8 text-center"
            >
              {/* Step number */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="rounded-full gradient-gold px-3 py-1 text-xs font-bold text-zinc-900">
                  {item.step}
                </span>
              </div>

              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-badge-gold-bg">
                <item.icon className="h-7 w-7 text-icon-accent" />
              </div>

              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
