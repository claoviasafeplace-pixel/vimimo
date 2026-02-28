/**
 * AI Service — Google Gemini (Nano Banana) for images + Veo 3.1 for videos
 *
 * SAME INTERFACE as the old Replicate service (replicate-lucie.ts).
 * Images are synchronous (Gemini returns result immediately) so we use
 * the "done:<url>" convention: getPredictionStatus("done:...") returns
 * succeeded instantly. Videos use Veo 3.1 async operations.
 *
 * To revert to Replicate/Kling: copy replicate-lucie.ts back to replicate.ts
 */

import { nanoid } from "nanoid";
import {
  CLEAN_PHOTO_PROMPT,
  CLEANING_QUALITY_SUFFIX,
  STAGING_QUALITY_SUFFIX,
  veoVideoPrompt,
  VEO_NEGATIVE_PROMPT,
  veoSocialVideoPrompt,
  SOCIAL_VEO_NEGATIVE_PROMPT,
} from "../prompts";
import type { ProjectMode } from "../types";
import { withRetry, REPLICATE_RETRY } from "../retry";
import { getSupabase } from "../supabase";
import { withCircuitBreaker, costGuard, trackCost } from "../circuit-breaker";

// ─── Config ────────────────────────────────────────────────────────
const GEMINI_API_KEY = () => process.env.GEMINI_API_KEY || "";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const IMAGE_MODEL = "gemini-2.5-flash-image";
const VIDEO_MODEL = "veo-3.1-generate-preview";

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

/** Download image from URL → base64 string */
async function imageUrlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "image/jpeg";
  return { data: buffer.toString("base64"), mimeType: contentType };
}

/** Upload base64 image to Supabase Storage, return public URL */
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

/** Submit Veo 3.1 video generation, return operation name */
async function veoSubmit(
  prompt: string,
  firstFrameUrl: string,
  lastFrameUrl?: string,
  aspectRatio: string = "16:9",
): Promise<string> {
  const firstFrame = await imageUrlToBase64(firstFrameUrl);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestBody: any = {
    instances: [{
      prompt,
      image: {
        inlineData: { mimeType: firstFrame.mimeType, data: firstFrame.data },
      },
    }],
    parameters: {
      aspectRatio,
      sampleCount: 1,
      durationSeconds: 5,
      personGeneration: "allow_all",
      enhancePrompt: false,
    },
  };

  // Add last frame if provided
  if (lastFrameUrl) {
    const lastFrame = await imageUrlToBase64(lastFrameUrl);
    requestBody.parameters.lastFrame = {
      inlineData: { mimeType: lastFrame.mimeType, data: lastFrame.data },
    };
  }

  const res = await fetch(
    `${GEMINI_BASE}/models/${VIDEO_MODEL}:predictLongRunning?key=${GEMINI_API_KEY()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Veo API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  // Returns { "name": "operations/xxx" }
  const operationName = json.name;
  if (!operationName) throw new Error("Veo returned no operation name");
  return operationName;
}

/** Poll a Veo operation */
async function veoPoll(operationName: string): Promise<PredictionStatus> {
  const res = await fetch(
    `${GEMINI_BASE}/${operationName}?key=${GEMINI_API_KEY()}`,
    { headers: { "Content-Type": "application/json" } },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Veo poll error ${res.status}: ${err}`);
  }

  const json = await res.json();

  if (json.done) {
    // Extract video URI
    const video = json.response?.generateVideoResponse?.generatedSamples?.[0]?.video;
    if (video?.uri) {
      return {
        id: operationName,
        status: "succeeded",
        output: video.uri,
      };
    }
    // Check for error
    const error = json.error?.message || json.response?.error;
    return {
      id: operationName,
      status: "failed",
      output: null,
      error: error || "Veo returned no video",
    };
  }

  // Still processing
  return {
    id: operationName,
    status: json.metadata?.state === "ACTIVE" ? "processing" : "starting",
    output: null,
  };
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
 * Generate a video using Veo 3.1 (first frame → last frame interpolation).
 * Returns a Veo operation name — async, needs polling via getPredictionStatus.
 */
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
    console.log(`[MOCK_AI] generateVideo → ${id} (skipped Veo 3.1)`);
    return id;
  }
  if (ctx?.projectId) await costGuard(ctx.projectId, "veo-3.1");

  const isSocial = projectMode === "social_reel";
  const prompt = isSocial
    ? veoSocialVideoPrompt(style, roomType)
    : veoVideoPrompt(style, roomType);

  const result = await withCircuitBreaker("google_video", () =>
    withRetry(async () => {
      const operationName = await veoSubmit(
        prompt,
        originalUrl,
        stagedUrl,
        isSocial ? "9:16" : "16:9",
      );
      console.log(`[Veo] Video submitted → ${operationName}`);
      return operationName;
    }, REPLICATE_RETRY),
  );

  if (ctx?.projectId) await trackCost(ctx.projectId, "veo-3.1");
  return result;
}

/**
 * Get prediction status.
 * - "done:..." IDs → return succeeded immediately (Gemini sync results)
 * - "operations/..." IDs → poll Veo operation
 * - "mock-..." IDs → return mock succeeded
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

  // Veo operation polling
  return withCircuitBreaker("google_video", () =>
    withRetry(async () => veoPoll(id), REPLICATE_RETRY),
  );
}

export function extractOutputUrl(output: string | string[] | null): string | null {
  if (!output) return null;
  if (Array.isArray(output)) return output[0] || null;
  return output;
}
