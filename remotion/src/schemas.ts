import { z } from "zod";

// ─── V2 Schemas ─────────────────────────────────────────────────────

export const roomSchema = z.object({
  beforePhotoUrl: z.string().url().optional(),
  originalPhotoUrl: z.string().url(),
  stagedPhotoUrl: z.string().url(),
  videoUrl: z.string().url(),
  roomType: z.string(),
  roomLabel: z.string(),
});

export const propertyConfigSchema = z.object({
  title: z.string().default("Visite Virtuelle"),
  address: z.string().optional(),
  price: z.string().optional(),
  style: z.string().default("modern"),
});

export const watermarkSchema = z.object({
  type: z.enum(["vimimo", "custom", "none"]).default("vimimo"),
  agencyLogoUrl: z.string().url().optional(),
});

export const propertyShowcaseSchema = z.object({
  property: propertyConfigSchema.default({}),
  rooms: z.array(roomSchema).min(1).max(30),
  musicUrl: z.string().url().optional(),
  watermark: watermarkSchema.default({}),
});

export type Room = z.infer<typeof roomSchema>;
export type PropertyShowcaseProps = z.infer<typeof propertyShowcaseSchema>;

// ─── Studio Montage Schemas ─────────────────────────────────────────

export const studioPropertyInfoSchema = z.object({
  title: z.string(),
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  price: z.string().optional(),
  surface: z.string().optional(),
  rooms: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  agencyName: z.string().optional(),
  agencyLogoUrl: z.string().url().optional(),
});

export const studioRoomSchema = z.object({
  beforePhotoUrl: z.string().url(),
  stagedPhotoUrl: z.string().url(),
  videoUrl: z.string().url(),
  roomType: z.string(),
  roomLabel: z.string(),
});

export const studioMontageSchema = z.object({
  propertyInfo: studioPropertyInfoSchema,
  rooms: z.array(studioRoomSchema).min(2).max(30),
  musicUrl: z.string().url().optional(),
  watermark: watermarkSchema.default({}),
});

export type StudioPropertyInfo = z.infer<typeof studioPropertyInfoSchema>;
export type StudioRoom = z.infer<typeof studioRoomSchema>;
export type StudioMontageProps = z.infer<typeof studioMontageSchema>;

// ─── Social Montage Schemas (Vertical 1080×1920) ────────────────────

export const socialRoomSchema = z.object({
  beforePhotoUrl: z.string().url(),
  stagedPhotoUrl: z.string().url(),
  videoUrl: z.string().url(),
  roomType: z.string(),
  roomLabel: z.string(),
});

export const socialMontageSchema = z.object({
  hookText: z.string().default("Avant / Après IA ✨"),
  rooms: z.array(socialRoomSchema).min(1).max(30),
  watermark: watermarkSchema.default({}),
  style: z.string().default("modern"),
});

export type SocialRoom = z.infer<typeof socialRoomSchema>;
export type SocialMontageProps = z.infer<typeof socialMontageSchema>;
