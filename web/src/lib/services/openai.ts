import OpenAI from "openai";
import {
  BATCH_VISION_SYSTEM_PROMPT,
  STAGING_PROMPT_SYSTEM,
  LIFESTYLE_SYSTEM_PROMPT,
  TRIAGE_SYSTEM_PROMPT,
  DESCRIPTION_SYSTEM_PROMPT,
  stagingPromptUser,
  lifestylePromptUser,
} from "../prompts";
import type { Project, TriageResult, ProjectMode } from "../types";
import { withRetry, OPENAI_RETRY } from "../retry";
import { withCircuitBreaker, costGuard, trackCost } from "../circuit-breaker";

function isMock(): boolean {
  return process.env.USE_MOCK_AI === "true";
}

const OPENAI_TIMEOUT = 60_000; // 60 seconds

function getClient() {
  return new OpenAI({ timeout: OPENAI_TIMEOUT });
}

interface VisionAnalysis {
  propertyType: string;
  rooms: {
    photoIndex: number;
    roomType: string;
    roomLabel: string;
    dimensions: Record<string, string>;
    existingMaterials: Record<string, string>;
    lighting: Record<string, unknown>;
    cameraAngle: Record<string, string>;
    stagingPriority: string;
    notes: string;
  }[];
  overallNotes: string;
}

export async function analyzePhotos(
  photoUrls: { index: number; url: string }[],
  style: string,
  propertyType = "apartment",
  projectId?: string,
): Promise<VisionAnalysis> {
  if (isMock()) {
    console.log(`[MOCK_AI] analyzePhotos → ${photoUrls.length} rooms (skipped GPT-4o Vision)`);
    const ROOM_TYPES = ["living_room", "bedroom", "kitchen", "bathroom", "office"];
    const ROOM_LABELS = ["Salon", "Chambre", "Cuisine", "Salle de bain", "Bureau"];
    return {
      propertyType: propertyType || "apartment",
      rooms: photoUrls.map((p, i) => ({
        photoIndex: p.index,
        roomType: ROOM_TYPES[i % ROOM_TYPES.length],
        roomLabel: ROOM_LABELS[i % ROOM_LABELS.length],
        dimensions: { width: "4m", length: "5m", height: "2.5m" },
        existingMaterials: { floor: "parquet chêne", walls: "peinture blanche" },
        lighting: { natural: "good", orientation: "sud" },
        cameraAngle: { type: "wide", perspective: "corner" },
        stagingPriority: "high",
        notes: `Mock analysis for photo ${p.index} — ${style} style`,
      })),
      overallNotes: `Mock analysis: ${photoUrls.length} rooms, ${style} style, ${propertyType}`,
    };
  }
  if (projectId) await costGuard(projectId, "gpt-4o-vision");

  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: `Analyse ces ${photoUrls.length} photos de pièces pour un virtual staging. Style : ${style}. Type de bien : ${propertyType}.`,
    },
  ];

  for (const p of photoUrls) {
    content.push({ type: "text", text: `Photo ${p.index} :` });
    content.push({ type: "image_url", image_url: { url: p.url } });
  }

  const result = await withCircuitBreaker("openai", () =>
    withRetry(async () => {
      const response = await getClient().chat.completions.create({
        model: "gpt-4o",
        temperature: 0.3,
        max_tokens: 4000,
        messages: [
          { role: "system", content: BATCH_VISION_SYSTEM_PROMPT },
          { role: "user", content },
        ],
      });

      let raw = response.choices[0].message.content?.trim() || "";
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      return JSON.parse(raw);
    }, OPENAI_RETRY),
  );

  if (projectId) await trackCost(projectId, "gpt-4o-vision");
  return result;
}

export async function triagePhotos(
  photoUrls: { index: number; url: string }[],
  style: string,
  projectId?: string,
): Promise<TriageResult> {
  if (isMock()) {
    console.log(`[MOCK_AI] triagePhotos → ${photoUrls.length} photos (skipped GPT-4o Vision)`);
    const ROOM_TYPES = ["living_room", "bedroom", "kitchen", "bathroom", "office"];
    const ROOM_LABELS = ["Salon", "Chambre", "Cuisine", "Salle de bain", "Bureau"];
    return {
      propertyType: "apartment",
      photos: photoUrls.map((p, i) => ({
        photoId: `photo-${p.index}`,
        photoIndex: p.index,
        roomType: ROOM_TYPES[i % ROOM_TYPES.length],
        roomLabel: ROOM_LABELS[i % ROOM_LABELS.length],
        included: true,
        quality: "good" as const,
        order: i + 1,
      })),
      suggestedOrder: photoUrls.map((_, i) => i + 1),
      overallNotes: `Mock triage: all ${photoUrls.length} photos included, ${style} style`,
    };
  }
  if (projectId) await costGuard(projectId, "gpt-4o-vision");

  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: `Analyse ces ${photoUrls.length} photos d'un bien immobilier pour créer une visite virtuelle. Style souhaité : ${style}.`,
    },
  ];

  for (const p of photoUrls) {
    content.push({ type: "text", text: `Photo ${p.index} :` });
    content.push({ type: "image_url", image_url: { url: p.url, detail: "low" } });
  }

  const result = await withCircuitBreaker("openai", () =>
    withRetry(async () => {
      const response = await getClient().chat.completions.create({
        model: "gpt-4o",
        temperature: 0.3,
        max_tokens: 4000,
        messages: [
          { role: "system", content: TRIAGE_SYSTEM_PROMPT },
          { role: "user", content },
        ],
      });

      let raw = response.choices[0].message.content?.trim() || "";
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      return JSON.parse(raw);
    }, OPENAI_RETRY),
  );

  if (projectId) await trackCost(projectId, "gpt-4o-vision");
  return result;
}

