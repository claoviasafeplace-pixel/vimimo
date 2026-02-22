import Replicate from "replicate";
import { CLEAN_PHOTO_PROMPT, klingVideoPrompt, KLING_NEGATIVE_PROMPT } from "../prompts";

function getClient() {
  return new Replicate();
}

export interface PredictionStatus {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: string | string[] | null;
  error?: string;
}

export async function cleanPhoto(photoUrl: string): Promise<string> {
  const prediction = await getClient().predictions.create({
    model: "black-forest-labs/flux-kontext-pro",
    input: {
      prompt: CLEAN_PHOTO_PROMPT,
      input_image: photoUrl,
      aspect_ratio: "match_input_image",
      output_format: "jpg",
      safety_tolerance: 2,
      seed: Math.floor(Math.random() * 999999),
    },
  });
  return prediction.id;
}

export async function generateStagingOption(
  photoUrl: string,
  prompt: string
): Promise<string> {
  const prediction = await getClient().predictions.create({
    model: "black-forest-labs/flux-kontext-pro",
    input: {
      prompt: prompt + " Photorealistic, exact room proportions, no distortion, camera locked.",
      input_image: photoUrl,
      aspect_ratio: "match_input_image",
      output_format: "jpg",
      safety_tolerance: 2,
      seed: Math.floor(Math.random() * 999999),
    },
  });
  return prediction.id;
}

export async function generateVideo(
  originalUrl: string,
  stagedUrl: string,
  style: string,
  roomType: string
): Promise<string> {
  const prediction = await getClient().predictions.create({
    model: "kwaivgi/kling-v2.1",
    input: {
      prompt: klingVideoPrompt(style, roomType),
      start_image: originalUrl,
      end_image: stagedUrl,
      mode: "pro",
      duration: 5,
      negative_prompt: KLING_NEGATIVE_PROMPT,
    },
  });
  return prediction.id;
}

export async function getPredictionStatus(id: string): Promise<PredictionStatus> {
  const prediction = await getClient().predictions.get(id);
  const output = prediction.output as string | string[] | null;
  return {
    id: prediction.id,
    status: prediction.status as PredictionStatus["status"],
    output,
    error: prediction.error ? String(prediction.error) : undefined,
  };
}

export function extractOutputUrl(output: string | string[] | null): string | null {
  if (!output) return null;
  if (Array.isArray(output)) return output[0] || null;
  return output;
}
