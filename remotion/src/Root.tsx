import React from "react";
import { Composition } from "remotion";
import { z } from "zod";
import { VirtualStaging } from "./Composition";
import { PropertyShowcase, calculateDuration } from "./PropertyShowcase";
import { propertyShowcaseSchema } from "./schemas";
import type { PropertyShowcaseProps } from "./schemas";

// ─── Zod Schema (contrat n8n → Remotion) ──────────────────────────

const keyframeSchema = z.object({
  url: z.string(),
  step: z.number().int().min(1).max(5),
  label: z.enum([
    "original_clean",
    "surface_renovation",
    "large_furniture",
    "full_furnishing",
    "final_decoration",
  ]),
});

const speedRampSchema = z.object({
  introSpeed: z.number().min(0.1).max(8).default(2.0),
  stagingSpeed: z.number().min(0.1).max(8).default(0.5),
  outroSpeed: z.number().min(0.1).max(8).default(2.0),
  introRatio: z.number().min(0.05).max(0.5).default(0.2),
  stagingRatio: z.number().min(0.2).max(0.8).default(0.6),
  outroRatio: z.number().min(0.05).max(0.5).default(0.2),
});

const transitionsSchema = z.object({
  durationInFrames: z.number().int().min(2).max(60).default(16),
  smoothCutBlur: z.number().min(0).max(12).default(4),
});

const upscalingSchema = z.object({
  enabled: z.boolean().default(true),
  contrast: z.number().min(1).max(1.5).default(1.1),
  saturation: z.number().min(1).max(1.3).default(1.05),
});

export const compositionSchema = z.object({
  originalVideoUrl: z.string(),
  aiVideoUrl: z.string(),
  images: z.array(keyframeSchema).length(5),
  speedRamp: speedRampSchema.default({}),
  transitions: transitionsSchema.default({}),
  upscaling: upscalingSchema.default({}),
});

export type CompositionProps = z.infer<typeof compositionSchema>;

const FPS = 30;
const DURATION_SECONDS = 10;

export const RemotionRoot: React.FC = () => {
  return (
    <>
    <Composition
      id="VirtualStaging"
      component={VirtualStaging}
      durationInFrames={FPS * DURATION_SECONDS}
      fps={FPS}
      width={1920}
      height={1080}
      schema={compositionSchema}
      defaultProps={{
        originalVideoUrl:
          "https://www.w3schools.com/html/mov_bbb.mp4",
        aiVideoUrl:
          "https://www.w3schools.com/html/mov_bbb.mp4",
        images: [
          { url: "https://placehold.co/1920x1080/1a1a2e/e0e0e0?text=1+Original", step: 1, label: "original_clean" as const },
          { url: "https://placehold.co/1920x1080/16213e/e0e0e0?text=2+Renovation", step: 2, label: "surface_renovation" as const },
          { url: "https://placehold.co/1920x1080/0f3460/e0e0e0?text=3+Furniture", step: 3, label: "large_furniture" as const },
          { url: "https://placehold.co/1920x1080/533483/e0e0e0?text=4+Full", step: 4, label: "full_furnishing" as const },
          { url: "https://placehold.co/1920x1080/2b6777/e0e0e0?text=5+Final", step: 5, label: "final_decoration" as const },
        ],
        speedRamp: {
          introSpeed: 2.0,
          stagingSpeed: 0.5,
          outroSpeed: 2.0,
          introRatio: 0.2,
          stagingRatio: 0.6,
          outroRatio: 0.2,
        },
        transitions: {
          durationInFrames: 16,
          smoothCutBlur: 4,
        },
        upscaling: {
          enabled: true,
          contrast: 1.1,
          saturation: 1.05,
        },
      }}
    />
    <Composition
      id="PropertyShowcase"
      component={PropertyShowcase}
      fps={FPS}
      width={1920}
      height={1080}
      durationInFrames={calculateDuration(3)}
      schema={propertyShowcaseSchema}
      calculateMetadata={({ props }) => {
        return {
          durationInFrames: calculateDuration(props.rooms.length),
        };
      }}
      defaultProps={{
        property: {
          title: "Visite Virtuelle",
          address: "12 Rue de la Paix, Paris",
          style: "modern",
        },
        rooms: [
          {
            beforePhotoUrl: "https://placehold.co/1920x1080/5a3a3a/ffffff?text=Salon+-+AVANT",
            originalPhotoUrl: "https://placehold.co/1920x1080/4a4a4a/ffffff?text=Salon+-+Photo+Vide",
            stagedPhotoUrl: "https://placehold.co/1920x1080/2d5a3d/ffffff?text=Salon+-+Stag%C3%A9",
            videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
            roomType: "living_room",
            roomLabel: "Salon",
          },
          {
            beforePhotoUrl: "https://placehold.co/1920x1080/5a3a3a/ffffff?text=Chambre+-+AVANT",
            originalPhotoUrl: "https://placehold.co/1920x1080/4a4a4a/ffffff?text=Chambre+-+Photo+Vide",
            stagedPhotoUrl: "https://placehold.co/1920x1080/3d2d5a/ffffff?text=Chambre+-+Stag%C3%A9e",
            videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
            roomType: "bedroom",
            roomLabel: "Chambre 1",
          },
          {
            beforePhotoUrl: "https://placehold.co/1920x1080/5a3a3a/ffffff?text=Cuisine+-+AVANT",
            originalPhotoUrl: "https://placehold.co/1920x1080/4a4a4a/ffffff?text=Cuisine+-+Photo+Vide",
            stagedPhotoUrl: "https://placehold.co/1920x1080/5a3d2d/ffffff?text=Cuisine+-+Stag%C3%A9e",
            videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
            roomType: "kitchen",
            roomLabel: "Cuisine",
          },
        ],
      }}
    />
    </>
  );
};
