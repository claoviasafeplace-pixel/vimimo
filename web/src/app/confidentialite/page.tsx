import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
};

export default function ConfidentialitePage() {
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

        <h1 className="text-3xl font-bold mb-8">Politique de confidentialité</h1>

        <div className="space-y-6 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Collecte des données</h2>
            <p>
              VIMIMO collecte les données suivantes lors de votre utilisation du service :
              adresse email, nom, photos de biens immobiliers téléchargées, et données de paiement
              (traitées par Stripe, jamais stockées sur nos serveurs).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Finalités du traitement</h2>
            <p>
              Vos données sont utilisées pour : la création et gestion de votre compte,
              le traitement de vos commandes de staging virtuel, l&apos;envoi de notifications
              liées à vos commandes, et l&apos;amélioration de nos services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Base légale</h2>
            <p>
              Le traitement de vos données est fondé sur l&apos;exécution du contrat (commande de staging)
              et votre consentement (création de compte).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Conservation</h2>
            <p>
              Vos données sont conservées pendant la durée de votre compte.
              Les photos et vidéos générées sont conservées 12 mois après leur création.
              Vous pouvez demander la suppression de votre compte et de vos données à tout moment.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Sous-traitants</h2>
            <p>
              Nous utilisons les services suivants : Vercel (hébergement), Supabase (base de données),
              Stripe (paiements), Resend (emails transactionnels), OpenAI et Replicate (traitement IA).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Vos droits</h2>
            <p>
              Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification,
              de suppression et de portabilité de vos données. Pour exercer ces droits,
              contactez-nous à : contact@vimimo.fr
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Cookies</h2>
            <p>
              VIMIMO utilise uniquement des cookies techniques nécessaires au fonctionnement
              du service (authentification, préférence de thème). Aucun cookie publicitaire
              ou de suivi n&apos;est utilisé.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
