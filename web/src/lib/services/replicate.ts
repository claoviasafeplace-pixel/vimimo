import Replicate from "replicate";
import {
  CLEAN_PHOTO_PROMPT,
  CLEANING_QUALITY_SUFFIX,
  STAGING_QUALITY_SUFFIX,
  klingVideoPrompt,
  KLING_NEGATIVE_PROMPT,
  klingSocialVideoPrompt,
  SOCIAL_NEGATIVE_PROMPT,
} from "../prompts";
import type { ProjectMode } from "../types";
import { withRetry, REPLICATE_RETRY } from "../retry";
import { savePredictionMap } from "../store";
import { withCircuitBreaker, costGuard, trackCost } from "../circuit-breaker";

function isMock(): boolean {
  return process.env.USE_MOCK_AI?.trim() === "true";
}

// ─── Mock Constants (B1 test assets in web/public/B1/) ──────────────
// Files served by Next.js from public/B1/. Full URL built from APP_URL
// so Inngest (server-side) and Remotion (VPS) can fetch them.

function mockBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "http://localhost:3000";
}

const MOCK_ORIGINALS = ["original-1.jpg", "original-2.jpg", "original-3.jpg"];
const MOCK_CLEANED  = ["cleaned-1.jpg", "cleaned-2.jpg", "cleaned-3.jpg"];
const MOCK_STAGED   = ["staged-1.jpg", "staged-2.jpg", "staged-3.jpg", "staged-4.jpg"];
const MOCK_VIDEO    = "video.mov";

let mockIdCounter = 0;
function mockPredictionId(prefix: string): string {
  return `mock-${prefix}-${Date.now()}-${++mockIdCounter}`;
}

/** Pick a random file from a list and return the full public URL */
function mockAssetUrl(files: string[]): string {
  const file = files[mockIdCounter % files.length];
  return `${mockBaseUrl()}/B1/${file}`;
}
// ─────────────────────────────────────────────────────────────────────

function getClient() {
  return new Replicate();
}

function getWebhookUrl(): string | undefined {
  if (process.env.USE_INNGEST !== "true") return undefined;
  const base = (process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL)?.trim();
  if (!base) return undefined;
  return `${base}/api/webhook/replicate`;
}

export interface PredictionStatus {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: string | string[] | null;
  error?: string;
}

export interface PredictionContext {
  projectId: string;
  predictionType: "clean" | "staging" | "video";
  roomIndex?: number;
}

export async function cleanPhoto(
  photoUrl: string,
  ctx?: PredictionContext,
): Promise<string> {
  if (isMock()) {
    const id = mockPredictionId("clean");
    console.log(`[MOCK_AI] cleanPhoto → ${id} (skipped Flux Kontext Pro)`);
    return id;
  }
  if (ctx?.projectId) await costGuard(ctx.projectId, "flux-kontext-pro");

  const result = await withCircuitBreaker("replicate", () =>
    withRetry(async () => {
      const webhookUrl = getWebhookUrl();
      const prediction = await getClient().predictions.create({
        model: "black-forest-labs/flux-kontext-pro",
        input: {
          prompt: `${CLEAN_PHOTO_PROMPT} ${CLEANING_QUALITY_SUFFIX}`,
          input_image: photoUrl,
          aspect_ratio: "match_input_image",
          output_format: "jpg",
          safety_tolerance: 2,
          seed: Math.floor(Math.random() * 999999),
        },
        ...(webhookUrl ? { webhook: webhookUrl, webhook_events_filter: ["completed"] } : {}),
      });

      if (ctx) {
        await savePredictionMap({
          predictionId: prediction.id,
          projectId: ctx.projectId,
          predictionType: ctx.predictionType,
          roomIndex: ctx.roomIndex,
        });
      }

      return prediction.id;
    }, REPLICATE_RETRY),
  );

  if (ctx?.projectId) await trackCost(ctx.projectId, "flux-kontext-pro");
  return result;
}

