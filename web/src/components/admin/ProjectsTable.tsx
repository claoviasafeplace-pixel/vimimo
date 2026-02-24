"use client";

import { useState } from "react";
import PhaseBadge from "@/components/ui/PhaseBadge";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { ChevronDown, ChevronUp, RotateCcw, CheckCircle, Undo2, ExternalLink } from "lucide-react";

export interface ProjectRow {
  id: string;
  user_id: string | null;
  userEmail?: string | null;
  phase: string;
  mode: string;
  roomCount: number;
  created_at: string;
  rooms?: Array<{
    roomLabel: string;
    options: Array<{ url: string }>;
    selectedOptionIndex?: number;
    videoUrl?: string;
  }>;
  error?: string;
  creditsRefunded?: boolean;
  finalVideoUrl?: string;
  studioMontageUrl?: string;
}

interface ProjectsTableProps {
  projects: ProjectRow[];
  showActions?: boolean;
  onAction?: (projectId: string, action: "retry" | "force_done" | "refund") => void;
  actionLoading?: string | null;
}

export default function ProjectsTable({
  projects,
  showActions = false,
  onAction,
  actionLoading,
}: ProjectsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface">
            {showActions && <th className="w-10 px-3 py-3" />}
            <th className="px-4 py-3 text-left font-medium text-muted">ID</th>
            <th className="px-4 py-3 text-left font-medium text-muted">User</th>
            <th className="px-4 py-3 text-left font-medium text-muted">Mode</th>
            <th className="px-4 py-3 text-left font-medium text-muted">Phase</th>
            <th className="px-4 py-3 text-left font-medium text-muted">Rooms</th>
            <th className="px-4 py-3 text-left font-medium text-muted">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {projects.map((project) => {
            const isExpanded = expandedId === project.id;
            return (
              <tr key={project.id} className="group">
                <td colSpan={showActions ? 7 : 6} className="p-0">
                  {/* Main row */}
                  <div
                    className="flex cursor-pointer items-center hover:bg-surface-hover transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : project.id)}
                  >
                    {showActions && (
                      <div className="w-10 px-3 py-3 text-muted">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    )}
                    <div className="flex-1 grid items-center" style={{ gridTemplateColumns: showActions ? "1fr 1.5fr 1fr 1fr 0.5fr 1.2fr" : "1fr 1.5fr 1fr 1fr 0.5fr 1.2fr" }}>
                      <div className="px-4 py-3 font-mono text-xs">
                        {project.id.slice(0, 8)}...
                      </div>
                      <div className="px-4 py-3 text-xs text-muted truncate">
                        {project.userEmail || (project.user_id ? project.user_id.slice(0, 8) : "-")}
                      </div>
                      <div className="px-4 py-3">
                        <Badge variant={project.mode === "video_visite" ? "gold" : "muted"}>
                          {project.mode === "video_visite" ? "Video Visite" : "Staging"}
                        </Badge>
                      </div>
                      <div className="px-4 py-3">
                        <PhaseBadge phase={project.phase} />
                      </div>
                      <div className="px-4 py-3 text-center">{project.roomCount}</div>
                      <div className="px-4 py-3 text-xs text-muted">
                        {new Date(project.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-border bg-surface/50 px-6 py-4">
                      {/* Error */}
                      {project.error && (
                        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                          {project.error}
                        </div>
                      )}

                      {/* Rooms */}
                      {project.rooms && project.rooms.length > 0 && (
                        <div className="mb-4">
                          <p className="mb-2 text-xs font-medium text-muted uppercase tracking-wider">Rooms</p>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {project.rooms.map((room, i) => (
                              <div key={i} className="rounded-xl border border-border bg-surface p-3">
                                <p className="text-sm font-medium mb-2">{room.roomLabel}</p>
                                {room.options?.[room.selectedOptionIndex ?? 0]?.url && (
                                  <div className="aspect-video rounded-lg overflow-hidden mb-2 bg-surface-hover">
                                    <img
                                      src={room.options[room.selectedOptionIndex ?? 0].url}
                                      alt={room.roomLabel}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                {room.videoUrl && (
                                  <a
                                    href={room.videoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    Voir video
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Final outputs */}
                      {(project.finalVideoUrl || project.studioMontageUrl) && (
                        <div className="mb-4 flex flex-wrap gap-2">
                          {project.finalVideoUrl && (
                            <a href={project.finalVideoUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="secondary" size="sm">
                                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                Video finale
                              </Button>
                            </a>
                          )}
                          {project.studioMontageUrl && (
                            <a href={project.studioMontageUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="secondary" size="sm">
                                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                Studio Montage
                              </Button>
                            </a>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      {showActions && onAction && (
                        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={actionLoading === project.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAction(project.id, "retry");
                            }}
                          >
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                            Retry
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={actionLoading === project.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAction(project.id, "force_done");
                            }}
                          >
                            <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                            Force Done
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={actionLoading === project.id || project.creditsRefunded === true}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAction(project.id, "refund");
                            }}
                          >
                            <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                            {project.creditsRefunded ? "Remboursé" : "Refund"}
                          </Button>
                          <a
                            href={`/project/${project.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                              Ouvrir
                            </Button>
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
          {projects.length === 0 && (
            <tr>
              <td
                colSpan={showActions ? 7 : 6}
                className="px-4 py-8 text-center text-muted"
              >
                Aucun projet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
