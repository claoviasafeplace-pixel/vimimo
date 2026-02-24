"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "10s", label: "par pièce" },
  { value: "5", label: "options de staging" },
  { value: "4K", label: "qualité vidéo" },
  { value: "95%", label: "satisfaction client" },
];

export default function Stats() {
  return (
    <section className="py-16 px-6 border-t border-border">
      <div className="mx-auto max-w-4xl">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.08 * i }}
              className="text-center"
            >
              <p className="text-4xl font-bold text-gradient-gold sm:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-muted">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
