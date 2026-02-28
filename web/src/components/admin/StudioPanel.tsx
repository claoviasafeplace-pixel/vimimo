"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Loader2, Trash2, Wand2, Film, CheckCircle, ImageIcon, RefreshCw,
  ChevronDown, Eye, Download, Sparkles, AlertTriangle, Upload, Plus,
} from "lucide-react";
import Button from "@/components/ui/Button";
import PhaseBadge from "@/components/ui/PhaseBadge";
import type { Photo, Room, Style, Project } from "@/lib/types";
import { STYLES } from "@/lib/types";

const ACCEPTED_TYPES = ".jpg,.jpeg,.png,.webp,.heic,.heif";

// ─── Types ───
interface StudioProject {
  id: string;
  phase: string;
  style: Style;
  styleLabel: string;
  photos: Photo[];
  rooms: Room[];
  apiCostUsd?: number;
  mode?: string;
  globalContext?: string;
}

type Step = "photos" | "staging" | "videos";

// ─── Helpers ───
async function api(projectId: string, action: string, body?: Record<string, unknown>) {
  const res = await fetch(`/api/admin/studio/${projectId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Réponse invalide du serveur (${res.status})`);
  }
  if (!res.ok) throw new Error((data.error as string) || `Erreur ${res.status}`);
  return data;
}

