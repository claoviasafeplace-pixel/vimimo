import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Mentions légales",
  robots: { index: false, follow: true },
};

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour
        </Link>

        <h1 className="text-3xl font-bold mb-8">Mentions légales</h1>

        <div className="space-y-6 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Éditeur du site</h2>
            <p>
              VIMIMO<br />
              Entrepreneur individuel<br />
              Email : contact@vimimo.fr
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Hébergement</h2>
            <p>
              Vercel Inc.<br />
              440 N Barranca Ave #4133, Covina, CA 91723, USA<br />
              Site web : vercel.com
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Propriété intellectuelle</h2>
            <p>
              L&apos;ensemble du contenu du site VIMIMO (textes, images, graphismes, logo, icônes, etc.)
              est protégé par le droit d&apos;auteur. Toute reproduction, même partielle, est interdite
              sans autorisation préalable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Données personnelles</h2>
            <p>
              Pour en savoir plus sur la collecte et le traitement de vos données personnelles,
              consultez notre{" "}
              <Link href="/confidentialite" className="text-foreground underline hover:text-badge-gold-text">
                politique de confidentialité
              </Link>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
