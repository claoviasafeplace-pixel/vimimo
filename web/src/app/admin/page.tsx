"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Users,
  CreditCard,
  Euro,
  FolderKanban,
  Activity,
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle,
  Undo2,
  Loader2,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import PhaseBadge, { getPhaseLabel, ACTIVE_PHASES } from "@/components/ui/PhaseBadge";
import StatCard from "@/components/admin/StatCard";
import ProjectsTable, { type ProjectRow } from "@/components/admin/ProjectsTable";

// ============================================
// Types
// ============================================

interface RecentProject {
  id: string;
  user_id: string | null;
  userEmail: string | null;
  phase: string;
  mode: string;
  roomCount: number;
  created_at: string;
}

interface RevenueMonth {
  month: string;
  credits: number;
  estimatedEur: number;
}

interface StuckProject {
  id: string;
  phase: string;
  userId: string | null;
  createdAt: string;
}

interface ActiveProject {
  id: string;
  phase: string;
  userId: string | null;
  roomCount: number;
  createdAt: string;
}

interface AdminStats {
  projectsByPhase: Record<string, number>;
  recentProjects: RecentProject[];
  creditStats: {
    totalPurchased: number;
    totalDeducted: number;
    totalRefunded: number;
  };
  subscriptionStats: Record<string, number>;
  totalUsers: number;
  revenueByMonth: RevenueMonth[];
  totalRevenueEur: number;
  stuckProjects: { count: number; projects: StuckProject[] };
  activeProjects: { count: number; projects: ActiveProject[] };
}

interface PaginatedProject {
  id: string;
  user_id: string | null;
  userEmail: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
}

type Tab = "overview" | "projects" | "pipeline";

// ============================================
// Tabs config
// ============================================

const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: "overview", label: "Vue d'ensemble", icon: BarChart3 },
  { id: "projects", label: "Projets", icon: FolderKanban },
  { id: "pipeline", label: "Pipeline", icon: Activity },
];

const PHASE_OPTIONS = [
  "", "done", "error", "uploading", "cleaning", "analyzing",
  "generating_options", "selecting", "generating_videos",
  "rendering", "rendering_montage", "auto_staging", "triaging", "reviewing",
];

const MODE_OPTIONS = [
  { value: "", label: "Tous modes" },
  { value: "staging_piece", label: "Staging" },
  { value: "video_visite", label: "Video Visite" },
];