export async function generateStagingOption(
  photoUrl: string,
  prompt: string,
  ctx?: PredictionContext,
): Promise<string> {
  if (isMock()) {
    const id = mockPredictionId("staging");
    console.log(`[MOCK_AI] generateStagingOption → ${id} (skipped Flux Kontext Pro)`);
    return id;
  }
  if (ctx?.projectId) await costGuard(ctx.projectId, "flux-kontext-pro");

  const result = await withCircuitBreaker("replicate", () =>
    withRetry(async () => {
      const webhookUrl = getWebhookUrl();
      const prediction = await getClient().predictions.create({
        model: "black-forest-labs/flux-kontext-pro",
        input: {
          prompt: `${prompt} ${STAGING_QUALITY_SUFFIX}`,
          input_image: photoUrl,
          aspect_ratio: "match_input_image",
          output_format: "jpg",
          safety_tolerance: 2,
          seed: Math.floor(Math.random() * 999999),
        },
        ...(webhookUrl ? { webhook: webhookUrl, webhook_events_filter: ["completed"] } : {}),
      });

      if (ctx) {
        await savePredictionMap({
          predictionId: prediction.id,
          projectId: ctx.projectId,
          predictionType: ctx.predictionType,
          roomIndex: ctx.roomIndex,
        });
      }

      return prediction.id;
    }, REPLICATE_RETRY),
  );

  if (ctx?.projectId) await trackCost(ctx.projectId, "flux-kontext-pro");
  return result;
}

export async function generateVideo(
  originalUrl: string,
  stagedUrl: string,
  style: string,
  roomType: string,
  ctx?: PredictionContext,
  projectMode?: ProjectMode,
): Promise<string> {
  if (isMock()) {
    const id = mockPredictionId("video");
    console.log(`[MOCK_AI] generateVideo → ${id} (skipped Kling v2.1 Pro)`);
    return id;
  }
  if (ctx?.projectId) await costGuard(ctx.projectId, "kling-v2.1-pro");

  const isSocial = projectMode === "social_reel";
  const prompt = isSocial
    ? klingSocialVideoPrompt(style, roomType)
    : klingVideoPrompt(style, roomType);
  const negativePrompt = isSocial
    ? SOCIAL_NEGATIVE_PROMPT
    : KLING_NEGATIVE_PROMPT;

  const result = await withCircuitBreaker("replicate_video", () =>
    withRetry(async () => {
      const webhookUrl = getWebhookUrl();
      const prediction = await getClient().predictions.create({
        model: "kwaivgi/kling-v2.1",
        input: {
          prompt,
          start_image: originalUrl,
          end_image: stagedUrl,
          mode: "pro",
          duration: 5,
          cfg_scale: isSocial ? 0.7 : 0.8,
          negative_prompt: negativePrompt,
        },
        ...(webhookUrl ? { webhook: webhookUrl, webhook_events_filter: ["completed"] } : {}),
      });

      if (ctx) {
        await savePredictionMap({
          predictionId: prediction.id,
          projectId: ctx.projectId,
          predictionType: ctx.predictionType,
          roomIndex: ctx.roomIndex,
        });
      }

      return prediction.id;
    }, REPLICATE_RETRY),
  );

  if (ctx?.projectId) await trackCost(ctx.projectId, "kling-v2.1-pro");
  return result;
}

export async function getPredictionStatus(id: string): Promise<PredictionStatus> {
  if (isMock()) {
    let mockUrl: string;
    if (id.includes("-video-")) {
      mockUrl = `${mockBaseUrl()}/B1/${MOCK_VIDEO}`;
    } else if (id.includes("-staging-")) {
      mockUrl = mockAssetUrl(MOCK_STAGED);
    } else if (id.includes("-clean-")) {
      mockUrl = mockAssetUrl(MOCK_CLEANED);
    } else {
      mockUrl = mockAssetUrl(MOCK_ORIGINALS);
    }
    console.log(`[MOCK_AI] getPredictionStatus(${id}) → succeeded (${mockUrl})`);
    return { id, status: "succeeded", output: mockUrl };
  }
  return withCircuitBreaker("replicate", () =>
    withRetry(async () => {
      const prediction = await getClient().predictions.get(id);
      const output = prediction.output as string | string[] | null;
      return {
        id: prediction.id,
        status: prediction.status as PredictionStatus["status"],
        output,
        error: prediction.error ? String(prediction.error) : undefined,
      };
    }, REPLICATE_RETRY),
  );
}

export function extractOutputUrl(output: string | string[] | null): string | null {
  if (!output) return null;
  if (Array.isArray(output)) return output[0] || null;
  return output;
}
