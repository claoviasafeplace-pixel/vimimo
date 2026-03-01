/**
 * AI Service — Hybrid: Gemini (images) + Kling on Replicate (videos)
 *
 * Images: Gemini 2.5 Flash Image (Nano Banana) — synchronous, "done:<url>" convention.
 * Videos: Kling v2.1 Pro on Replicate — async image-to-video with start_image + end_image.
 *
 * This hybrid approach gives us the best of both worlds:
 * - Fast, cheap image generation via Gemini (~6s, $0.07)
 * - Faithful video generation via Kling (image-to-video matches the staged photo)
 */

import Replicate from "replicate";
import { nanoid } from "nanoid";
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
import { getSupabase } from "../supabase";
import { savePredictionMap } from "../store";
import { withCircuitBreaker, costGuard, trackCost } from "../circuit-breaker";

// ─── Config ────────────────────────────────────────────────────────
const GEMINI_API_KEY = () => process.env.GEMINI_API_KEY || "";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const IMAGE_MODEL = "gemini-2.5-flash-image";

// ─── Replicate (Kling videos) ──────────────────────────────────────
function getReplicateClient() {
  return new Replicate();
}

function getWebhookUrl(): string | undefined {
  if (process.env.USE_INNGEST !== "true") return undefined;
  const base = (process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL)?.trim();
  if (!base) return undefined;
  return `${base}/api/webhook/replicate`;
}

// ─── Mock ──────────────────────────────────────────────────────────
function isMock(): boolean {
  return process.env.USE_MOCK_AI?.trim() === "true";
}

function mockBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "http://localhost:3000";
}

const MOCK_ORIGINALS = ["original-1.jpg", "original-2.jpg", "original-3.jpg"];
const MOCK_CLEANED = ["cleaned-1.jpg", "cleaned-2.jpg", "cleaned-3.jpg"];
const MOCK_STAGED = ["staged-1.jpg", "staged-2.jpg", "staged-3.jpg", "staged-4.jpg"];
const MOCK_VIDEO = "video.mov";

// Acceptable in mock mode — not used in production
let mockIdCounter = 0;
function mockPredictionId(prefix: string): string {
  return `mock-${prefix}-${Date.now()}-${++mockIdCounter}`;
}
function mockAssetUrl(files: string[]): string {
  const file = files[mockIdCounter % files.length];
  return `${mockBaseUrl()}/B1/${file}`;
}

// ─── Types (unchanged interface) ───────────────────────────────────
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

// ─── Helpers ───────────────────────────────────────────────────────

const ALLOWED_IMAGE_DOMAINS = [
  ".supabase.co",
  ".supabase.in",
  "public.blob.vercel-storage.com",
];

/** Validate that an image URL points to a trusted domain (SSRF protection) */
function validateImageUrl(url: string): void {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") {
    throw new Error(`Image URL must use HTTPS (got ${parsed.protocol})`);
  }
  const hostname = parsed.hostname.toLowerCase();
  const allowed = ALLOWED_IMAGE_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(domain),
  );
  if (!allowed) {
    throw new Error(`Image URL domain not allowed: ${hostname}`);
  }
}

/** Download image from URL → base64 string */
async function imageUrlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
  validateImageUrl(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "image/jpeg";
  return { data: buffer.toString("base64"), mimeType: contentType };
}

/** Upload base64 image to Supabase Storage, return public URL.
 *  NOTE: The "photos" bucket also stores AI-generated videos and staged images. */
