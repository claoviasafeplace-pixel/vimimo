import { Star } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Sophie M.",
    role: "Agent immobilier, Lyon",
    quote:
      "Je reçois mes visuels le lendemain. La qualité est irréprochable grâce à la validation par un expert. Mes mandants sont bluffés.",
    stars: 5,
  },
  {
    name: "Thomas D.",
    role: "Mandataire indépendant, Paris",
    quote:
      "Avant je perdais des heures à essayer de valoriser mes annonces. Maintenant j'envoie mes photos et tout est prêt — c'est un game changer.",
    stars: 5,
  },
  {
    name: "Claire B.",
    role: "Directrice d'agence, Bordeaux",
    quote:
      "Depuis qu'on utilise VIMIMO, nos biens vides reçoivent 3x plus de demandes de visite. Le ROI est immédiat.",
    stars: 5,
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-24 px-6 lg:py-32 border-t border-border bg-surface/30">
      <div className="mx-auto max-w-6xl">
        <div
          className="mx-auto max-w-3xl text-center mb-16 animate-fade-in-up"
        >
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-badge-gold-border bg-badge-gold-bg px-3 py-1 text-xs font-medium tracking-wide text-badge-gold-text uppercase">
            Témoignages
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Ils nous font <span className="text-gradient-gold">confiance</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            Ce que disent les professionnels de l&apos;immobilier qui utilisent VIMIMO au quotidien.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              itemScope
              itemType="https://schema.org/Review"
              className={`rounded-2xl border border-border bg-background p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[rgba(28,25,23,0.04)] animate-fade-in-up ${
                i === 0 ? "animate-delay-100" : i === 1 ? "animate-delay-200" : "animate-delay-300"
              }`}
            >
              <div className="flex gap-0.5 mb-4" aria-label={`${t.stars} étoiles sur 5`} itemProp="reviewRating" itemScope itemType="https://schema.org/Rating">
                <meta itemProp="ratingValue" content={String(t.stars)} />
                <meta itemProp="bestRating" content="5" />
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-amber-500 text-amber-500" aria-hidden="true" />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-feature-text italic" itemProp="reviewBody">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3" itemProp="author" itemScope itemType="https://schema.org/Person">
                <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-gold text-sm font-bold text-white">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold" itemProp="name">{t.name}</p>
                  <p className="text-xs text-muted" itemProp="jobTitle">{t.role}</p>
                </div>
              </div>
              <meta itemProp="itemReviewed" content="VIMIMO Virtual Staging" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
