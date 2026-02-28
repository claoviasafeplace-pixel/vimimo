"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  CreditCard,
  Plus,
  Coins,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import AuthButton from "@/components/auth/AuthButton";
import ThemeToggle from "@/components/ui/ThemeToggle";

const NAV_ITEMS = [
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { label: "Mes projets", href: "/dashboard#projects", icon: FolderKanban },
  { label: "Facturation", href: "/api/billing/portal", icon: CreditCard, external: true },
];

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const credits = session?.user?.credits ?? 0;

  return (
    <div className="flex min-h-screen">
      {/* ─── Sidebar (desktop) ─── */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-border/50 bg-surface/30 backdrop-blur-xl">
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-border/50">
          <Link href="/" className="text-lg font-bold tracking-widest text-gradient-gold">
            VIMIMO
          </Link>
        </div>

        {/* Credits card */}
        <div className="px-4 pt-6 pb-2">
          <div className="rounded-xl border border-badge-gold-border/40 bg-badge-gold-bg/30 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-badge-gold-text">
              <Coins className="h-3.5 w-3.5" />
              Biens restants
            </div>
            <p className="mt-2 text-3xl font-bold text-gradient-gold">{credits}</p>
            <Link
              href="/pricing"
              className="mt-3 flex items-center justify-center gap-1.5 rounded-lg gradient-gold px-3 py-2 text-xs font-semibold text-zinc-900 transition-opacity hover:opacity-90"
            >
              <Plus className="h-3 w-3" />
              Recharger
            </Link>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === pathname;
            const El = item.external ? "a" : Link;
            return (
              <El
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-badge-gold-bg/40 text-badge-gold-text border border-badge-gold-border/30"
                    : "text-muted hover:text-foreground hover:bg-surface-hover border border-transparent"
                }`}
              >
                <item.icon className={`h-4.5 w-4.5 ${isActive ? "text-icon-accent" : ""}`} />
                {item.label}
              </El>
            );
          })}
        </nav>

        {/* New project CTA */}
        <div className="px-4 pb-4">
          <Link
            href="/commander"
            className="flex items-center justify-center gap-2 rounded-xl gradient-gold px-4 py-3 text-sm font-semibold text-zinc-900 shadow-lg shadow-amber-900/20 transition-all hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nouveau projet
          </Link>
        </div>

        {/* User */}
        <div className="border-t border-border/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-gold text-sm font-bold text-zinc-900 shrink-0">
              {session?.user?.name?.[0] || session?.user?.email?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {session?.user?.name || "Utilisateur"}
              </p>
              <p className="text-xs text-muted truncate">{session?.user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Mobile sidebar overlay ─── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 border-r border-border/50 bg-background/95 backdrop-blur-xl flex flex-col">
            {/* Mobile header */}
            <div className="flex h-16 items-center justify-between px-6 border-b border-border/50">
              <span className="text-lg font-bold tracking-widest text-gradient-gold">
                VIMIMO
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile credits */}
            <div className="px-4 pt-6 pb-2">
              <div className="rounded-xl border border-badge-gold-border/40 bg-badge-gold-bg/30 p-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-badge-gold-text">
                  <Coins className="h-3.5 w-3.5" />
                  Biens restants
                </div>
                <p className="mt-2 text-3xl font-bold text-gradient-gold">{credits}</p>
              </div>
            </div>

            {/* Mobile nav */}
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = item.href === pathname;
                const El = item.external ? "a" : Link;
                return (
                  <El
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-badge-gold-bg/40 text-badge-gold-text"
                        : "text-muted hover:text-foreground hover:bg-surface-hover"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    <ChevronRight className="ml-auto h-4 w-4 opacity-40" />
                  </El>
                );
              })}
            </nav>

            <div className="px-4 pb-4">
              <Link
                href="/commander"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl gradient-gold px-4 py-3 text-sm font-semibold text-zinc-900"
              >
                <Plus className="h-4 w-4" />
                Nouveau projet
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* ─── Main content ─── */}
      <div className="flex-1 lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 bg-background/70 backdrop-blur-xl px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface lg:hidden cursor-pointer"
              aria-label="Menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            {/* Mobile logo */}
            <Link href="/" className="text-sm font-bold tracking-widest text-gradient-gold lg:hidden">
              VIMIMO
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile credits badge */}
            <div className="flex items-center gap-1.5 rounded-full border border-badge-gold-border bg-badge-gold-bg/40 px-3 py-1 text-xs font-semibold text-badge-gold-text lg:hidden">
              <Coins className="h-3 w-3" />
              {credits}
            </div>
            <ThemeToggle />
            <AuthButton />
          </div>
        </header>

        {/* Page content */}
        <main className="px-6 py-8 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
