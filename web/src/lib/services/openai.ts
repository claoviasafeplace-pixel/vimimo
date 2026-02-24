import OpenAI from "openai";
import {
  BATCH_VISION_SYSTEM_PROMPT,
  STAGING_PROMPT_SYSTEM,
  TRIAGE_SYSTEM_PROMPT,
  DESCRIPTION_SYSTEM_PROMPT,
  stagingPromptUser,
} from "../prompts";
import type { Project, TriageResult } from "../types";
import { withRetry, OPENAI_RETRY } from "../retry";

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
  propertyType = "apartment"
): Promise<VisionAnalysis> {
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

  return withRetry(async () => {
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
  }, OPENAI_RETRY);
}

export async function triagePhotos(
  photoUrls: { index: number; url: string }[],
  style: string
): Promise<TriageResult> {
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

  return withRetry(async () => {
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
  }, OPENAI_RETRY);
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
  visionData: Record<string, unknown>
): Promise<StagingPrompts> {
  return withRetry(async () => {
    const response = await getClient().chat.completions.create({
      model: "gpt-4o",
      temperature: 0.5,
      max_tokens: 2000,
      messages: [
        { role: "system", content: STAGING_PROMPT_SYSTEM },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: stagingPromptUser(
                roomType,
                roomLabel,
                style,
                styleLabel,
                visionData
              ),
            },
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
  }, OPENAI_RETRY);
}

export interface DescriptionResult {
  instagram: string;
  tiktok: string;
}

export async function generateDescription(
  project: Project
): Promise<DescriptionResult> {
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

  return withRetry(async () => {
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
  }, OPENAI_RETRY);
}
