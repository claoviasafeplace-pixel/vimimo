"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { LogIn, LogOut, Coins, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function AuthButton() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return <div className="h-9 w-20 animate-pulse rounded-lg bg-surface-hover" />;
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
      >
        <LogIn className="h-4 w-4" />
        Connexion
      </Link>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="inline-flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm transition-colors hover:bg-surface-hover cursor-pointer"
      >
        {session.user.image ? (
          <img
            src={session.user.image}
            alt=""
            className="h-6 w-6 rounded-full"
          />
        ) : (
          <User className="h-5 w-5 text-muted" />
        )}
        <span className="inline-flex items-center gap-1 text-badge-gold-text font-medium">
          <Coins className="h-3.5 w-3.5" />
          {session.user.credits}
        </span>
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-surface p-2 shadow-xl">
          <div className="border-b border-border px-3 py-2 mb-2">
            <p className="text-sm font-medium truncate">
              {session.user.name || session.user.email}
            </p>
            <p className="text-xs text-muted truncate">{session.user.email}</p>
          </div>

          <Link
            href="/dashboard"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-surface-hover"
          >
            <User className="h-4 w-4 text-muted" />
            Dashboard
          </Link>

          <Link
            href="/pricing"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-surface-hover"
          >
            <Coins className="h-4 w-4 text-muted" />
            Acheter des crédits
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-surface-hover cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}
