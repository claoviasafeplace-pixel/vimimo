"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (!token) {
      setError("Token manquant. Utilisez le lien reçu par email.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Une erreur est survenue");
        return;
      }
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent-from focus:outline-none focus:ring-1 focus:ring-accent-from/30";

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-badge-gold-bg">
          <CheckCircle className="h-8 w-8 text-badge-gold-text" />
        </div>
        <h2 className="text-xl font-bold">Mot de passe modifié</h2>
        <p className="text-sm text-muted">
          Votre mot de passe a été réinitialisé avec succès.
        </p>
        <a
          href="/login"
          className="inline-block text-sm text-icon-accent hover:underline"
        >
          Se connecter
        </a>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-xl font-bold">Lien invalide</h2>
        <p className="text-sm text-muted">
          Ce lien de réinitialisation est invalide ou a expiré.
        </p>
        <a
          href="/forgot-password"
          className="inline-block text-sm text-icon-accent hover:underline"
        >
          Demander un nouveau lien
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold">Nouveau mot de passe</h1>
        <p className="mt-1 text-sm text-muted">
          Choisissez un nouveau mot de passe pour votre compte
        </p>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-500 text-center">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nouveau mot de passe (min 8 caractères)"
            required
            minLength={8}
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <input
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirmer le mot de passe"
          required
          minLength={8}
          className={inputClass}
        />
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          size="lg"
          disabled={loading || !password || !confirmPassword}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Réinitialiser le mot de passe
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <a href="/" className="mb-8 text-3xl font-bold text-gradient-gold">
        VIMIMO
      </a>

      <Card className="w-full max-w-md">
        <Suspense
          fallback={
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </Card>
    </div>
  );
}
