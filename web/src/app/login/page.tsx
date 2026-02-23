"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LoginForm from "@/components/auth/LoginForm";
import Card from "@/components/ui/Card";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  if (status === "loading" || session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-spinner border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <a href="/" className="mb-8 text-3xl font-bold text-gradient-gold">
        VIMIMO
      </a>

      <Card className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold">Connexion</h1>
          <p className="mt-1 text-sm text-muted">
            Connectez-vous pour créer vos projets de staging
          </p>
        </div>
        <LoginForm />
      </Card>

      <p className="mt-6 text-center text-xs text-muted max-w-sm">
        En vous connectant, vous acceptez nos conditions d&apos;utilisation et
        notre politique de confidentialité.
      </p>
    </div>
  );
}
