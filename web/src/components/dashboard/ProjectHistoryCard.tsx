"use client";

import Link from "next/link";
import Image from "next/image";
import PhaseBadge from "@/components/ui/PhaseBadge";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Download, Play, Loader2 } from "lucide-react";
import { ACTIVE_PHASES } from "@/components/ui/PhaseBadge";

interface ProjectHistoryCardProps {
  project: {
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
  };
}

export default function ProjectHistoryCard({ project }: ProjectHistoryCardProps) {
  const isProcessing = ACTIVE_PHASES.includes(project.phase);
  const isDone = project.phase === "done";
  const isError = project.phase === "error";

  return (
    <Link href={`/project/${project.id}`} className="block group">
      <div className="rounded-2xl border border-border bg-surface overflow-hidden transition-all duration-200 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-900/5">
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-surface-hover to-surface">
          {project.thumbnailUrl ? (
            <Image
              src={project.thumbnailUrl}
              alt={project.styleLabel || "Projet"}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
                <Play className="h-5 w-5 text-amber-400" />
              </div>
            </div>
          )}

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
                <span className="text-xs font-medium text-white">En cours...</span>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {isError && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-red-900/80 to-transparent px-3 py-2">
              <p className="text-xs text-red-300 truncate">{project.error || "Erreur"}</p>
            </div>
          )}

          {/* Badges top-left */}
          <div className="absolute left-2 top-2 flex gap-1.5">
            <Badge variant={project.mode === "video_visite" ? "gold" : "muted"}>
              {project.mode === "video_visite" ? "Video" : "Staging"}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {project.styleLabel || "Projet"}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {project.roomCount} {project.roomCount > 1 ? "pièces" : "pièce"} &middot;{" "}
                {new Date(project.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <PhaseBadge phase={project.phase} />
          </div>

          {/* Download buttons */}
          {isDone && (project.finalVideoUrl || project.studioMontageUrl) && (
            <div className="mt-3 flex gap-2">
              {project.finalVideoUrl && (
                <a
                  href={project.finalVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button variant="primary" size="sm" className="text-xs">
                    <Download className="mr-1 h-3 w-3" />
                    Vidéo
                  </Button>
                </a>
              )}
              {project.studioMontageUrl && (
                <a
                  href={project.studioMontageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button variant="secondary" size="sm" className="text-xs">
                    <Download className="mr-1 h-3 w-3" />
                    Montage
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
