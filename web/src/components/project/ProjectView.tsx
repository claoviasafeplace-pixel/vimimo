"use client";

import { AlertCircle } from "lucide-react";
import ProcessingView from "./ProcessingView";
import SelectionView from "./SelectionView";
import GenerationView from "./GenerationView";
import ResultView from "./ResultView";
import TriageView from "./TriageView";
import AutoStagingView from "./AutoStagingView";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { Project, ConfirmedPhoto } from "@/lib/types";

interface ProjectViewProps {
  project: Project;
  onSelect: (roomIndex: number, optionIndex: number) => void;
  onConfirm: () => void;
  onTriageConfirm?: (confirmedPhotos: ConfirmedPhoto[]) => void;
  isTriageSubmitting?: boolean;
}

export default function ProjectView({
  project,
  onSelect,
  onConfirm,
  onTriageConfirm,
  isTriageSubmitting,
}: ProjectViewProps) {
  if (project.phase === "error") {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
          <h2 className="mt-4 text-xl font-bold">Une erreur est survenue</h2>
          <p className="mt-2 text-sm text-muted">
            {project.error || "Erreur inconnue"}
          </p>
          <a href="/" className="mt-6 inline-block">
            <Button variant="secondary">Retour à l&apos;accueil</Button>
          </a>
        </Card>
      </div>
    );
  }

  if (
    project.phase === "cleaning" ||
    project.phase === "analyzing" ||
    project.phase === "generating_options" ||
    project.phase === "triaging"
  ) {
    return <ProcessingView phase={project.phase} mode={project.mode} />;
  }

  if (project.phase === "reviewing" && onTriageConfirm) {
    return (
      <TriageView
        project={project}
        onConfirm={onTriageConfirm}
        isSubmitting={isTriageSubmitting || false}
      />
    );
  }

  if (project.phase === "auto_staging") {
    return <AutoStagingView project={project} />;
  }

  if (project.phase === "selecting") {
    return (
      <SelectionView
        project={project}
        onSelect={onSelect}
        onConfirm={onConfirm}
      />
    );
  }

  if (project.phase === "generating_videos") {
    return <GenerationView project={project} />;
  }

  if (project.phase === "rendering") {
    return <ResultView project={project} isRendering />;
  }

  if (project.phase === "rendering_montage") {
    return <ResultView project={project} isRendering={false} isRenderingMontage />;
  }

  if (project.phase === "done") {
    return <ResultView project={project} isRendering={false} />;
  }

  return null;
}
