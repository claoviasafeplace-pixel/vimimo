"use client";

import { useState } from "react";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Une erreur est survenue");
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <a href="/" className="mb-8 text-3xl font-bold text-gradient-gold">
        VIMIMO
      </a>

      <Card className="w-full max-w-md">
        {sent ? (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-badge-gold-bg">
              <Mail className="h-8 w-8 text-badge-gold-text" />
            </div>
            <h2 className="text-xl font-bold">Vérifiez vos emails</h2>
            <p className="text-sm text-muted">
              Si un compte existe avec <strong className="text-foreground">{email}</strong>,
              vous recevrez un lien de réinitialisation.
            </p>
            <a
              href="/login"
              className="inline-flex items-center gap-1 text-sm text-icon-accent hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à la connexion
            </a>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold">Mot de passe oublié</h1>
              <p className="mt-1 text-sm text-muted">
                Entrez votre email pour recevoir un lien de réinitialisation
              </p>
            </div>

            {error && (
              <p role="alert" className="mb-4 text-sm text-red-500 text-center">{error}</p>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                aria-label="Adresse email"
                required
                className="w-full rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent-from focus:outline-none focus:ring-1 focus:ring-accent-from/30"
              />
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                size="lg"
                disabled={loading || !email}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Envoyer le lien
              </Button>
            </form>

            <p className="mt-4 text-sm text-center">
              <a
                href="/login"
                className="inline-flex items-center gap-1 text-icon-accent hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour à la connexion
              </a>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
