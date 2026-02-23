import type { Project, MontageConfig } from "../types";
import { STYLES } from "../types";

const REMOTION_URL = process.env.REMOTION_SERVER_URL || "http://localhost:8000";

interface RenderResponse {
  id: string;
  status: string;
}

interface RenderStatus {
  id: string;
  status: "rendering" | "done" | "error";
  progress: number;
  error?: string;
}

export async function startRender(project: Project): Promise<string> {
  const styleLabel =
    STYLES.find((s) => s.id === project.style)?.label || project.style;

  const rooms = project.rooms
    .filter((r) => r.videoUrl && r.selectedOptionIndex !== undefined)
    .map((r) => ({
      originalPhotoUrl: r.cleanedPhotoUrl,
      beforePhotoUrl: r.beforePhotoUrl,
      stagedPhotoUrl: r.options[r.selectedOptionIndex!].url,
      videoUrl: r.videoUrl!,
      roomType: r.roomType,
      roomLabel: r.roomLabel,
    }));

  const inputProps = {
    property: {
      title: "Virtual Staging",
      style: styleLabel,
    },
    rooms,
  };

  const response = await fetch(`${REMOTION_URL}/renders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      compositionId: "PropertyShowcase",
      inputProps,
    }),
  });

  if (!response.ok) {
    throw new Error(`Remotion render failed: ${response.status}`);
  }

  const data: RenderResponse = await response.json();
  return data.id;
}

export async function getRenderStatus(renderId: string): Promise<RenderStatus> {
  const response = await fetch(`${REMOTION_URL}/renders/${renderId}`);
  if (!response.ok) {
    throw new Error(`Remotion status check failed: ${response.status}`);
  }
  return response.json();
}

export async function downloadRender(renderId: string): Promise<Buffer> {
  const response = await fetch(`${REMOTION_URL}/renders/${renderId}/download`);
  if (!response.ok) {
    throw new Error(`Remotion download failed: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

const MUSIC_URLS: Record<string, string> = {
  elegant: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets/music/elegant.mp3`,
  energetic: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets/music/energetic.mp3`,
  minimal: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets/music/minimal.mp3`,
  dramatic: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets/music/dramatic.mp3`,
};

export async function startStudioRender(
  project: Project,
  montageConfig: MontageConfig,
): Promise<string> {
  const rooms = project.rooms
    .filter((r) => r.videoUrl && r.options.length > 0)
    .map((r) => ({
      beforePhotoUrl: r.beforePhotoUrl,
      stagedPhotoUrl: r.options[r.selectedOptionIndex ?? 0].url,
      videoUrl: r.videoUrl!,
      roomType: r.roomType,
      roomLabel: r.roomLabel,
    }));

  let musicUrl: string | undefined;
  if (montageConfig.music === "custom" && montageConfig.customMusicUrl) {
    musicUrl = montageConfig.customMusicUrl;
  } else if (montageConfig.music !== "none" && MUSIC_URLS[montageConfig.music]) {
    musicUrl = MUSIC_URLS[montageConfig.music];
  }

  const inputProps = {
    propertyInfo: montageConfig.propertyInfo,
    rooms,
    musicUrl,
  };

  const response = await fetch(`${REMOTION_URL}/renders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      compositionId: "StudioMontage",
      inputProps,
    }),
  });

  if (!response.ok) {
    throw new Error(`Studio Montage render failed: ${response.status}`);
  }

  const data: RenderResponse = await response.json();
  return data.id;
}
