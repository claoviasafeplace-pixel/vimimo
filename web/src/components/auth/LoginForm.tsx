"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Mail, Loader2, Eye, EyeOff } from "lucide-react";
import Button from "@/components/ui/Button";

type View = "login" | "register" | "magic";

export default function LoginForm() {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const resetForm = () => {
    setError("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  };

  const switchView = (v: View) => {
    resetForm();
    setView(v);
  };

  const handleGoogle = () => {
    signIn("google", { callbackUrl: "/" });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Email ou mot de passe incorrect");
      } else {
        window.location.href = "/";
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'inscription");
        return;
      }
      // Auto-login after registration
      const loginRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (loginRes?.error) {
        setError("Compte créé. Connectez-vous avec vos identifiants.");
        switchView("login");
      } else {
        window.location.href = "/";
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
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
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-badge-gold-bg">
          <Mail className="h-8 w-8 text-badge-gold-text" />
        </div>
        <h2 className="text-xl font-bold">Vérifiez vos emails</h2>
        <p className="text-sm text-muted">
          Un lien de connexion a été envoyé à <strong className="text-foreground">{email}</strong>
        </p>
        <button
          onClick={() => setEmailSent(false)}
          className="text-sm text-icon-accent hover:underline cursor-pointer"
        >
          Utiliser une autre adresse
        </button>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent-from focus:outline-none focus:ring-1 focus:ring-accent-from/30";

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

      {/* Error message */}
      {error && (
        <p role="alert" className="text-sm text-red-500 text-center">{error}</p>
      )}

      {/* LOGIN view */}
      {view === "login" && (
        <>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              aria-label="Adresse email"
              required
              className={inputClass}
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                aria-label="Mot de passe"
                required
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
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              size="lg"
              disabled={loading || !email || !password}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Se connecter
            </Button>
          </form>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <button
                onClick={() => switchView("register")}
                className="text-icon-accent hover:underline cursor-pointer"
              >
                Créer un compte
              </button>
              <button
                onClick={() => switchView("magic")}
                className="text-muted hover:underline cursor-pointer"
              >
                Lien magique
              </button>
            </div>
            <a
              href="/forgot-password"
              className="text-muted hover:underline cursor-pointer text-center"
            >
              Mot de passe oublié ?
            </a>
          </div>
        </>
      )}

      {/* REGISTER view */}
      {view === "register" && (
        <>
          <form onSubmit={handleRegister} className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Votre nom"
              aria-label="Votre nom"
              required
              minLength={2}
              className={inputClass}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              aria-label="Adresse email"
              required
              className={inputClass}
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe (min 8 caractères)"
                aria-label="Mot de passe"
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
              aria-label="Confirmer le mot de passe"
              required
              minLength={8}
              className={inputClass}
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              size="lg"
              disabled={loading || !name || !email || !password || !confirmPassword}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer mon compte
            </Button>
          </form>
          <p className="text-sm text-center">
            <span className="text-muted">Déjà un compte ? </span>
            <button
              onClick={() => switchView("login")}
              className="text-icon-accent hover:underline cursor-pointer"
            >
              Se connecter
            </button>
          </p>
        </>
      )}

      {/* MAGIC LINK view */}
      {view === "magic" && (
        <>
          <form onSubmit={handleMagicLink} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              aria-label="Adresse email"
              required
              className={inputClass}
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
          <p className="text-sm text-center">
            <button
              onClick={() => switchView("login")}
              className="text-icon-accent hover:underline cursor-pointer"
            >
              Se connecter avec un mot de passe
            </button>
          </p>
        </>
      )}
    </div>
  );
}
