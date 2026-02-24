"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Coins,
  Clock,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  CreditCard,
  CalendarClock,
  FolderKanban,
  Plus,
  Sparkles,
  ArrowRight,
  ImageIcon,
  Film,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProjectHistoryCard from "@/components/dashboard/ProjectHistoryCard";
import type { CreditTransaction } from "@/lib/types";
import { SUBSCRIPTION_PLANS } from "@/lib/types";

interface ProjectSummary {
  id: string;
  phase: string;
  mode: string;
  styleLabel: string;
  roomCount: number;
  thumbnailUrl: string | null;
  finalVideoUrl: string | null;
  studioMontageUrl: string | null;
  createdAt: number;
  error: string | null;
}

interface DashboardSubscription {
  plan_id: string;
  status: string;
  credits_per_period: number;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [subscription, setSubscription] = useState<DashboardSubscription | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/dashboard")
        .then((res) => res.json())
        .then((data) => {
          setTransactions(data.transactions || []);
          setSubscription(data.subscription || null);
        })
        .catch(console.error)
        .finally(() => setLoading(false));

      fetch("/api/dashboard/projects")
        .then((res) => res.json())
        .then((data) => setProjects(data.projects || []))
        .catch(console.error)
        .finally(() => setProjectsLoading(false));
    }
  }, [session?.user?.id]);

  if (!session) return null;

  const credits = session.user.credits ?? 0;
  const totalProjects = projects.length;
  const doneProjects = projects.filter((p) => p.phase === "done").length;
  const userName = session.user.name?.split(" ")[0] || session.user.email?.split("@")[0] || "Utilisateur";

  const planLabel = subscription
    ? SUBSCRIPTION_PLANS.find((p) => p.id === subscription.plan_id)?.name ?? subscription.plan_id
    : null;

  const txIcon = (type: CreditTransaction["type"]) => {
    switch (type) {
      case "purchase":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "deduction":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "refund":
        return <RotateCcw className="h-4 w-4 text-accent-blue" />;
      default:
        return <Coins className="h-4 w-4 text-muted" />;
    }
  };

  const txBadge = (type: CreditTransaction["type"]) => {
    switch (type) {
      case "purchase":
        return <Badge variant="gold">Achat</Badge>;
      case "deduction":
        return <Badge variant="muted">Utilisation</Badge>;
      case "refund":
        return <Badge variant="blue">Remboursement</Badge>;
      default:
        return <Badge variant="muted">Manuel</Badge>;
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* ─── Welcome header ─── */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Bonjour, <span className="text-gradient-gold">{userName}</span>
        </h1>
        <p className="mt-1.5 text-muted">
          Voici un aperçu de votre activité de staging virtuel.
        </p>
      </div>

      {/* ─── Stats cards ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {/* Credits */}
        <div className="rounded-2xl border border-badge-gold-border/30 bg-badge-gold-bg/20 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-badge-gold-text">
              Crédits
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-badge-gold-bg">
              <Coins className="h-4 w-4 text-icon-accent" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-gradient-gold">{credits}</p>
          <Link
            href="/pricing"
            className="mt-2 inline-flex items-center gap-1 text-xs text-badge-gold-text hover:underline"
          >
            Recharger <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Total projects */}
        <div className="rounded-2xl border border-border/60 bg-surface/40 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Projets
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover">
              <FolderKanban className="h-4 w-4 text-muted" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold">{totalProjects}</p>
          <p className="mt-2 text-xs text-muted">
            {doneProjects} terminé{doneProjects > 1 ? "s" : ""}
          </p>
        </div>

        {/* Rooms staged */}
        <div className="rounded-2xl border border-border/60 bg-surface/40 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Pièces meublées
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover">
              <ImageIcon className="h-4 w-4 text-muted" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold">
            {projects.reduce((sum, p) => sum + p.roomCount, 0)}
          </p>
          <p className="mt-2 text-xs text-muted">
            au total
          </p>
        </div>

        {/* Subscription */}
        <div className="rounded-2xl border border-border/60 bg-surface/40 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Abonnement
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover">
              <CreditCard className="h-4 w-4 text-muted" />
            </div>
          </div>
          {subscription ? (
            <>
              <p className="mt-3 text-lg font-bold">{planLabel}</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={subscription.cancel_at_period_end ? "muted" : "gold"}>
                  {subscription.cancel_at_period_end ? "Annulé" : "Actif"}
                </Badge>
                <span className="text-xs text-muted">
                  {subscription.credits_per_period} cr/mois
                </span>
              </div>
              <p className="mt-2 text-xs text-muted flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                {new Date(subscription.current_period_end).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted">Aucun</p>
              <Link
                href="/pricing"
                className="mt-2 inline-flex items-center gap-1 text-xs text-badge-gold-text hover:underline"
              >
                S&apos;abonner <ArrowRight className="h-3 w-3" />
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ─── Projects ─── */}
      <div id="projects" className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-icon-accent" />
            Mes projets
          </h2>
          <Link
            href="/new"
            className="inline-flex items-center gap-1.5 rounded-lg gradient-gold px-3.5 py-2 text-xs font-semibold text-zinc-900 transition-opacity hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouveau
          </Link>
        </div>

        {projectsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-surface overflow-hidden animate-pulse"
              >
                <div className="aspect-video bg-surface-hover" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-surface-hover" />
                  <div className="h-3 w-1/2 rounded bg-surface-hover" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* New project card */}
            <Link
              href="/new"
              className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-surface/20 p-8 text-center transition-all hover:border-badge-gold-border/50 hover:bg-badge-gold-bg/10 min-h-[240px]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-badge-gold-bg/40 border border-badge-gold-border/30 transition-transform group-hover:scale-110">
                <Plus className="h-7 w-7 text-icon-accent" />
              </div>
              <p className="mt-4 text-sm font-semibold text-foreground">
                Créer un projet
              </p>
              <p className="mt-1 text-xs text-muted">
                Staging IA en quelques minutes
              </p>
            </Link>

            {projects.map((project) => (
              <ProjectHistoryCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {/* ─── Transaction history ─── */}
      <div>
        <h2 className="mb-5 text-lg font-semibold flex items-center gap-2">
          <Film className="h-5 w-5 text-icon-accent" />
          Historique des crédits
        </h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-spinner border-t-transparent" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-surface/40 p-8 text-center">
            <p className="text-sm text-muted">Aucune transaction pour le moment</p>
            <Link href="/pricing">
              <Button variant="primary" size="sm" className="mt-4">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Acheter des crédits
              </Button>
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-surface/40 backdrop-blur-sm overflow-hidden">
            <div className="divide-y divide-border/40">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-hover/30"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-hover shrink-0">
                    {txIcon(tx.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      {txBadge(tx.type)}
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(tx.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm font-semibold ${
                        tx.amount > 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {tx.amount > 0 ? "+" : ""}
                      {tx.amount}
                    </p>
                    <p className="text-xs text-muted">Solde: {tx.balance}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