async function uploadBase64ToStorage(base64: string, prefix: string): Promise<string> {
  const db = getSupabase();
  const id = nanoid(10);
  const path = `ai-output/${prefix}-${id}.png`;
  const buffer = Buffer.from(base64, "base64");

  const { error } = await db.storage
    .from("photos")
    .upload(path, buffer, { contentType: "image/png", upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = db.storage.from("photos").getPublicUrl(path);
  return data.publicUrl;
}

/** Call Gemini image editing (Nano Banana) */
async function geminiImageEdit(imageUrl: string, prompt: string): Promise<string> {
  const { data: imgData, mimeType } = await imageUrlToBase64(imageUrl);

  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType, data: imgData } },
      ],
    }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  };

  const res = await fetch(
    `${GEMINI_BASE}/models/${IMAGE_MODEL}:generateContent?key=${GEMINI_API_KEY()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("Gemini returned no content");

  // Find the image part (Gemini REST returns camelCase: inlineData)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imagePart = parts.find((p: any) => p.inlineData);
  if (!imagePart?.inlineData?.data) {
    // Check for text-only response (refusal or no-image)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textPart = parts.find((p: any) => p.text);
    const reason = textPart?.text?.substring(0, 100) || "unknown";
    throw new Error(`Gemini returned no image: ${reason}`);
  }

  return imagePart.inlineData.data; // base64
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API — same interface as replicate-lucie.ts
// ═══════════════════════════════════════════════════════════════════

/**
 * Clean a photo (remove furniture) using Gemini Nano Banana.
 * Returns "done:<url>" — synchronous, no polling needed.
 */
export async function cleanPhoto(
  photoUrl: string,
  ctx?: PredictionContext,
): Promise<string> {
  if (isMock()) {
    const id = mockPredictionId("clean");
    console.log(`[MOCK_AI] cleanPhoto → ${id} (skipped Gemini)`);
    return id;
  }
  if (ctx?.projectId) await costGuard(ctx.projectId, "gemini-image");

  const result = await withCircuitBreaker("gemini", () =>
    withRetry(async () => {
      const prompt = `${CLEAN_PHOTO_PROMPT} ${CLEANING_QUALITY_SUFFIX}`;
      try {
        const base64 = await geminiImageEdit(photoUrl, prompt);
        const publicUrl = await uploadBase64ToStorage(base64, "cleaned");
        console.log(`[Gemini] cleanPhoto done → ${publicUrl.substring(0, 60)}...`);
        return `done:${publicUrl}`;
      } catch (e) {
        // Gemini may refuse exterior/pool/garden photos — fallback to original
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("Gemini returned no image")) {
          console.log(`[Gemini] cleanPhoto skipped (no edit needed) → using original`);
          return `done:${photoUrl}`;
        }
        throw e;
      }
    }, REPLICATE_RETRY),
  );

  if (ctx?.projectId) await trackCost(ctx.projectId, "gemini-image");
  return result;
}

/**
 * Generate a staging option using Gemini Nano Banana.
 * Returns "done:<url>" — synchronous, no polling needed.
 */
export async function generateStagingOption(
  photoUrl: string,
  prompt: string,
  ctx?: PredictionContext,
): Promise<string> {
  if (isMock()) {
    const id = mockPredictionId("staging");
    console.log(`[MOCK_AI] generateStagingOption → ${id} (skipped Gemini)`);
    return id;
  }
  if (ctx?.projectId) await costGuard(ctx.projectId, "gemini-image");

  const result = await withCircuitBreaker("gemini", () =>
    withRetry(async () => {
      const fullPrompt = `${prompt} ${STAGING_QUALITY_SUFFIX}`;
      const base64 = await geminiImageEdit(photoUrl, fullPrompt);
      const publicUrl = await uploadBase64ToStorage(base64, "staged");
      console.log(`[Gemini] staging done → ${publicUrl.substring(0, 60)}...`);
      return `done:${publicUrl}`;
    }, REPLICATE_RETRY),
  );

  if (ctx?.projectId) await trackCost(ctx.projectId, "gemini-image");
  return result;
}

/**
 * Generate a video using Kling v2.1 Pro on Replicate (image-to-video).
 * Uses start_image (original room) + end_image (staged room) for faithful results.
 * Returns a Replicate prediction ID — async, needs polling via getPredictionStatus.
 */
export async function generateVideo(
  originalUrl: string,
  stagedUrl: string,
  style: string,
  roomType: string,
  ctx?: PredictionContext,
  projectMode?: ProjectMode,
  aspectRatio?: "16:9" | "9:16" | "1:1",
): Promise<string> {
  if (isMock()) {
    const id = mockPredictionId("video");
    console.log(`[MOCK_AI] generateVideo → ${id} (skipped Kling v2.1 Pro)`);
    return id;
  }
  if (ctx?.projectId) await costGuard(ctx.projectId, "kling-v2.1-pro");

  const isSocial = projectMode === "social_reel" || aspectRatio === "9:16";
  const prompt = isSocial
    ? klingSocialVideoPrompt(style, roomType)
    : klingVideoPrompt(style, roomType);
  const negativePrompt = isSocial
    ? SOCIAL_NEGATIVE_PROMPT
    : KLING_NEGATIVE_PROMPT;

  const resolvedAspectRatio = aspectRatio || (isSocial ? "9:16" : "16:9");

  const result = await withCircuitBreaker("replicate_video", () =>
    withRetry(async () => {
      const webhookUrl = getWebhookUrl();
      const prediction = await getReplicateClient().predictions.create({
        model: "kwaivgi/kling-v2.1",
        input: {
          prompt,
          start_image: originalUrl,
          end_image: stagedUrl,
          mode: "pro",
          duration: 5,
          aspect_ratio: resolvedAspectRatio,
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

      console.log(`[Kling] Video submitted → ${prediction.id} (${resolvedAspectRatio})`);
      return prediction.id;
    }, REPLICATE_RETRY),
  );

  if (ctx?.projectId) await trackCost(ctx.projectId, "kling-v2.1-pro");
  return result;
}

/**
 * Get prediction status.
 * - "done:..." IDs → return succeeded immediately (Gemini sync results)
 * - "mock-..." IDs → return mock succeeded
 * - Other IDs → poll Replicate prediction (Kling videos)
 */
export async function getPredictionStatus(id: string): Promise<PredictionStatus> {
  // Gemini sync results (images)
  if (id.startsWith("done:")) {
    const url = id.slice(5);
    return { id, status: "succeeded", output: url };
  }

  // Mock results
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

  // Replicate prediction polling (Kling videos)
  return withCircuitBreaker("replicate_video", () =>
    withRetry(async () => {
      const prediction = await getReplicateClient().predictions.get(id);
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
