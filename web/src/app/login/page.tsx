"use client";

import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import LoginForm from "@/components/auth/LoginForm";
import Card from "@/components/ui/Card";

function LoginContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  if (status === "loading" || session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-spinner border-t-transparent" role="status" aria-label="Chargement" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <a href="/" className="mb-8 text-3xl font-bold text-gradient-gold">
        VIMIMO
      </a>

      <Card className="w-full max-w-md">
        {errorParam && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {errorParam === "OAuthAccountNotLinked"
              ? "Cet email est déjà associé à un autre mode de connexion. Essayez avec votre mot de passe ou un magic link."
              : "Erreur de connexion. Veuillez réessayer."}
          </div>
        )}
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold">Connexion</h1>
          <p className="mt-1 text-sm text-muted">
            Connectez-vous pour suivre vos commandes de staging
          </p>
        </div>
        <LoginForm />
      </Card>

      <a
        href="/commander"
        className="mt-6 text-sm text-badge-gold-text hover:underline transition-colors"
      >
        Continuer en tant qu&apos;invité &rarr;
      </a>

      <p className="mt-4 text-center text-xs text-muted max-w-sm">
        En vous connectant, vous acceptez nos conditions d&apos;utilisation et
        notre politique de confidentialité.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-spinner border-t-transparent" role="status" aria-label="Chargement" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
