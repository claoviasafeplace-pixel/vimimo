"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Project } from "@/lib/types";

const POLLING_PHASES = new Set([
  "cleaning",
  "analyzing",
  "generating_options",
  "generating_videos",
  "rendering",
  "rendering_montage",
  "triaging",
  "auto_staging",
]);

// Faster polling for active generation phases
const FAST_PHASES = new Set(["auto_staging", "generating_videos", "rendering_montage"]);
const FAST_INTERVAL = 2000;
const NORMAL_INTERVAL = 3000;

export function useProject(id: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetchingRef = useRef(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/project/${id}`);
      if (!res.ok) {
        throw new Error("Projet introuvable");
      }
      const data = await res.json();
      setProject(data.project);
      setError(null);
      return data.project as Project;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const scheduleNext = useCallback(
    (phase: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (!POLLING_PHASES.has(phase)) return;

      const delay = FAST_PHASES.has(phase) ? FAST_INTERVAL : NORMAL_INTERVAL;
      timeoutRef.current = setTimeout(async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        const proj = await fetchProject();
        isFetchingRef.current = false;
        if (proj && POLLING_PHASES.has(proj.phase)) {
          scheduleNext(proj.phase);
        }
      }, delay);
    },
    [fetchProject]
  );

  const stopPolling = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Initial fetch + start polling
  useEffect(() => {
    fetchProject().then((proj) => {
      if (proj && POLLING_PHASES.has(proj.phase)) {
        scheduleNext(proj.phase);
      }
    });

    return () => stopPolling();
  }, [fetchProject, scheduleNext, stopPolling]);

  // Re-evaluate polling when phase changes
  useEffect(() => {
    if (!project) return;
    if (POLLING_PHASES.has(project.phase)) {
      scheduleNext(project.phase);
    } else {
      stopPolling();
    }
  }, [project?.phase, scheduleNext, stopPolling]);

  const mutate = useCallback(
    (updatedProject: Project) => {
      setProject(updatedProject);
      if (POLLING_PHASES.has(updatedProject.phase)) {
        scheduleNext(updatedProject.phase);
      }
    },
    [scheduleNext]
  );

  return { project, isLoading, error, mutate, refetch: fetchProject };
}