interface StagingPrompts {
  analysis: string;
  prompts: string[];
}

export async function generateStagingPrompts(
  photoUrl: string,
  roomType: string,
  roomLabel: string,
  style: string,
  styleLabel: string,
  visionData: Record<string, unknown>,
  projectId?: string,
  mode?: ProjectMode,
): Promise<StagingPrompts> {
  const isLifestyle = mode === "social_reel";

  if (isMock()) {
    const label = isLifestyle ? "lifestyle" : "staging";
    console.log(`[MOCK_AI] generateStagingPrompts (${label}) → 5 prompts for ${roomLabel} (skipped GPT-4o)`);
    return {
      analysis: `Mock analysis: ${roomLabel} (${roomType}), ${styleLabel} style. Mode: ${label}.`,
      prompts: Array.from({ length: 5 }, (_, i) =>
        isLifestyle
          ? `Edit this exact photo. Add premium ${styleLabel} furniture and a person (variation ${i + 1}) naturally using this ${roomLabel}. Cinematic lighting, 8K photorealistic.`
          : `Transform this ${roomType} into a ${styleLabel} space — variation ${i + 1}: add furniture, decor, and lighting appropriate for a ${roomLabel}.`,
      ),
    };
  }

  const systemPrompt = isLifestyle ? LIFESTYLE_SYSTEM_PROMPT : STAGING_PROMPT_SYSTEM;
  const userText = isLifestyle
    ? lifestylePromptUser(roomType, roomLabel, style, styleLabel, visionData)
    : stagingPromptUser(roomType, roomLabel, style, styleLabel, visionData);

  if (isLifestyle) {
    console.log(`[LIFESTYLE] Generating lifestyle prompts for ${roomLabel} (${roomType})`);
  }

  if (projectId) await costGuard(projectId, "gpt-4o-vision");

  const result = await withCircuitBreaker("openai", () =>
    withRetry(async () => {
      const response = await getClient().chat.completions.create({
        model: "gpt-4o",
        temperature: isLifestyle ? 0.8 : 0.5,
        max_tokens: isLifestyle ? 3000 : 2000,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: photoUrl } },
            ],
          },
        ],
      });

      let raw = response.choices[0].message.content?.trim() || "";
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      return JSON.parse(raw);
    }, OPENAI_RETRY),
  );

  if (projectId) await trackCost(projectId, "gpt-4o-vision");
  return result;
}

export interface DescriptionResult {
  instagram: string;
  tiktok: string;
}

export async function generateDescription(
  project: Project,
): Promise<DescriptionResult> {
  if (isMock()) {
    console.log(`[MOCK_AI] generateDescription → mock descriptions (skipped GPT-4o)`);
    return {
      instagram: `✨ Transformation incroyable de ce ${project.styleLabel || "modern"} ! Avant/Après qui donne des frissons 🏠\n\n#VirtualStaging #ImmobilierIA #HomeStaging #VIMIMO`,
      tiktok: `POV: L'IA transforme un appart vide en ${project.styleLabel || "modern"} de rêve 🤯✨ #staging #ia #immobilier #renovation #beforeafter`,
    };
  }
  const projectId = project.id;
  await costGuard(projectId, "gpt-4o-text");

  const roomList = project.rooms
    .map((r) => `${r.roomLabel} (${r.roomType})`)
    .join(", ");

  const propertyInfo = project.propertyInfo;
  const propertyDetails = propertyInfo
    ? [
        propertyInfo.title,
        propertyInfo.city,
        propertyInfo.surface,
        propertyInfo.rooms ? `${propertyInfo.rooms} pièces` : null,
        propertyInfo.price,
      ]
        .filter(Boolean)
        .join(" — ")
    : "";

  const userPrompt = `Projet de staging virtuel :
- Style : ${project.styleLabel} (${project.style})
- Pièces traitées : ${roomList}
- Mode : ${project.mode || "staging_piece"}
${propertyDetails ? `- Bien : ${propertyDetails}` : ""}

Génère les descriptions Instagram et TikTok.`;

  const result = await withCircuitBreaker("openai", () =>
    withRetry(async () => {
      const response = await getClient().chat.completions.create({
        model: "gpt-4o",
        temperature: 0.7,
        max_tokens: 1000,
        messages: [
          { role: "system", content: DESCRIPTION_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      });

      let raw = response.choices[0].message.content?.trim() || "";
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      return JSON.parse(raw);
    }, OPENAI_RETRY),
  );

  await trackCost(projectId, "gpt-4o-text");
  return result;
}
