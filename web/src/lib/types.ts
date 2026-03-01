export type Style =
  | "scandinavian"
  | "industrial"
  | "modern_minimalist"
  | "classic_french"
  | "bohemian";

export interface StyleOption {
  id: Style;
  label: string;
  description: string;
}

export const STYLES: StyleOption[] = [
  {
    id: "scandinavian",
    label: "Scandinave",
    description: "Bois clair, tons neutres, design épuré",
  },
  {
    id: "industrial",
    label: "Industriel",
    description: "Métal brut, briques, esprit loft",
  },
  {
    id: "modern_minimalist",
    label: "Moderne Minimaliste",
    description: "Lignes pures, couleurs sobres, moins c'est plus",
  },
  {
    id: "classic_french",
    label: "Classique Français",
    description: "Moulures, parquet, élégance parisienne",
  },
  {
    id: "bohemian",
    label: "Bohème",
    description: "Textures riches, couleurs chaudes, végétation",
  },
];

export interface Photo {
  id: string;
  originalUrl: string;
  cleanedUrl?: string;
  cleanPredictionId?: string;
}

export interface RoomOption {
  url: string;
  predictionId: string;
}

export interface Room {
  index: number;
  roomType: string;
  roomLabel: string;
  photoId: string;
  cleanedPhotoUrl: string;
  beforePhotoUrl: string;
  visionData: Record<string, unknown>;
  options: RoomOption[];
  optionPredictionIds?: string[];
  selectedOptionIndex?: number;
  videoUrl?: string;
  videoPredictionId?: string;
  videoError?: string;
}

export type ProjectMode = "staging_piece" | "video_visite" | "social_reel";

// --- Order flow (conciergerie) ---

export type OrderStatus = "pending" | "processing" | "quality_check" | "delivered" | "error";
export type AdminKanbanStatus = "a_traiter" | "en_generation" | "a_valider" | "livre";

export type Ambiance = "jour" | "nuit" | "neige";

export type ProjectPhase =
  | "uploading"
  | "cleaning"
  | "cleaned"
  | "analyzing"
  | "generating_options"
  | "selecting"
  | "generating_videos"
  | "rendering"
  | "rendering_montage"
  | "triaging"
  | "reviewing"
  | "auto_staging"
  | "done"
  | "error";

// --- Triage (Video Visite) ---

export interface TriagePhoto {
  photoId: string;
  photoIndex: number;
  roomType: string;
  roomLabel: string;
  included: boolean;
  reason?: string;
  quality: "good" | "blurry" | "duplicate" | "unusable";
  order: number;
}

export interface TriageResult {
  propertyType: string;
  photos: TriagePhoto[];
  suggestedOrder: number[];
  overallNotes: string;
}

// --- Studio Montage ---

export interface PropertyInfo {
  title: string;
  city?: string;
  neighborhood?: string;
  price?: string;
  surface?: string;
  rooms?: string;
  highlights?: string[];
  agencyName?: string;
  agencyLogoUrl?: string;
}

export type MusicChoice = "none" | "elegant" | "energetic" | "minimal" | "dramatic" | "custom";

export interface MontageConfig {
  propertyInfo: PropertyInfo;
  music: MusicChoice;
  customMusicUrl?: string;
}

export interface ConfirmedPhoto {
  photoId: string;
  order: number;
  included: boolean;
}

export interface Project {
  id: string;
  phase: ProjectPhase;
  createdAt: number;
  style: Style;
  styleLabel: string;
  photos: Photo[];
  rooms: Room[];
  finalVideoUrl?: string;
  remotionRenderId?: string;
  error?: string;
  userId?: string;
  creditsUsed?: number;
  creditsRefunded?: boolean;
  studioMontageUrl?: string;
  studioMontageRenderId?: string;
  montageConfig?: MontageConfig;
  mode?: ProjectMode;
  triageResult?: TriageResult;
  confirmedPhotoOrder?: ConfirmedPhoto[];
  propertyInfo?: PropertyInfo;
  apiCostUsd?: number;
  globalContext?: string;
  // Order flow (conciergerie)
  orderStatus?: OrderStatus;
  kanbanStatus?: AdminKanbanStatus;
  adminSelectedOptions?: Record<number, number>; // roomIndex → optionIndex
  deliveredAt?: number;
  clientEmail?: string;
  ambiance?: Ambiance;
  adminNotes?: string;
}

// --- Auth & Credits ---

export type CreditTransactionType = "purchase" | "deduction" | "refund" | "manual";

export interface CreditTransaction {
  id: string;
  userId: string;
  type: CreditTransactionType;
  amount: number;
  balance: number;
  projectId?: string;
  stripeSessionId?: string;
  description: string;
  createdAt: number;
}

// --- Credit Packs (one-time purchase) ---

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  priceEur: number;
  popular?: boolean;
  tagline: string;
}

// B2C packs (Particuliers)
export const B2C_PACKS: CreditPack[] = [
  {
    id: "b2c_1",
    name: "1 Bien",
    credits: 1,
    priceEur: 39,
    tagline: "Idéal pour un premier test",
  },
  {
    id: "b2c_3",
    name: "3 Biens",
    credits: 3,
    priceEur: 99,
    popular: true,
    tagline: "Le plus demandé",
  },
];

// B2B packs (Professionnels)
export const B2B_PACKS: CreditPack[] = [
  {
    id: "b2b_5",
    name: "5 Biens",
    credits: 5,
    priceEur: 149,
    tagline: "Pour un portefeuille actif",
  },
  {
    id: "b2b_10",
    name: "10 Biens",
    credits: 10,
    priceEur: 249,
    popular: true,
    tagline: "Le choix pro",
  },
  {
    id: "b2b_25",
    name: "25 Biens",
    credits: 25,
    priceEur: 499,
    tagline: "Volume agence",
  },
];

// All packs combined (backwards compat)
export const CREDIT_PACKS: CreditPack[] = [...B2C_PACKS, ...B2B_PACKS];

// --- Subscription Plans (monthly) ---

export interface SubscriptionPlan {
  id: string;
  name: string;
  creditsPerMonth: number;
  priceEur: number;
  priceEurYearly: number;
  features: string[];
  popular?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "starter",
    name: "Starter",
    creditsPerMonth: 3,
    priceEur: 49,
    priceEurYearly: 470,
    features: [
      "3 biens / mois",
      "5 options de staging / pièce",
      "Vidéo visite IA cinématique",
      "Descriptions Insta & TikTok",
      "Filigrane VIMIMO sur la vidéo",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    creditsPerMonth: 5,
    priceEur: 79,
    priceEurYearly: 758,
    popular: true,
    features: [
      "5 biens / mois",
      "5 options de staging / pièce",
      "Vidéo visite IA cinématique",
      "Descriptions Insta & TikTok",
      "Marque blanche (votre logo)",
      "Support prioritaire",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    creditsPerMonth: 10,
    priceEur: 149,
    priceEurYearly: 1430,
    features: [
      "10 biens / mois",
      "5 options de staging / pièce",
      "Vidéo visite IA cinématique",
      "Descriptions Insta & TikTok",
      "Marque blanche (votre logo)",
      "Support prioritaire dédié",
    ],
  },
];
