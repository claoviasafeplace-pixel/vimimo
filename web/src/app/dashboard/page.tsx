"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Coins,
  Clock,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  CreditCard,
  CalendarClock,
  FolderKanban,
} from "lucide-react";
import Link from "next/link";
import AuthButton from "@/components/auth/AuthButton";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Card from "@/components/ui/Card";
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [subscription, setSubscription] = useState<DashboardSubscription | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

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

  if (status === "loading" || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-spinner border-t-transparent" />
      </div>
    );
  }

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

  const planLabel = subscription
    ? SUBSCRIPTION_PLANS.find((p) => p.id === subscription.plan_id)?.name ?? subscription.plan_id
    : null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <a href="/" className="text-xl font-bold text-gradient-gold">
            VIMIMO
          </a>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <AuthButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        <h1 className="mb-8 text-2xl font-bold">Dashboard</h1>

        {/* Balance + subscription cards */}
        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          <Card>
            <p className="text-sm text-muted">Solde actuel</p>
            <p className="mt-1 text-4xl font-bold text-gradient-gold">
              {session.user.credits}
            </p>
            <p className="text-sm text-muted">crédits</p>
            <Link href="/pricing" className="mt-4 block">
              <Button variant="primary" size="sm" className="w-full">
                <Coins className="mr-2 h-4 w-4" />
                Acheter des crédits
              </Button>
            </Link>
          </Card>

          <Card>
            <p className="text-sm text-muted">Abonnement</p>
            {subscription ? (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-icon-accent" />
                  <span className="text-lg font-bold">{planLabel}</span>
                  <Badge variant={subscription.cancel_at_period_end ? "muted" : "gold"}>
                    {subscription.cancel_at_period_end ? "Annulé" : "Actif"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted">
                  {subscription.credits_per_period} crédits / mois
                </p>
                <p className="mt-1 text-xs text-muted flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  Prochain renouvellement :{" "}
                  {new Date(subscription.current_period_end).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-sm text-muted">Aucun abonnement actif</p>
                <Link href="/pricing" className="mt-3 block">
                  <Button variant="secondary" size="sm" className="w-full">
                    Voir les offres
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </div>

        {/* Mes projets */}
        <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-amber-400" />
          Mes projets
        </h2>

        {projectsLoading ? (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-surface overflow-hidden animate-pulse">
                <div className="aspect-video bg-surface-hover" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-surface-hover" />
                  <div className="h-3 w-1/2 rounded bg-surface-hover" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="mb-8">
            <div className="text-center py-6">
              <p className="text-sm text-muted mb-4">Aucun projet pour le moment</p>
              <Link href="/">
                <Button variant="primary" size="sm">
                  Commencer
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectHistoryCard key={project.id} project={project} />
            ))}
          </div>
        )}

        {/* Transactions */}
        <h2 className="mb-4 text-lg font-semibold">Historique des crédits</h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-spinner border-t-transparent" />
          </div>
        ) : transactions.length === 0 ? (
          <Card>
            <p className="text-center text-sm text-muted py-4">
              Aucune transaction pour le moment
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-hover">
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
                <div className="text-right">
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
        )}
      </main>
    </div>
  );
}