// ─── Main Component ───
export default function StudioPanel({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [project, setProject] = useState<StudioProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("photos");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Load project
  const loadProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/studio/${projectId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProject(data.project);
      setError(null);
      // Auto-detect step
      const p = data.project as StudioProject;
      if (p.rooms.some((r: Room) => r.videoUrl)) setStep("videos");
      else if (p.rooms.length > 0) setStep("staging");
      else setStep("photos");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadProject]);

  // ─── Action: Clean Photos ───
  const handleCleanPhotos = async () => {
    setActionLoading("cleaning");
    try {
      // Submit photos one-by-one (Gemini is sync — each call returns the cleaned URL)
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const result = await api(projectId, "clean_photos");
        await loadProject();
        if (result.allSubmitted || (result.remaining ?? 0) === 0) break;
      }
      // Check completion (images are already done since Gemini is sync)
      const data = await api(projectId, "check_cleaning");
      await loadProject();
      if (!data.done) {
        // Fallback polling for any async predictions still in flight
        pollRef.current = setInterval(async () => {
          try {
            const d = await api(projectId, "check_cleaning");
            await loadProject();
            if (d.done) {
              if (pollRef.current) clearInterval(pollRef.current);
              pollRef.current = null;
              setActionLoading(null);
            }
          } catch {
            if (pollRef.current) clearInterval(pollRef.current);
            setActionLoading(null);
          }
        }, 4000);
      } else {
        setActionLoading(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setActionLoading(null);
    }
  };

  // ─── Action: Analyze Rooms ───
  const handleAnalyzeRooms = async () => {
    setActionLoading("analyzing");
    try {
      await api(projectId, "analyze_rooms");
      await loadProject();
      setStep("staging");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Action: Generate Staging ───
  const handleGenerateStaging = async (roomIndex: number, customPrompt?: string) => {
    setActionLoading(`staging-${roomIndex}`);
    try {
      await api(projectId, "generate_staging", { roomIndex, customPrompt });
      // Poll
      const poll = setInterval(async () => {
        try {
          const data = await api(projectId, "check_staging", { roomIndex });
          await loadProject();
          if (data.done) {
            clearInterval(poll);
            setActionLoading(null);
          }
        } catch {
          clearInterval(poll);
          setActionLoading(null);
        }
      }, 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setActionLoading(null);
    }
  };

  // ─── Action: Select Option ───
  const handleSelectOption = async (roomIndex: number, optionIndex: number) => {
    try {
      await api(projectId, "select_option", { roomIndex, optionIndex });
      await loadProject();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  };

  // ─── Action: Generate Video ───
  const handleGenerateVideo = async (roomIndex: number) => {
    setActionLoading(`video-${roomIndex}`);
    try {
      await api(projectId, "generate_video", { roomIndex });
      // Poll
      const poll = setInterval(async () => {
        try {
          const data = await api(projectId, "check_video", { roomIndex });
          await loadProject();
          if (data.done) {
            clearInterval(poll);
            setActionLoading(null);
          }
        } catch {
          clearInterval(poll);
          setActionLoading(null);
        }
      }, 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setActionLoading(null);
    }
  };

  // ─── Action: Add Photos ───
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleAddPhotos = async (files: FileList) => {
    setActionLoading("uploading");
    setError(null);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("photos", files[i]);
      }
      const res = await fetch(`/api/admin/studio/${projectId}`, {
        method: "PUT",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      await loadProject();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur upload");
    } finally {
      setActionLoading(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ─── Render ───
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center text-red-400">
        {error || "Projet introuvable"}
      </div>
    );
  }

  const allCleaned = project.photos.every((p) => p.cleanedUrl);
  const someCleanedPending = project.photos.some((p) => p.cleanPredictionId && !p.cleanedUrl);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">Studio — {project.id.slice(0, 8)}</h2>
          <PhaseBadge phase={project.phase} />
          {project.apiCostUsd !== undefined && (
            <span className="text-xs text-muted">Coût IA : ${project.apiCostUsd.toFixed(2)}</span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Fermer</Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-xs underline cursor-pointer">Fermer</button>
        </div>
      )}

      {/* Step tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
        {([
          { id: "photos" as Step, label: "1. Photos", icon: ImageIcon },
          { id: "staging" as Step, label: "2. Staging IA", icon: Wand2 },
          { id: "videos" as Step, label: "3. Vidéos IA", icon: Film },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setStep(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
              step === t.id
                ? "bg-surface-hover text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ STEP 1: PHOTOS ═══ */}
      {step === "photos" && (
        <div className="space-y-4">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleAddPhotos(e.target.files);
            }}
          />

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">
              {project.photos.length} photo{project.photos.length > 1 ? "s" : ""} —
              {allCleaned ? " toutes nettoyées" : ` ${project.photos.filter((p) => p.cleanedUrl).length} nettoyée(s)`}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={actionLoading === "uploading"}
                onClick={() => fileInputRef.current?.click()}
              >
                {actionLoading === "uploading" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-1.5 h-4 w-4" />
                )}
                Ajouter des photos
              </Button>
              {!allCleaned && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={actionLoading === "cleaning"}
                  onClick={handleCleanPhotos}
                >
                  {actionLoading === "cleaning" ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1.5 h-4 w-4" />
                  )}
                  Retirer les meubles
                </Button>
              )}
              {allCleaned && project.rooms.length === 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={actionLoading === "analyzing"}
                  onClick={handleAnalyzeRooms}
                >
                  {actionLoading === "analyzing" ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1.5 h-4 w-4" />
                  )}
                  Analyser les pièces (GPT-4o)
                </Button>
              )}
            </div>
          </div>

          {/* Photo grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {project.photos.map((photo, i) => (
              <div key={photo.id} className="rounded-xl border border-border bg-surface overflow-hidden">
                <div className="relative aspect-[4/3]">
                  <img
                    src={photo.cleanedUrl || photo.originalUrl}
                    alt={`Photo ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {photo.cleanPredictionId && !photo.cleanedUrl && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                  )}
                  {photo.cleanedUrl && (
                    <div className="absolute top-2 right-2 rounded-full bg-green-500/20 border border-green-500/40 p-1">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    </div>
                  )}
                </div>
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-muted">Photo {i + 1}</span>
                  {photo.cleanedUrl && photo.cleanedUrl !== photo.originalUrl && (
                    <div className="flex gap-1">
                      <a href={photo.originalUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-muted hover:text-foreground">Original</a>
                      <span className="text-[10px] text-muted">|</span>
                      <a href={photo.cleanedUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-amber-400 hover:text-amber-300">Nettoyée</a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {allCleaned && project.rooms.length > 0 && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-400">
              <CheckCircle className="inline h-4 w-4 mr-1.5" />
              {project.rooms.length} pièce{project.rooms.length > 1 ? "s" : ""} analysée{project.rooms.length > 1 ? "s" : ""} — passez à l&apos;étape Staging
            </div>
          )}
        </div>
      )}

      {/* ═══ STEP 2: STAGING ═══ */}
      {step === "staging" && (
        <div className="space-y-6">
          {project.rooms.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">
              <p>Aucune pièce analysée. Retournez à l&apos;étape Photos pour analyser.</p>
            </div>
          ) : (
            project.rooms.map((room, ri) => (
              <RoomStagingCard
                key={ri}
                room={room}
                roomIndex={ri}
                style={project.style}
                actionLoading={actionLoading}
                onGenerate={(customPrompt) => handleGenerateStaging(ri, customPrompt)}
                onSelect={(optionIndex) => handleSelectOption(ri, optionIndex)}
              />
            ))
          )}
        </div>
      )}

      {/* ═══ STEP 3: VIDEOS ═══ */}
      {step === "videos" && (
        <div className="space-y-6">
          {project.rooms.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">
              Aucune pièce. Lancez d&apos;abord le staging.
            </div>
          ) : (
            project.rooms.map((room, ri) => (
              <RoomVideoCard
                key={ri}
                room={room}
                roomIndex={ri}
                actionLoading={actionLoading}
                onGenerate={() => handleGenerateVideo(ri)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Room Staging Card ───
function RoomStagingCard({
  room, roomIndex, style, actionLoading, onGenerate, onSelect,
}: {
  room: Room;
  roomIndex: number;
  style: Style;
  actionLoading: string | null;
  onGenerate: (customPrompt?: string) => void;
  onSelect: (optionIndex: number) => void;
}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const isLoading = actionLoading === `staging-${roomIndex}`;

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{room.roomLabel}</span>
          <span className="text-xs text-muted">({room.roomType})</span>
        </div>
        <div className="flex items-center gap-2">
          {room.selectedOptionIndex !== undefined && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" /> Option {room.selectedOptionIndex + 1}
            </span>
          )}
          <Button
            variant="primary"
            size="sm"
            disabled={isLoading}
            onClick={() => onGenerate(showPrompt && customPrompt ? customPrompt : undefined)}
          >
            {isLoading ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wand2 className="mr-1 h-3.5 w-3.5" />
            )}
            {room.options.length > 0 ? "Régénérer" : "Générer staging"}
          </Button>
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            className="text-xs text-muted hover:text-foreground cursor-pointer"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showPrompt ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Custom prompt */}
      {showPrompt && (
        <div className="border-b border-border px-4 py-3 bg-surface-hover">
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Prompt personnalisé (optionnel) — laissez vide pour utiliser le prompt IA auto"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted/60 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            rows={3}
          />
        </div>
      )}

      {/* Before + Options grid */}
      <div className="p-4">
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {/* Before photo */}
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border/50">
            <img src={room.cleanedPhotoUrl} alt="Avant" className="h-full w-full object-cover" />
            <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
              Avant
            </span>
          </div>

          {/* Staging options */}
          {room.options.map((opt, oi) => (
            <button
              key={oi}
              onClick={() => onSelect(oi)}
              className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                room.selectedOptionIndex === oi
                  ? "border-amber-400 shadow-[0_0_12px_rgba(201,168,76,0.3)]"
                  : "border-border/50 hover:border-border"
              }`}
            >
              <img src={opt.url} alt={`Option ${oi + 1}`} className="h-full w-full object-cover" />
              <span className={`absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[10px] ${
                room.selectedOptionIndex === oi ? "bg-amber-500 text-black font-bold" : "bg-black/60 text-white"
              }`}>
                {room.selectedOptionIndex === oi ? "Sélectionnée" : `Option ${oi + 1}`}
              </span>
            </button>
          ))}

          {/* Loading placeholder */}
          {isLoading && room.options.length === 0 && (
            <div className="aspect-[4/3] rounded-lg border border-dashed border-border flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Room Video Card ───
function RoomVideoCard({
  room, roomIndex, actionLoading, onGenerate,
}: {
  room: Room;
  roomIndex: number;
  actionLoading: string | null;
  onGenerate: () => void;
}) {
  const isLoading = actionLoading === `video-${roomIndex}`;
  const hasSelection = room.selectedOptionIndex !== undefined;
  const stagedUrl = hasSelection ? room.options[room.selectedOptionIndex!]?.url : null;

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{room.roomLabel}</span>
          <span className="text-xs text-muted">({room.roomType})</span>
          {room.videoUrl && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" /> Vidéo prête
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {room.videoUrl && (
            <a href={room.videoUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm">
                <Download className="mr-1 h-3.5 w-3.5" /> Télécharger
              </Button>
            </a>
          )}
          <Button
            variant="primary"
            size="sm"
            disabled={isLoading || !hasSelection}
            onClick={onGenerate}
          >
            {isLoading ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Film className="mr-1 h-3.5 w-3.5" />
            )}
            {room.videoUrl ? "Régénérer" : "Générer vidéo"}
          </Button>
        </div>
      </div>

      <div className="p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Before → After comparison */}
          <div className="space-y-2">
            <p className="text-xs text-muted">Avant → Après</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border/50">
                <img src={room.beforePhotoUrl} alt="Avant" className="h-full w-full object-cover" />
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">Avant</span>
              </div>
              {stagedUrl ? (
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-amber-400/50">
                  <img src={stagedUrl} alt="Après" className="h-full w-full object-cover" />
                  <span className="absolute bottom-1 left-1 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] text-black font-bold">Après</span>
                </div>
              ) : (
                <div className="aspect-[4/3] rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted">
                  Pas de staging
                </div>
              )}
            </div>
          </div>

          {/* Video */}
          <div className="space-y-2">
            <p className="text-xs text-muted">Vidéo IA</p>
            {room.videoUrl ? (
              <div className="relative aspect-video rounded-lg overflow-hidden border border-border bg-black">
                <video
                  src={room.videoUrl}
                  controls
                  className="h-full w-full object-contain"
                  preload="metadata"
                />
              </div>
            ) : isLoading ? (
              <div className="aspect-video rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
                <span className="text-xs text-amber-400">Génération en cours (~2 min)</span>
              </div>
            ) : (
              <div className="aspect-video rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted">
                {hasSelection ? "Cliquez \"Générer vidéo\"" : "Sélectionnez d'abord un staging"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
