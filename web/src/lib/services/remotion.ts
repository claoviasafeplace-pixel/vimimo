import type { Project, MontageConfig } from "../types";
import { STYLES } from "../types";
import { withRetry, REMOTION_RETRY } from "../retry";
import { withCircuitBreaker } from "../circuit-breaker";
import { getActiveSubscription } from "../store";

type WatermarkType = "vimimo" | "custom" | "none";

/**
 * Resolve watermark type from user's active subscription.
 * Pro/Agency → custom (marque blanche), Starter/guest/pack → vimimo.
 */
async function resolveWatermark(userId?: string): Promise<{ type: WatermarkType; agencyLogoUrl?: string }> {
  if (!userId) return { type: "vimimo" };
  const sub = await getActiveSubscription(userId);
  if (!sub) return { type: "vimimo" };
  if (sub.plan_id === "pro" || sub.plan_id === "agency") {
    return { type: "custom" };
  }
  return { type: "vimimo" };
}

const REMOTION_URL = process.env.REMOTION_SERVER_URL || "http://localhost:8000";
const RENDER_SECRET = process.env.RENDER_SECRET || "vimimo-dev-secret";
const REMOTION_TIMEOUT = 30_000; // 30 seconds

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

  const watermark = await resolveWatermark(project.userId);

  const inputProps = {
    property: {
      title: "Virtual Staging",
      style: styleLabel,
    },
    rooms,
    watermark,
  };

  return withCircuitBreaker("remotion", () =>
    withRetry(async () => {
      const response = await fetch(`${REMOTION_URL}/renders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RENDER_SECRET}`,
        },
        body: JSON.stringify({
          compositionId: "PropertyShowcase",
          inputProps,
        }),
        signal: AbortSignal.timeout(REMOTION_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Remotion render failed: ${response.status}`);
      }

      const data: RenderResponse = await response.json();
      return data.id;
    }, REMOTION_RETRY),
  );
}

export async function getRenderStatus(renderId: string): Promise<RenderStatus> {
  return withCircuitBreaker("remotion", () =>
    withRetry(async () => {
      const response = await fetch(`${REMOTION_URL}/renders/${renderId}`, {
        headers: { Authorization: `Bearer ${RENDER_SECRET}` },
        signal: AbortSignal.timeout(REMOTION_TIMEOUT),
      });
      if (!response.ok) {
        throw new Error(`Remotion status check failed: ${response.status}`);
      }
      return response.json();
    }, REMOTION_RETRY),
  );
}

export async function downloadRender(renderId: string): Promise<Buffer> {
  const response = await fetch(`${REMOTION_URL}/renders/${renderId}/download`, {
    headers: { Authorization: `Bearer ${RENDER_SECRET}` },
    signal: AbortSignal.timeout(120_000), // 2 min for download
  });
  if (!response.ok) {
    throw new Error(`Remotion download failed: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

const SUPABASE_PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";

const MUSIC_URLS: Record<string, string> = {
  elegant: `${SUPABASE_PUBLIC_URL}/storage/v1/object/public/assets/music/elegant.mp3`,
  energetic: `${SUPABASE_PUBLIC_URL}/storage/v1/object/public/assets/music/energetic.mp3`,
  minimal: `${SUPABASE_PUBLIC_URL}/storage/v1/object/public/assets/music/minimal.mp3`,
  dramatic: `${SUPABASE_PUBLIC_URL}/storage/v1/object/public/assets/music/dramatic.mp3`,
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

  const watermark = await resolveWatermark(project.userId);
  // For custom watermark, pass agency logo from montageConfig if available
  if (watermark.type === "custom" && montageConfig.propertyInfo.agencyLogoUrl) {
    watermark.agencyLogoUrl = montageConfig.propertyInfo.agencyLogoUrl;
  }

  const inputProps = {
    propertyInfo: montageConfig.propertyInfo,
    rooms,
    musicUrl,
    watermark,
  };

  return withCircuitBreaker("remotion", () =>
    withRetry(async () => {
      const response = await fetch(`${REMOTION_URL}/renders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RENDER_SECRET}`,
        },
        body: JSON.stringify({
          compositionId: "StudioMontage",
          inputProps,
        }),
        signal: AbortSignal.timeout(REMOTION_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Studio Montage render failed: ${response.status}`);
      }

      const data: RenderResponse = await response.json();
      return data.id;
    }, REMOTION_RETRY),
  );
}

export async function startSocialRender(project: Project): Promise<string> {
  const rooms = project.rooms
    .filter((r) => r.videoUrl && r.options.length > 0)
    .map((r) => ({
      beforePhotoUrl: r.beforePhotoUrl,
      stagedPhotoUrl: r.options[r.selectedOptionIndex ?? 0].url,
      videoUrl: r.videoUrl!,
      roomType: r.roomType,
      roomLabel: r.roomLabel,
    }));

  const watermark = await resolveWatermark(project.userId);
  const styleLabel =
    STYLES.find((s) => s.id === project.style)?.label || project.style;

  const inputProps = {
    hookText: "Avant / Après IA ✨",
    rooms,
    watermark,
    style: styleLabel,
  };

  return withCircuitBreaker("remotion", () =>
    withRetry(async () => {
      const response = await fetch(`${REMOTION_URL}/renders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RENDER_SECRET}`,
        },
        body: JSON.stringify({
          compositionId: "SocialMontage",
          inputProps,
        }),
        signal: AbortSignal.timeout(REMOTION_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Social Montage render failed: ${response.status}`);
      }

      const data: RenderResponse = await response.json();
      return data.id;
    }, REMOTION_RETRY),
  );
}
