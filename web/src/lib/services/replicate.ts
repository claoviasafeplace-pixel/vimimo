import Replicate from "replicate";
import {
  CLEAN_PHOTO_PROMPT,
  CLEANING_QUALITY_SUFFIX,
  STAGING_QUALITY_SUFFIX,
  klingVideoPrompt,
  KLING_NEGATIVE_PROMPT,
} from "../prompts";
import { withRetry, REPLICATE_RETRY } from "../retry";
import { savePredictionMap } from "../store";
import { withCircuitBreaker, costGuard, trackCost } from "../circuit-breaker";

function getClient() {
  return new Replicate();
}

function getWebhookUrl(): string | undefined {
  if (process.env.USE_INNGEST !== "true") return undefined;
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL;
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
): Promise<string> {
  if (ctx?.projectId) await costGuard(ctx.projectId, "kling-v2.1-pro");

  const result = await withCircuitBreaker("replicate_video", () =>
    withRetry(async () => {
      const webhookUrl = getWebhookUrl();
      const prediction = await getClient().predictions.create({
        model: "kwaivgi/kling-v2.1",
        input: {
          prompt: klingVideoPrompt(style, roomType),
          start_image: originalUrl,
          end_image: stagedUrl,
          mode: "pro",
          duration: 5,
          cfg_scale: 0.8,
          negative_prompt: KLING_NEGATIVE_PROMPT,
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
