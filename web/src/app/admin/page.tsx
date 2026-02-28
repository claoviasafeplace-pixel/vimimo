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
  ShoppingBag,
  ImageIcon,
  ThumbsUp,
  ThumbsDown,
  Wand2,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import PhaseBadge, { getPhaseLabel, ACTIVE_PHASES } from "@/components/ui/PhaseBadge";
import StatCard from "@/components/admin/StatCard";
import ProjectsTable, { type ProjectRow } from "@/components/admin/ProjectsTable";
import KanbanBoard from "@/components/admin/KanbanBoard";
import OrderDetailPanel from "@/components/admin/OrderDetailPanel";
import StudioPanel from "@/components/admin/StudioPanel";
import type { ProjectSummary } from "@/lib/store";
import type { AdminKanbanStatus } from "@/lib/types";

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

interface AiCostMonth {
  month: string;
  costUsd: number;
}

interface TopCostProject {
  id: string;
  cost: number;
  rooms: number;
  phase: string;
  date: string;
}

interface AiCostStats {
  totalUsd: number;
  totalProjects: number;
  avgPerProject: number;
  byMonth: AiCostMonth[];
  topProjects: TopCostProject[];
  costPerService: Record<string, number>;
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
  aiCostStats: AiCostStats;
}

interface PaginatedProject {
  id: string;
  user_id: string | null;
  userEmail: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
}

type Tab = "overview" | "projects" | "pipeline" | "orders" | "studio";

// ============================================
// Tabs config
// ============================================

const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: "overview", label: "Vue d'ensemble", icon: BarChart3 },
  { id: "projects", label: "Projets", icon: FolderKanban },
  { id: "pipeline", label: "Pipeline", icon: Activity },
  { id: "orders", label: "Commandes", icon: ShoppingBag },
  { id: "studio", label: "Studio", icon: Wand2 },
];

