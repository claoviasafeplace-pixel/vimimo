import { Camera, Palette, ShieldCheck, Download } from "lucide-react";

const STEPS = [
  {
    step: "01",
    icon: Camera,
    title: "Uploadez vos photos",
    description:
      "Photographiez les pièces de votre bien avec votre smartphone. Jusqu'à 6 photos par bien.",
  },
  {
    step: "02",
    icon: Palette,
    title: "Choisissez votre style",
    description:
      "Scandinave, moderne, classique… Sélectionnez l'ambiance qui correspond au bien et à sa cible.",
  },
  {
    step: "03",
    icon: ShieldCheck,
    title: "Un expert valide",
    description:
      "Notre IA génère 5 options par pièce. Un expert vérifie et sélectionne le meilleur résultat pour vous.",
  },
  {
    step: "04",
    icon: Download,
    title: "Recevez tout sous 24h",
    description:
      "Photos stagées + vidéo avant/après par email. Prêt à publier dans vos annonces et réseaux sociaux.",
  },
];

const STEP_DELAYS = [
  "",
  "animate-delay-100",
  "animate-delay-200",
  "animate-delay-300",
] as const;

export default function HowItWorksSection() {
  return (
    <section id="how" className="py-24 px-6 lg:py-32 border-t border-border bg-surface/30">
      <div className="mx-auto max-w-5xl">
        <div
          className="mx-auto max-w-3xl text-center mb-16 animate-fade-in-up"
        >
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-badge-gold-border bg-badge-gold-bg px-3 py-1 text-xs font-medium tracking-wide text-badge-gold-text uppercase">
            4 étapes simples
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Comment ça <span className="text-gradient-gold">marche</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            Du smartphone à l&apos;annonce en 24h. Aucun logiciel, aucune compétence technique requise.
          </p>
        </div>

        <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Connector line */}
          <div className="absolute top-14 left-[12.5%] right-[12.5%] hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />

          {STEPS.map((step, i) => (
            <div
              key={step.step}
              className={`relative text-center group animate-fade-in-up ${STEP_DELAYS[i] ?? ""}`}
            >
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl gradient-gold text-white shadow-lg shadow-[rgba(196,122,90,0.15)] transition-transform duration-300 group-hover:scale-110">
                <step.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="mb-2 text-xs font-bold tracking-wider text-badge-gold-text uppercase">
                Étape {step.step}
              </div>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
