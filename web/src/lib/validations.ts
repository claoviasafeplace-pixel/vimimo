import { z } from "zod";

// --- Project creation ---
export const createProjectSchema = z.object({
  photos: z
    .array(
      z.object({
        id: z.string().min(1),
        originalUrl: z.string().url(),
      })
    )
    .min(1, "Au moins une photo requise")
    .max(30, "Maximum 30 photos"),
  style: z.enum([
    "scandinavian",
    "industrial",
    "modern_minimalist",
    "classic_french",
    "bohemian",
  ]),
  mode: z.enum(["staging_piece", "video_visite"]).optional(),
  propertyInfo: z
    .object({
      title: z.string().min(1).max(200),
      city: z.string().max(100).optional(),
      neighborhood: z.string().max(100).optional(),
      price: z.string().max(50).optional(),
      surface: z.string().max(50).optional(),
      rooms: z.string().max(50).optional(),
      highlights: z.array(z.string().max(200)).max(10).optional(),
      agencyName: z.string().max(200).optional(),
      agencyLogoUrl: z.string().url().optional().or(z.literal("")),
    })
    .optional(),
  music: z
    .enum(["none", "elegant", "energetic", "minimal", "dramatic", "custom"])
    .optional(),
});

// --- Room selection ---
export const selectOptionSchema = z.object({
  roomIndex: z.number().int().min(0),
  optionIndex: z.number().int().min(0),
});

// --- Checkout ---
export const checkoutSchema = z
  .object({
    packId: z.string().optional(),
    planId: z.string().optional(),
    billing: z.enum(["monthly", "yearly"]).optional(),
  })
  .refine((data) => data.packId || data.planId, {
    message: "Pack ou plan requis",
  });

// --- Montage ---
export const montageSchema = z.object({
  propertyInfo: z.object({
    title: z.string().min(1, "Le titre du bien est requis").max(200),
    city: z.string().max(100).optional(),
    neighborhood: z.string().max(100).optional(),
    price: z.string().max(50).optional(),
    surface: z.string().max(50).optional(),
    rooms: z.string().max(50).optional(),
    highlights: z.array(z.string().max(200)).max(10).optional(),
    agencyName: z.string().max(200).optional(),
    agencyLogoUrl: z.string().url().optional().or(z.literal("")),
  }),
  music: z.enum(["none", "elegant", "energetic", "minimal", "dramatic", "custom"]),
  customMusicUrl: z.string().url().optional().or(z.literal("")),
  selectedRoomIndices: z.array(z.number().int().min(0)).min(2).optional(),
});

// --- Admin action ---
export const adminActionSchema = z.object({
  action: z.enum(["retry", "force_done", "refund"]),
});

// --- Signed URL upload ---
export const signedUrlSchema = z.object({
  fileName: z
    .string()
    .min(1, "fileName requis")
    .regex(/^[a-zA-Z0-9._\-]+$/, "Caractères non autorisés dans le nom de fichier"),
  contentType: z.string().optional(),
});

// --- Triage confirmation ---
export const triageConfirmSchema = z.object({
  confirmedPhotos: z
    .array(
      z.object({
        photoId: z.string().min(1),
        order: z.number().int().min(0),
        included: z.boolean(),
      })
    )
    .min(1),
});
