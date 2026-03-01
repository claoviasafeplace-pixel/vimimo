import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Conditions Générales de Vente",
  robots: { index: false, follow: true },
};

export default function CGVPage() {
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

        <h1 className="text-3xl font-bold mb-8">Conditions Générales de Vente</h1>

        <div className="space-y-6 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Objet</h2>
            <p>
              Les présentes CGV régissent les conditions de vente des services de staging
              virtuel par IA proposés par VIMIMO. En passant commande, le client accepte
              sans réserve les présentes conditions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Services proposés</h2>
            <p>
              VIMIMO propose un service de home staging virtuel par intelligence artificielle.
              Le client envoie des photos de biens immobiliers et reçoit des visuels mis en scène
              (images et/ou vidéos) validés par un expert. La livraison s&apos;effectue sous 24h ouvrées.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Tarifs</h2>
            <p>
              Les tarifs sont indiqués en euros hors taxes (HT). La TVA au taux en vigueur (20%)
              est appliquée au moment du paiement. Les tarifs peuvent être modifiés à tout moment,
              les commandes en cours restent au tarif en vigueur lors de l&apos;achat.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Paiement</h2>
            <p>
              Le paiement s&apos;effectue en ligne par carte bancaire via Stripe.
              Le paiement est exigible immédiatement à la commande.
              Les packs de crédits achetés sont utilisables sans limite de durée.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Droit de rétractation</h2>
            <p>
              Conformément à l&apos;article L221-28 du Code de la consommation, le droit de
              rétractation ne s&apos;applique pas aux contenus numériques fournis sur un support
              immatériel dont l&apos;exécution a commencé avec l&apos;accord du consommateur.
              Le traitement IA démarre dès la soumission des photos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Propriété des livrables</h2>
            <p>
              Le client conserve la pleine propriété des photos originales envoyées.
              Les visuels générés par VIMIMO sont la propriété du client dès livraison
              et règlement complet. Le client peut les utiliser librement pour ses annonces
              immobilières.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Responsabilité</h2>
            <p>
              VIMIMO s&apos;engage à fournir un service de qualité. Les visuels générés par IA
              sont des représentations virtuelles et ne constituent pas un engagement sur l&apos;état
              réel du bien. VIMIMO ne saurait être tenu responsable de l&apos;utilisation
              faite des visuels par le client.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Litiges</h2>
            <p>
              Les présentes CGV sont soumises au droit français. En cas de litige,
              une solution amiable sera recherchée avant toute action judiciaire.
              À défaut, les tribunaux compétents seront ceux du ressort du siège de VIMIMO.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
