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

const PHASE_LABELS: Record<string, string> = {
  done: "Terminé",
  error: "Erreur",
  selecting: "Sélection",
  reviewing: "Révision",
  cleaning: "Nettoyage",
  analyzing: "Analyse",
  generating_options: "Génération options",
  generating_videos: "Génération vidéos",
  rendering: "Rendu",
  rendering_montage: "Rendu montage",
  auto_staging: "Staging auto",
  triaging: "Tri",
  uploading: "Upload",
};

export const ACTIVE_PHASES = [
  "cleaning",
  "analyzing",
  "generating_options",
  "selecting",
  "generating_videos",
  "rendering",
  "rendering_montage",
  "auto_staging",
  "triaging",
  "reviewing",
  "uploading",
];

export function getPhaseLabel(phase: string): string {
  return PHASE_LABELS[phase] || phase;
}

export function getPhaseColors(phase: string): string {
  return PHASE_COLORS[phase] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
}

export default function PhaseBadge({ phase }: { phase: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getPhaseColors(phase)}`}
    >
      {getPhaseLabel(phase)}
    </span>
  );
}
