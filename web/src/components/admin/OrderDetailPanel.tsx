"use client";

import { useCallback, useEffect, useState } from "react";
import type { Project, Room } from "@/lib/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PromptEditor from "./PromptEditor";
import {
  X,
  Loader2,
  Send,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  StickyNote,
} from "lucide-react";

interface OrderDetailPanelProps {
  projectId: string;
  onClose: () => void;
  onDeliver: (
    projectId: string,
    selectedOptions: Record<number, number>,
    adminNotes?: string
  ) => Promise<void>;
  onRegenerate: (
    projectId: string,
    roomIndex: number,
    customPrompt: string
  ) => Promise<void>;
  onStatusChange: (
    projectId: string,
    kanbanStatus: string
  ) => Promise<void>;
}

export default function OrderDetailPanel({
  projectId,
  onClose,
  onDeliver,
  onRegenerate,
  onStatusChange,
}: OrderDetailPanelProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [adminNotes, setAdminNotes] = useState("");
  const [delivering, setDelivering] = useState(false);
  const [activeRoomIndex, setActiveRoomIndex] = useState(0);

  // Fetch full project data
  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/orders/${projectId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Projet introuvable");
        return res.json();
      })
      .then((data) => {
        const proj = data.project || data;
        setProject(proj);
        // Pre-fill with existing admin selections or default to index 0
        const initial: Record<number, number> = {};
        if (proj.adminSelectedOptions) {
          for (const [k, v] of Object.entries(proj.adminSelectedOptions)) {
            initial[Number(k)] = v as number;
          }
        } else if (proj.rooms) {
          for (const room of proj.rooms as Room[]) {
            initial[room.index] = room.selectedOptionIndex ?? 0;
          }
        }
        setSelectedOptions(initial);
        setAdminNotes(proj.adminNotes || "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleOptionSelect = (roomIndex: number, optionIndex: number) => {
    setSelectedOptions((prev) => ({ ...prev, [roomIndex]: optionIndex }));
  };

  const handleDeliver = async () => {
    setDelivering(true);
    try {
      await onDeliver(projectId, selectedOptions, adminNotes || undefined);
    } catch {
      // Error handled by parent
    } finally {
      setDelivering(false);
    }
  };

  const handleRegenerate = useCallback(
    async (roomIndex: number, customPrompt: string) => {
      await onRegenerate(projectId, roomIndex, customPrompt);
      // Refetch project to get new option
      const res = await fetch(`/api/admin/orders/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data.project || data);
      }
    },
    [projectId, onRegenerate]
  );

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="rounded-2xl border border-red-500/30 bg-surface p-8 text-center">
          <p className="text-lg font-semibold text-red-400">
            {error || "Projet introuvable"}
          </p>
          <Button variant="secondary" size="sm" onClick={onClose} className="mt-4">
            Fermer
          </Button>
        </div>
      </div>
    );
  }

  const rooms = project.rooms || [];
  const photos = project.photos || [];
  const currentRoom = rooms[activeRoomIndex];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold">
              Commande{" "}
              <span className="font-mono text-amber-400">
                {project.id.slice(0, 8)}
              </span>
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted">
              {project.clientEmail && <span>{project.clientEmail}</span>}
              <span>-</span>
              <span>{project.styleLabel || project.style}</span>
              <span>-</span>
              <span>
                {rooms.length} piece{rooms.length > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Status quick-change */}
        <div className="flex items-center gap-2">
          <select
            value={project.kanbanStatus || "a_traiter"}
            onChange={(e) => onStatusChange(projectId, e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500/50"
          >
            <option value="a_traiter">A traiter</option>
            <option value="en_generation">En generation</option>
            <option value="a_valider">A valider</option>
            <option value="livre">Livre</option>
          </select>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-6">
          {/* Room navigation */}
          {rooms.length > 1 && (
            <div className="mb-6 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={activeRoomIndex === 0}
                onClick={() => setActiveRoomIndex((i) => i - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex gap-1">
                {rooms.map((room, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveRoomIndex(idx)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      activeRoomIndex === idx
                        ? "gradient-gold text-zinc-900"
                        : "text-muted hover:text-foreground hover:bg-surface-hover"
                    }`}
                  >
                    {room.roomLabel || `Piece ${idx + 1}`}
                  </button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={activeRoomIndex === rooms.length - 1}
                onClick={() => setActiveRoomIndex((i) => i + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {currentRoom ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left side: Original + Cleaned photos */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted uppercase tracking-wider">
                  <ImageIcon className="h-4 w-4" />
                  Photos client
                </h3>

                {/* Original */}
                <div className="space-y-1">
                  <p className="text-xs text-muted">Photo originale</p>
                  <div className="aspect-video overflow-hidden rounded-xl border border-border bg-surface-hover">
                    {currentRoom.beforePhotoUrl ? (
                      <img
                        src={currentRoom.beforePhotoUrl}
                        alt="Original"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted">
                        Pas de photo originale
                      </div>
                    )}
                  </div>
                </div>

                {/* Cleaned */}
                <div className="space-y-1">
                  <p className="text-xs text-muted">Photo nettoyee</p>
                  <div className="aspect-video overflow-hidden rounded-xl border border-border bg-surface-hover">
                    {currentRoom.cleanedPhotoUrl ? (
                      <img
                        src={currentRoom.cleanedPhotoUrl}
                        alt="Nettoyee"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted">
                        Pas de photo nettoyee
                      </div>
                    )}
                  </div>
                </div>

                {/* Prompt editor */}
                <div className="rounded-xl border border-border bg-surface p-4">
                  <PromptEditor
                    roomIndex={currentRoom.index}
                    currentPrompt=""
                    onRegenerate={handleRegenerate}
                  />
                </div>
              </div>

              {/* Right side: AI options grid */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted uppercase tracking-wider">
                  <ImageIcon className="h-4 w-4" />
                  Options IA — {currentRoom.roomLabel}
                </h3>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {currentRoom.options?.map((option, optIdx) => {
                    const isSelected =
                      selectedOptions[currentRoom.index] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        onClick={() =>
                          handleOptionSelect(currentRoom.index, optIdx)
                        }
                        className={`group relative aspect-video overflow-hidden rounded-xl border-2 transition-all ${
                          isSelected
                            ? "border-amber-500 shadow-[0_0_20px_rgba(200,164,90,0.3)]"
                            : "border-border hover:border-amber-500/30"
                        }`}
                      >
                        {option.url ? (
                          <img
                            src={option.url}
                            alt={`Option ${optIdx + 1}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-surface-hover text-xs text-muted">
                            Option {optIdx + 1}
                          </div>
                        )}
                        {/* Option number badge */}
                        <span
                          className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-xs font-bold ${
                            isSelected
                              ? "gradient-gold text-zinc-900"
                              : "bg-black/60 text-white"
                          }`}
                        >
                          {optIdx + 1}
                        </span>
                        {isSelected && (
                          <div className="absolute inset-0 rounded-xl ring-2 ring-amber-500/50 ring-inset" />
                        )}
                      </button>
                    );
                  })}

                  {(!currentRoom.options || currentRoom.options.length === 0) && (
                    <div className="col-span-full rounded-xl border border-border bg-surface-hover p-8 text-center text-xs text-muted">
                      Aucune option generee pour cette piece
                    </div>
                  )}
                </div>

                {/* Video preview if exists */}
                {currentRoom.videoUrl && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted">Video generee</p>
                    <video
                      src={currentRoom.videoUrl}
                      controls
                      className="w-full rounded-xl border border-border"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-16 text-muted">
              Aucune piece disponible
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-end gap-4">
          {/* Admin notes */}
          <div className="flex-1">
            <label className="mb-1 flex items-center gap-1 text-xs font-medium text-muted">
              <StickyNote className="h-3 w-3" />
              Notes admin
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-amber-500/50 resize-none"
              placeholder="Notes internes (visibles uniquement par l'admin)..."
            />
          </div>

          {/* Deliver button */}
          <Button
            variant="primary"
            size="lg"
            onClick={handleDeliver}
            disabled={delivering || rooms.length === 0}
            className="shrink-0"
          >
            {delivering ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {delivering ? "Livraison..." : "Livrer la commande"}
          </Button>
        </div>
      </div>
    </div>
  );
}
