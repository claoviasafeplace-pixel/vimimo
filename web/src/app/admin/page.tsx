"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface RecentProject {
  id: string;
  user_id: string | null;
  userEmail: string | null;
  phase: string;
  mode: string;
  roomCount: number;
  created_at: string;
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
}

const PHASE_COLORS: Record<string, string> = {
  done: "bg-green-500/20 text-green-400 border-green-500/30",
  error: "bg-red-500/20 text-red-400 border-red-500/30",
  selecting: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  reviewing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  cleaning: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  analyzing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  generating_options: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  generating_videos: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  rendering: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  rendering_montage: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  auto_staging: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  triaging: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  uploading: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

function PhaseBadge({ phase }: { phase: string }) {
  const colors = PHASE_COLORS[phase] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${colors}`}
    >
      {phase}
    </span>
  );
}

function StatCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

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
        .catch((err) => {
          setError(err.message || "Erreur de chargement");
        })
        .finally(() => setLoading(false));
    }
  }, [session?.user?.id]);

  if (status === "loading" || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const totalProjects = Object.values(stats.projectsByPhase).reduce((a, b) => a + b, 0);
  const activeSubscriptions = stats.subscriptionStats["active"] || 0;
  const creditsInCirculation =
    stats.creditStats.totalPurchased -
    stats.creditStats.totalDeducted -
    stats.creditStats.totalRefunded;
  const estimatedCostPerRoom = 0.25;
  const totalRoomsProcessed = stats.creditStats.totalDeducted;
  const estimatedTotalCost = (totalRoomsProcessed * estimatedCostPerRoom).toFixed(2);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold text-gradient-gold">
              VIMIMO
            </Link>
            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
              Admin
            </span>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-muted hover:text-foreground"
          >
            Mon Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="mb-8 text-2xl font-bold">Admin Dashboard</h1>

        {/* Stats cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Projets" value={totalProjects} />
          <StatCard label="Utilisateurs" value={stats.totalUsers} />
          <StatCard
            label="Abos Actifs"
            value={activeSubscriptions}
            subtitle={
              Object.entries(stats.subscriptionStats)
                .filter(([s]) => s !== "active")
                .map(([s, c]) => `${c} ${s}`)
                .join(", ") || undefined
            }
          />
          <StatCard
            label="Credits en Circulation"
            value={creditsInCirculation}
            subtitle={`${stats.creditStats.totalPurchased} achetes - ${stats.creditStats.totalDeducted} deduits - ${stats.creditStats.totalRefunded} rembourses`}
          />
        </div>

        {/* Projects by phase */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">Projets par Phase</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.projectsByPhase)
              .sort(([, a], [, b]) => b - a)
              .map(([phase, count]) => (
                <div
                  key={phase}
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2"
                >
                  <PhaseBadge phase={phase} />
                  <span className="text-sm font-semibold">{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Credit summary */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">Resume Credits</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
              <p className="text-sm text-green-400">Achetes</p>
              <p className="text-2xl font-bold text-green-400">
                +{stats.creditStats.totalPurchased}
              </p>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-sm text-red-400">Deduits</p>
              <p className="text-2xl font-bold text-red-400">
                -{stats.creditStats.totalDeducted}
              </p>
            </div>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-sm text-blue-400">Rembourses</p>
              <p className="text-2xl font-bold text-blue-400">
                +{stats.creditStats.totalRefunded}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">
            Estimation cout API : ~{estimatedCostPerRoom} EUR/room -- Total estime :{" "}
            {estimatedTotalCost} EUR pour {totalRoomsProcessed} rooms traites
          </p>
        </div>

        {/* Recent projects table */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">
            Projets Recents{" "}
            <span className="text-sm font-normal text-muted">
              (50 derniers)
            </span>
          </h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-4 py-3 text-left font-medium text-muted">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted">
                    User
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted">
                    Mode
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted">
                    Phase
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted">
                    Rooms
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.recentProjects.map((project) => (
                  <tr
                    key={project.id}
                    className="hover:bg-surface-hover transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {project.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {project.userEmail || (project.user_id ? project.user_id.slice(0, 8) : "-")}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {project.mode === "video_visite"
                        ? "Video Visite"
                        : "Staging"}
                    </td>
                    <td className="px-4 py-3">
                      <PhaseBadge phase={project.phase} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {project.roomCount}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {new Date(project.created_at).toLocaleDateString(
                        "fr-FR",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </td>
                  </tr>
                ))}
                {stats.recentProjects.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-muted"
                    >
                      Aucun projet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
