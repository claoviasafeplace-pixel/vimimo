"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Project } from "@/lib/types";

const POLL_INTERVAL = 3000;

const POLLING_PHASES = new Set([
  "cleaning",
  "analyzing",
  "generating_options",
  "generating_videos",
  "rendering",
  "rendering_montage",
]);

export function useProject(id: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(async () => {
      const proj = await fetchProject();
      if (proj && !POLLING_PHASES.has(proj.phase)) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, POLL_INTERVAL);
  }, [fetchProject]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Initial fetch + start polling
  useEffect(() => {
    fetchProject().then((proj) => {
      if (proj && POLLING_PHASES.has(proj.phase)) {
        startPolling();
      }
    });

    return () => stopPolling();
  }, [fetchProject, startPolling, stopPolling]);

  // Re-evaluate polling when phase changes
  useEffect(() => {
    if (!project) return;
    if (POLLING_PHASES.has(project.phase)) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [project?.phase, startPolling, stopPolling]);

  const mutate = useCallback(
    (updatedProject: Project) => {
      setProject(updatedProject);
      // Restart polling if needed
      if (POLLING_PHASES.has(updatedProject.phase)) {
        startPolling();
      }
    },
    [startPolling]
  );

  return { project, isLoading, error, mutate, refetch: fetchProject };
}