const PHASE_OPTIONS = [
  "", "done", "error", "uploading", "cleaning", "cleaned", "analyzing",
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

  // Orders (Kanban) tab state
  const [ordersData, setOrdersData] = useState<Record<AdminKanbanStatus, ProjectSummary[]> | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Studio tab state
  const [studioProjectId, setStudioProjectId] = useState<string | null>(null);
  const [studioInput, setStudioInput] = useState("");

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
    } catch (error) {
      console.error("[Admin] Project action failed:", error);
      alert("Erreur réseau");
    } finally {
      setActionLoading(null);
    }
  };

  // Cleaned validation actions
  const handleCleanedAction = async (projectId: string, action: "validate_cleaned" | "reject_cleaned") => {
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
        const statsRes = await fetch("/api/admin");
        if (statsRes.ok) setStats(await statsRes.json());
      }
    } catch (error) {
      console.error("[Admin] Cleaned action failed:", error);
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
    } catch (error) {
      console.error("[Admin] Pipeline action failed:", error);
      alert("Erreur réseau");
    } finally {
      setActionLoading(null);
    }
  };

  // Fetch orders (tab 4)
  const fetchOrders = useCallback(() => {
    setOrdersLoading(true);
    fetch("/api/admin/orders")
      .then((res) => res.json())
      .then((data) => setOrdersData(data.orders || null))
      .catch(console.error)
      .finally(() => setOrdersLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "orders") fetchOrders();
  }, [tab, fetchOrders]);

  // Orders handlers
  const handleOrderCardClick = (order: ProjectSummary) => {
    setSelectedOrderId(order.id);
  };

  const handleOrderDeliver = async (
    projectId: string,
    selectedOptions: Record<number, number>,
    adminNotes?: string,
  ) => {
    const res = await fetch(`/api/admin/orders/${projectId}/deliver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedOptions, adminNotes }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Erreur lors de la livraison");
      throw new Error(data.error);
    }
    alert("Commande livree avec succes !");
    setSelectedOrderId(null);
    fetchOrders();
  };

  const handleOrderRegenerate = async (
    projectId: string,
    roomIndex: number,
    customPrompt: string,
  ) => {
    const res = await fetch(`/api/admin/orders/${projectId}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomIndex, customPrompt }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erreur lors de la regeneration");
    }
  };

  const handleOrderStatusChange = async (projectId: string, kanbanStatus: string) => {
    const res = await fetch(`/api/admin/orders/${projectId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kanbanStatus }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Erreur lors du changement de statut");
      return;
    }
    fetchOrders();
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
            {/* Cleaned projects awaiting validation */}
            {(() => {
              const cleanedProjects = stats.activeProjects.projects.filter(
                (p) => p.phase === "cleaned"
              );
              if (cleanedProjects.length === 0) return null;
              return (
                <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ImageIcon className="h-5 w-5 text-amber-400" />
                    <h2 className="text-lg font-semibold text-amber-400">
                      {cleanedProjects.length} projet{cleanedProjects.length > 1 ? "s" : ""} en attente de validation
                    </h2>
                  </div>
                  <p className="text-xs text-muted mb-4">
                    Les meubles ont été retirés. Validez pour lancer le staging IA, ou rejetez pour annuler et rembourser.
                  </p>
                  <div className="space-y-3">
                    {cleanedProjects.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-xl border border-amber-500/20 bg-surface p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs">{p.id.slice(0, 8)}</span>
                            <PhaseBadge phase="cleaned" />
                            <span className="text-xs text-muted">
                              {p.roomCount} pièce{p.roomCount > 1 ? "s" : ""}
                            </span>
                            <span className="text-xs text-muted">
                              {new Date(p.createdAt).toLocaleDateString("fr-FR", {
                                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <a href={`/project/${p.id}`} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm">Voir</Button>
                            </a>
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={actionLoading === p.id}
                              onClick={() => handleCleanedAction(p.id, "validate_cleaned")}
                            >
                              {actionLoading === p.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ThumbsUp className="mr-1 h-3.5 w-3.5" />
                              )}
                              Valider
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={actionLoading === p.id}
                              onClick={() => handleCleanedAction(p.id, "reject_cleaned")}
                            >
                              <ThumbsDown className="mr-1 h-3.5 w-3.5" />
                              Rejeter
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

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

            {/* AI Cost Widget */}
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
                <Euro className="h-5 w-5 text-amber-400" />
                Coûts IA
              </h2>

              {/* Top-level KPIs */}
              <div className="grid gap-4 sm:grid-cols-3 mb-6">
                <div className="rounded-xl border border-border bg-surface-hover p-4">
                  <p className="text-xs text-muted mb-1">Total dépensé</p>
                  <p className="text-2xl font-bold text-gradient-gold">
                    ${stats.aiCostStats.totalUsd.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface-hover p-4">
                  <p className="text-xs text-muted mb-1">Projets facturés</p>
                  <p className="text-2xl font-bold">{stats.aiCostStats.totalProjects}</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-hover p-4">
                  <p className="text-xs text-muted mb-1">Coût moyen / projet</p>
                  <p className="text-2xl font-bold">${stats.aiCostStats.avgPerProject.toFixed(2)}</p>
                </div>
              </div>

              {/* Cost per service */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-2">Coût par appel IA</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(stats.aiCostStats.costPerService).map(([service, cost]) => (
                    <div key={service} className="rounded-lg border border-border/50 bg-background px-3 py-2">
                      <p className="text-[10px] text-muted truncate">{service}</p>
                      <p className="text-sm font-semibold">${cost.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted">
                  1 room standard = 1× vision ($0.03) + {process.env.NEXT_PUBLIC_STAGING_VARIANTS || "1"}× staging ($0.05) + 1× vidéo ($0.50) ≈ <strong>${(0.03 + 0.05 + 0.50).toFixed(2)}</strong>
                </p>
              </div>

              {/* Monthly breakdown */}
              {stats.aiCostStats.byMonth.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold mb-2">Dépenses mensuelles</h3>
                  <div className="space-y-1.5">
                    {stats.aiCostStats.byMonth.map((m) => {
                      const maxCost = Math.max(...stats.aiCostStats.byMonth.map((x) => x.costUsd), 1);
                      return (
                        <div key={m.month} className="flex items-center gap-3">
                          <span className="text-xs text-muted w-16">{m.month}</span>
                          <div className="flex-1 h-5 rounded bg-surface-hover overflow-hidden">
                            <div
                              className="h-full rounded gradient-gold"
                              style={{ width: `${(m.costUsd / maxCost) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold w-16 text-right">${m.costUsd.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Top spenders */}
              {stats.aiCostStats.topProjects.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Top projets par coût</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-left text-muted">
                          <th className="pb-2 pr-4">Projet</th>
                          <th className="pb-2 pr-4">Pièces</th>
                          <th className="pb-2 pr-4">Phase</th>
                          <th className="pb-2 pr-4">Date</th>
                          <th className="pb-2 text-right">Coût IA</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {stats.aiCostStats.topProjects.slice(0, 10).map((p) => (
                          <tr key={p.id}>
                            <td className="py-2 pr-4">
                              <a href={`/project/${p.id}`} target="_blank" rel="noopener noreferrer"
                                className="font-mono text-xs hover:text-amber-400 transition-colors">
                                {p.id.slice(0, 8)}
                              </a>
                            </td>
                            <td className="py-2 pr-4">{p.rooms}</td>
                            <td className="py-2 pr-4"><PhaseBadge phase={p.phase} /></td>
                            <td className="py-2 pr-4 text-muted">
                              {new Date(p.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                            </td>
                            <td className="py-2 text-right font-semibold">${p.cost.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Active rooms cost preview */}
              {stats.activeProjects.count > 0 && (
                <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                  <p className="text-xs text-amber-400">
                    {stats.activeProjects.projects.reduce((s, p) => s + p.roomCount, 0)} rooms en cours →
                    coût estimé restant : ~${(stats.activeProjects.projects.reduce((s, p) => s + p.roomCount, 0) * 0.58).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== TAB 4: Orders (Kanban) ========== */}
        {tab === "orders" && (
          <div>
            {ordersLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
              </div>
            ) : ordersData ? (
              <KanbanBoard orders={ordersData} onCardClick={handleOrderCardClick} />
            ) : (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">
                Aucune commande
              </div>
            )}

            {/* Order detail panel (modal) */}
            {selectedOrderId && (
              <OrderDetailPanel
                projectId={selectedOrderId}
                onClose={() => setSelectedOrderId(null)}
                onDeliver={handleOrderDeliver}
                onRegenerate={handleOrderRegenerate}
                onStatusChange={handleOrderStatusChange}
              />
            )}
          </div>
        )}

        {/* ========== TAB 5: Studio ========== */}
        {tab === "studio" && (
          <div>
            {studioProjectId ? (
              <StudioPanel
                projectId={studioProjectId}
                onClose={() => setStudioProjectId(null)}
              />
            ) : (
              <div className="max-w-lg mx-auto space-y-6 py-8">
                <div className="text-center">
                  <Wand2 className="mx-auto h-12 w-12 text-amber-400 mb-3" />
                  <h2 className="text-xl font-bold mb-2">Studio de Création</h2>
                  <p className="text-sm text-muted">
                    Entrez l&apos;ID d&apos;un projet pour traiter ses médias : retirer les meubles, générer le staging IA, créer les vidéos.
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={studioInput}
                    onChange={(e) => setStudioInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && studioInput.trim()) {
                        setStudioProjectId(studioInput.trim());
                      }
                    }}
                    placeholder="ID du projet (ex: abc12345-...)"
                    className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-amber-500/50"
                  />
                  <Button
                    variant="primary"
                    disabled={!studioInput.trim()}
                    onClick={() => setStudioProjectId(studioInput.trim())}
                  >
                    <Wand2 className="mr-1.5 h-4 w-4" />
                    Ouvrir
                  </Button>
                </div>

                {/* Quick access from recent/active projects */}
                {stats.activeProjects.projects.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Projets actifs</h3>
                    <div className="space-y-2">
                      {stats.activeProjects.projects.slice(0, 8).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { setStudioInput(p.id); setStudioProjectId(p.id); }}
                          className="w-full flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm hover:border-amber-500/30 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs">{p.id.slice(0, 8)}</span>
                            <PhaseBadge phase={p.phase} />
                            <span className="text-xs text-muted">{p.roomCount} pièce{p.roomCount > 1 ? "s" : ""}</span>
                          </div>
                          <span className="text-xs text-muted">
                            {new Date(p.createdAt).toLocaleDateString("fr-FR", {
                              day: "numeric", month: "short",
                            })}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Also show recent projects */}
                {stats.recentProjects.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Projets récents</h3>
                    <div className="space-y-2">
                      {stats.recentProjects.slice(0, 5).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { setStudioInput(p.id); setStudioProjectId(p.id); }}
                          className="w-full flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm hover:border-amber-500/30 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs">{p.id.slice(0, 8)}</span>
                            <PhaseBadge phase={p.phase} />
                            <span className="text-xs text-muted">{p.roomCount} pièce{p.roomCount > 1 ? "s" : ""}</span>
                          </div>
                          <span className="text-xs text-muted">
                            {p.userEmail || "invité"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
