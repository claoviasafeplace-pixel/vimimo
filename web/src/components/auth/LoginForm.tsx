"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGoogle = () => {
    signIn("google", { callbackUrl: "/" });
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await signIn("resend", { email, redirect: false });
      setEmailSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-900/30">
          <Mail className="h-8 w-8 text-amber-300" />
        </div>
        <h2 className="text-xl font-bold">Vérifiez vos emails</h2>
        <p className="text-sm text-muted">
          Un lien de connexion a été envoyé à <strong className="text-foreground">{email}</strong>
        </p>
        <button
          onClick={() => setEmailSent(false)}
          className="text-sm text-amber-400 hover:underline cursor-pointer"
        >
          Utiliser une autre adresse
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Google */}
      <Button
        onClick={handleGoogle}
        variant="secondary"
        className="w-full gap-3"
        size="lg"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continuer avec Google
      </Button>

      {/* Separator */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-surface px-3 text-muted">ou</span>
        </div>
      </div>

      {/* Email */}
      <form onSubmit={handleEmail} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="votre@email.com"
          required
          className="w-full rounded-xl border border-border bg-zinc-900 px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
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
          Recevoir un lien de connexion
        </Button>
      </form>
    </div>
  );
}