// ============================================
// Component
// ============================================

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  // Projects tab state
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPhase, setFilterPhase] = useState("");
  const [filterMode, setFilterMode] = useState("");
  const [filterStuck, setFilterStuck] = useState(false);
  const [projectsPage, setProjectsPage] = useState(1);
  const [projectsData, setProjectsData] = useState<{
    projects: PaginatedProject[];
    total: number;
    page: number;
    totalPages: number;
  } | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Auth redirect
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  // Fetch stats
  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/admin")
        .then(async (res) => {
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Erreur ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          setStats(data);
          setError(null);
        })
        .catch((err) => setError(err.message || "Erreur de chargement"))
        .finally(() => setLoading(false));
    }
  }, [session?.user?.id]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setProjectsPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch projects (tab 2)
  const fetchProjects = useCallback(() => {
    setProjectsLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(projectsPage));
    params.set("limit", "20");
    if (searchQuery) params.set("search", searchQuery);
    if (filterPhase) params.set("phase", filterPhase);
    if (filterMode) params.set("mode", filterMode);
    if (filterStuck) params.set("stuck", "true");

    fetch(`/api/admin/projects?${params}`)
      .then((res) => res.json())
      .then(setProjectsData)
      .catch(console.error)
      .finally(() => setProjectsLoading(false));
  }, [projectsPage, searchQuery, filterPhase, filterMode, filterStuck]);

  useEffect(() => {
    if (tab === "projects") fetchProjects();
  }, [tab, fetchProjects]);

  // Map paginated projects to ProjectRow
  const projectRows: ProjectRow[] = useMemo(() => {
    if (!projectsData?.projects) return [];
    return projectsData.projects.map((p) => {
      const data = p.data || {};
      const rooms = data.rooms as Array<Record<string, unknown>> | undefined;
      return {
        id: p.id,
        user_id: p.user_id,
        userEmail: p.userEmail,
        phase: (data.phase as string) || "unknown",
        mode: (data.mode as string) || "staging_piece",
        roomCount: Array.isArray(rooms) ? rooms.length : 0,
        created_at: p.created_at,
        rooms: Array.isArray(rooms) ? rooms.map((r) => ({
          roomLabel: (r.roomLabel as string) || "Room",
          options: Array.isArray(r.options) ? r.options.map((o: Record<string, unknown>) => ({ url: (o.url as string) || "" })) : [],
          selectedOptionIndex: r.selectedOptionIndex as number | undefined,
          videoUrl: r.videoUrl as string | undefined,
        })) : undefined,
        error: data.error as string | undefined,
        creditsRefunded: data.creditsRefunded as boolean | undefined,
        finalVideoUrl: data.finalVideoUrl as string | undefined,
        studioMontageUrl: data.studioMontageUrl as string | undefined,
      };
    });
  }, [projectsData]);

  // Admin action handler
  const handleAction = async (projectId: string, action: "retry" | "force_done" | "refund") => {
    setActionLoading(projectId);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erreur");
      } else {
        fetchProjects();
      }
    } catch {
      alert("Erreur réseau");
    } finally {
      setActionLoading(null);
    }
  };

  // Pipeline action (same as projects)
  const handlePipelineAction = async (projectId: string, action: "retry" | "force_done" | "refund") => {
    setActionLoading(projectId);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erreur");
      } else {
        // Refresh stats
        const statsRes = await fetch("/api/admin");
        if (statsRes.ok) setStats(await statsRes.json());
      }
    } catch {
      alert("Erreur réseau");
    } finally {
      setActionLoading(null);
    }
  };

  // ============================================
  // Render guards
  // ============================================

  if (status === "loading" || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="text-lg font-semibold text-red-400">{error}</p>
          <Link href="/" className="mt-4 inline-block text-sm text-muted hover:text-foreground">
            Retour a l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  const totalProjects = Object.values(stats.projectsByPhase).reduce((a, b) => a + b, 0);
  const activeSubscriptions = stats.subscriptionStats["active"] || 0;
  const maxRevenue = Math.max(...stats.revenueByMonth.map((m) => m.estimatedEur), 1);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold text-gradient-gold">
              VIMIMO
            </Link>
            <Badge variant="gold">Admin</Badge>
          </div>
          <div className="flex items-center gap-3">
            {/* Tabs */}
            <nav className="hidden sm:flex items-center rounded-xl border border-border bg-surface p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    tab === t.id
                      ? "gradient-gold text-zinc-900 shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </nav>
            <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
              Mon Dashboard
            </Link>
          </div>
        </div>
        {/* Mobile tabs */}
        <div className="sm:hidden flex border-t border-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-xs font-medium text-center transition-all ${
                tab === t.id
                  ? "text-amber-400 border-b-2 border-amber-400"
                  : "text-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* ========== TAB 1: Overview ========== */}
        {tab === "overview" && (
          <div>
            {/* Stat cards */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total Projets"
                value={totalProjects}
                icon={FolderKanban}
              />
              <StatCard
                label="Utilisateurs"
                value={stats.totalUsers}
                icon={Users}
                accent="blue"
              />
              <StatCard
                label="Abos Actifs"
                value={activeSubscriptions}
                subtitle={
                  Object.entries(stats.subscriptionStats)
                    .filter(([s]) => s !== "active")
                    .map(([s, c]) => `${c} ${s}`)
                    .join(", ") || undefined
                }
                icon={CreditCard}
                accent="green"
              />
              <StatCard
                label="Revenu Total"
                value={`${Math.round(stats.totalRevenueEur)} €`}
                subtitle="Estimation basée sur les packs"
                icon={Euro}
              />
            </div>

            {/* Revenue chart */}
            {stats.revenueByMonth.length > 0 && (
              <div className="mb-8 rounded-2xl border border-border bg-surface p-6">
                <h2 className="mb-4 text-lg font-semibold">
                  Revenu estimé
                  <span className="ml-2 text-sm font-normal text-muted">6 derniers mois</span>
                </h2>
                <div className="flex items-end gap-3 h-48">
                  {stats.revenueByMonth.map((m) => {
                    const heightPct = Math.max((m.estimatedEur / maxRevenue) * 100, 4);
                    const monthLabel = new Date(m.month + "-15").toLocaleDateString("fr-FR", { month: "short" });
                    return (
                      <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                        <span className="text-xs font-medium">{Math.round(m.estimatedEur)} €</span>
                        <div
                          className="w-full rounded-t-lg gradient-gold transition-all duration-500"
                          style={{ height: `${heightPct}%`, minHeight: "4px" }}
                        />
                        <span className="text-xs text-muted capitalize">{monthLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Credit summary */}
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold">Résumé Crédits</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5">
                  <p className="text-sm text-green-400">Achetés</p>
                  <p className="mt-1 text-3xl font-bold text-green-400">
                    +{stats.creditStats.totalPurchased}
                  </p>
                </div>
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                  <p className="text-sm text-red-400">Déduits</p>
                  <p className="mt-1 text-3xl font-bold text-red-400">
                    -{stats.creditStats.totalDeducted}
                  </p>
                </div>
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
                  <p className="text-sm text-blue-400">Remboursés</p>
                  <p className="mt-1 text-3xl font-bold text-blue-400">
                    +{stats.creditStats.totalRefunded}
                  </p>
                </div>
              </div>
            </div>

            {/* Projects by phase */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">Projets par Phase</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.projectsByPhase)
                  .sort(([, a], [, b]) => b - a)
                  .map(([phase, count]) => (
                    <button
                      key={phase}
                      onClick={() => {
                        setFilterPhase(phase);
                        setTab("projects");
                      }}
                      className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 hover:border-amber-500/30 transition-colors cursor-pointer"
                    >
                      <PhaseBadge phase={phase} />
                      <span className="text-sm font-semibold">{count}</span>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ========== TAB 2: Projects ========== */}
        {tab === "projects" && (
          <div>
            {/* Filter bar */}
            <div className="mb-6 flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <input
                  type="text"
                  placeholder="Rechercher par email..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <select
                value={filterPhase}
                onChange={(e) => { setFilterPhase(e.target.value); setProjectsPage(1); }}
                className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-amber-500/50"
              >
                <option value="">Toutes phases</option>
                {PHASE_OPTIONS.filter(Boolean).map((p) => (
                  <option key={p} value={p}>{getPhaseLabel(p)}</option>
                ))}
              </select>
              <select
                value={filterMode}
                onChange={(e) => { setFilterMode(e.target.value); setProjectsPage(1); }}
                className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-amber-500/50"
              >
                {MODE_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <button
                onClick={() => { setFilterStuck(!filterStuck); setProjectsPage(1); }}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                  filterStuck
                    ? "border-red-500/50 bg-red-500/10 text-red-400"
                    : "border-border bg-surface text-muted hover:text-foreground"
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
                Bloqués
              </button>
            </div>

            {/* Table */}
            {projectsLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
              </div>
            ) : (
              <>
                <ProjectsTable
                  projects={projectRows}
                  showActions
                  onAction={handleAction}
                  actionLoading={actionLoading}
                />
                {/* Pagination */}
                {projectsData && projectsData.totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-muted">
                      {projectsData.total} projets — page {projectsData.page}/{projectsData.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={projectsPage <= 1}
                        onClick={() => setProjectsPage((p) => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Précédent
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={projectsPage >= projectsData.totalPages}
                        onClick={() => setProjectsPage((p) => p + 1)}
                      >
                        Suivant
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ========== TAB 3: Pipeline ========== */}
        {tab === "pipeline" && (
          <div>
            {/* Stuck projects alert */}
            {stats.stuckProjects.count > 0 && (
              <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <h2 className="text-lg font-semibold text-red-400">
                    {stats.stuckProjects.count} projet{stats.stuckProjects.count > 1 ? "s" : ""} bloqué{stats.stuckProjects.count > 1 ? "s" : ""}
                  </h2>
                </div>
                <div className="space-y-2">
                  {stats.stuckProjects.projects.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl border border-red-500/20 bg-surface px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs">{p.id.slice(0, 8)}</span>
                        <PhaseBadge phase={p.phase} />
                        <span className="text-xs text-muted">
                          depuis {new Date(p.createdAt).toLocaleDateString("fr-FR", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={actionLoading === p.id}
                          onClick={() => handlePipelineAction(p.id, "retry")}
                        >
                          {actionLoading === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="mr-1 h-3.5 w-3.5" />
                          )}
                          Retry
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={actionLoading === p.id}
                          onClick={() => handlePipelineAction(p.id, "force_done")}
                        >
                          <CheckCircle className="mr-1 h-3.5 w-3.5" />
                          Force
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={actionLoading === p.id}
                          onClick={() => handlePipelineAction(p.id, "refund")}
                        >
                          <Undo2 className="mr-1 h-3.5 w-3.5" />
                          Refund
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active projects grouped by phase */}
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5 text-amber-400" />
                Projets actifs
                <span className="text-sm font-normal text-muted">({stats.activeProjects.count})</span>
              </h2>
              {stats.activeProjects.count === 0 ? (
                <div className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">
                  Aucun projet en cours
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    // Group by phase
                    const grouped: Record<string, typeof stats.activeProjects.projects> = {};
                    for (const p of stats.activeProjects.projects) {
                      if (!grouped[p.phase]) grouped[p.phase] = [];
                      grouped[p.phase].push(p);
                    }
                    return Object.entries(grouped).map(([phase, projects]) => (
                      <div key={phase} className="rounded-2xl border border-border bg-surface overflow-hidden">
                        <div className="flex items-center gap-3 border-b border-border bg-surface-hover px-4 py-3">
                          <PhaseBadge phase={phase} />
                          <span className="text-sm font-medium">{projects.length} projet{projects.length > 1 ? "s" : ""}</span>
                        </div>
                        <div className="divide-y divide-border">
                          {projects.map((p) => (
                            <div key={p.id} className="flex items-center justify-between px-4 py-3">
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-xs">{p.id.slice(0, 8)}</span>
                                <span className="text-xs text-muted">{p.roomCount} room{p.roomCount > 1 ? "s" : ""}</span>
                                <span className="text-xs text-muted">
                                  {new Date(p.createdAt).toLocaleDateString("fr-FR", {
                                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <a href={`/project/${p.id}`} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm">Ouvrir</Button>
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>

            {/* API cost estimate */}
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="mb-2 text-lg font-semibold">Estimation coûts API</h2>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gradient-gold">
                  ~{(stats.creditStats.totalDeducted * 0.25).toFixed(2)} €
                </span>
                <span className="text-sm text-muted">
                  pour {stats.creditStats.totalDeducted} rooms traitées (~0.25 €/room)
                </span>
              </div>
              {stats.activeProjects.count > 0 && (
                <p className="mt-2 text-xs text-muted">
                  {stats.activeProjects.projects.reduce((s, p) => s + p.roomCount, 0)} rooms en cours de traitement
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
