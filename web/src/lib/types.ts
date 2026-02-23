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
}

export type ProjectMode = "staging_piece" | "video_visite";

export type ProjectPhase =
  | "uploading"
  | "cleaning"
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
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "essential",
    name: "Essentiel",
    credits: 3,
    priceEur: 24.99,
  },
  {
    id: "standard",
    name: "Standard",
    credits: 10,
    priceEur: 69.99,
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    credits: 25,
    priceEur: 149.99,
  },
];

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
    creditsPerMonth: 5,
    priceEur: 29,
    priceEurYearly: 278,
    features: [
      "5 crédits / mois (= 5 pièces meublées + vidéo)",
      "5 options de staging / pièce",
      "Vidéo IA cinématique",
      "Rendu final compilé",
      "Descriptions Insta & TikTok",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    creditsPerMonth: 15,
    priceEur: 79,
    priceEurYearly: 758,
    popular: true,
    features: [
      "15 crédits / mois (= 15 pièces meublées + vidéo)",
      "5 options de staging / pièce",
      "Vidéo IA cinématique",
      "Rendu final compilé",
      "Descriptions Insta & TikTok",
      "Support prioritaire",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    creditsPerMonth: 50,
    priceEur: 199,
    priceEurYearly: 1910,
    features: [
      "50 crédits / mois (= 50 pièces meublées + vidéo)",
      "5 options de staging / pièce",
      "Vidéo IA cinématique",
      "Rendu final compilé",
      "Descriptions Insta & TikTok",
      "Support prioritaire",
    ],
  },
];
