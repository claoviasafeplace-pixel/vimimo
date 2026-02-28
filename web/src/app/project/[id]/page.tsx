"use client";

import { use, useState } from "react";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { useProject } from "@/hooks/useProject";
import ProjectView from "@/components/project/ProjectView";
import OrderStatusView from "@/components/project/OrderStatusView";
import AuthButton from "@/components/auth/AuthButton";
import ThemeToggle from "@/components/ui/ThemeToggle";
import type { ConfirmedPhoto } from "@/lib/types";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { project, isLoading, error, mutate, refetch } = useProject(id);
  const [isTriageSubmitting, setIsTriageSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleSelect = async (roomIndex: number, optionIndex: number) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/project/${id}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomIndex, optionIndex }),
      });
      if (res.ok) {
        const { project: updated } = await res.json();
        mutate(updated);
      } else {
        setActionError("Erreur lors de la sélection. Veuillez réessayer.");
      }
    } catch (error) {
      console.error("[ProjectPage] Selection failed:", error);
      setActionError("Erreur réseau. Vérifiez votre connexion.");
    }
  };

  const handleConfirm = async () => {
    setActionError(null);
    try {
      const res = await fetch(`/api/project/${id}/generate`, {
        method: "POST",
      });
      if (res.ok) {
        const { project: updated } = await res.json();
        mutate(updated);
      } else {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error || "Erreur lors de la génération. Veuillez réessayer.");
      }
    } catch (error) {
      console.error("[ProjectPage] Generate failed:", error);
      setActionError("Erreur réseau. Vérifiez votre connexion.");
    }
  };

  const handleTriageConfirm = async (confirmedPhotos: ConfirmedPhoto[]) => {
    setActionError(null);
    setIsTriageSubmitting(true);
    try {
      const res = await fetch(`/api/project/${id}/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmedPhotos }),
      });
      if (res.ok) {
        const { project: updated } = await res.json();
        mutate(updated);
      } else {
        setActionError("Erreur lors de la validation du triage.");
      }
    } catch (error) {
      console.error("[ProjectPage] Triage confirm failed:", error);
      setActionError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setIsTriageSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 text-icon-accent animate-spin" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error || "Projet introuvable"}</p>
        <a
          href="/"
          className="flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;accueil
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <a href="/" className="text-xl font-bold text-gradient-gold">
            VIMIMO
          </a>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">
              Projet {id.slice(0, 6)}...
            </span>
            <ThemeToggle />
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        {actionError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{actionError}</p>
            <button
              onClick={() => setActionError(null)}
              className="ml-auto text-xs text-red-400 hover:text-red-300 cursor-pointer"
            >
              Fermer
            </button>
          </div>
        )}
        {project.orderStatus ? (
          <OrderStatusView project={project} />
        ) : (
          <ProjectView
            project={project}
            onSelect={handleSelect}
            onConfirm={handleConfirm}
            onTriageConfirm={handleTriageConfirm}
            isTriageSubmitting={isTriageSubmitting}
          />
        )}
      </main>
    </div>
  );
}
