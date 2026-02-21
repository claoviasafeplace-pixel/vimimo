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

export const propertyShowcaseSchema = z.object({
  property: propertyConfigSchema.default({}),
  rooms: z.array(roomSchema).min(1).max(20),
});

export type Room = z.infer<typeof roomSchema>;
export type PropertyShowcaseProps = z.infer<typeof propertyShowcaseSchema>;
