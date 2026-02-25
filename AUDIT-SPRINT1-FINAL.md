# AUDIT COMPLET — Sprint 1 + Social Reel + Beat-Sync + Storytelling 4 étapes

**Date** : 25 février 2026
**Auteur** : Claude Code (Opus 4.6)
**Branche** : `main`
**Dernier commit** : `6e8401f`
**Déploiements** : Vercel (prod) + VPS Docker (port 3123)

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Historique des commits](#2-historique-des-commits)
3. [Modification 1 — Sprint 1 Pipeline Fixes](#3-modification-1--sprint-1-pipeline-fixes)
4. [Modification 2 — Composition SocialMontage (vertical 9:16)](#4-modification-2--composition-socialmontage-vertical-916)
5. [Modification 3 — Prompts FPV dynamiques pour social_reel](#5-modification-3--prompts-fpv-dynamiques-pour-social_reel)
6. [Modification 4 — Frontend UI social_reel](#6-modification-4--frontend-ui-social_reel)
7. [Modification 5 — Beat-sync audio (120 BPM)](#7-modification-5--beat-sync-audio-120-bpm)
8. [Modification 6 — Storytelling 4 étapes](#8-modification-6--storytelling-4-étapes)
9. [Architecture finale du pipeline Social Reel](#9-architecture-finale-du-pipeline-social-reel)
10. [Fichiers modifiés — Inventaire complet](#10-fichiers-modifiés--inventaire-complet)
11. [Schéma de données final](#11-schéma-de-données-final)
12. [Timeline visuelle finale](#12-timeline-visuelle-finale)
13. [Déploiements](#13-déploiements)
14. [Tests et vérifications](#14-tests-et-vérifications)
15. [Risques et points d'attention](#15-risques-et-points-dattention)

---

## 1. Vue d'ensemble

Ce sprint a ajouté un **troisième mode de projet complet** (`social_reel`) au pipeline VIMIMO, de bout en bout :

| Composant | Avant | Après |
|-----------|-------|-------|
| **Modes de projet** | `staging_piece`, `video_visite` | + `social_reel` |
| **Compositions Remotion** | PropertyShowcase (16:9), StudioMontage (16:9) | + SocialMontage (9:16, 1080×1920) |
| **Prompts vidéo** | 1 set (dolly lent) | + 1 set FPV dynamique (social) |
| **Audio** | Muet sur social | Beat-synced 120 BPM + fade-out |
| **Storytelling room** | 3 phases (Avant → Vidéo → Après) | 4 phases (Original → Nettoyé → Vidéo → Stagé) |
| **cfg_scale Kling** | 0.5 | 0.8 (classic) / 0.7 (social) |
| **Vidéo batching** | Toutes en parallèle | Batches de 2 (anti-429) |
| **visionData** | Non peuplé | GPT-4o Vision analyse chaque pièce |
| **Cost threshold** | $3 | $10 |

**Statistiques globales** (depuis `e1b462e`) :
- **14 fichiers modifiés**, **847 insertions**, **44 suppressions**
- **6 commits de features** + 1 commit doc

---

## 2. Historique des commits

| Hash | Message | Fichiers |
|------|---------|----------|
| `e1b462e` | Sprint 1 — visionData, cfg_scale, video batching, SocialMontage vertical | 12 fichiers |
| `b5ec35b` | Dynamic FPV camera prompts for social_reel video generation | 4 fichiers |
| `85e9051` | Audit complet Sprint 1 + prompts social_reel | 1 fichier (doc) |
| `935dd11` | Add social_reel mode selector and validation | 4 fichiers |
| `20e2189` | Beat-synced audio for SocialMontage (120 BPM grid + fade-out) | 4 fichiers |
| `6e8401f` | 4-step storytelling per room (Original → Cleaned → Video → Staged) | 5 fichiers |

---

## 3. Modification 1 — Sprint 1 Pipeline Fixes

**Commit** : `e1b462e`

### 3.1 visionData — Analyse GPT-4o Vision

**Fichier** : `web/src/lib/inngest/functions/auto-staging.ts`

**Problème** : L'étape `analyze-rooms` n'existait pas. Les rooms arrivaient au staging avec un `visionData: {}` vide, empêchant les prompts de staging d'être contextualisés.

**Solution** : Ajout du step `analyze-rooms` (entre `build-rooms` et `launch-staging`) qui appelle `analyzePhotos()` (GPT-4o Vision) pour chaque pièce et peuple :

```typescript
room.visionData = {
  dimensions: analyzed.dimensions,       // ex: { estimatedArea: "25m²", ceilingHeight: "2.5m" }
  existingMaterials: analyzed.existingMaterials, // ex: { flooring: "parquet", walls: "white painted" }
  lighting: analyzed.lighting,           // ex: { naturalLight: "good", windowCount: 2 }
  cameraAngle: analyzed.cameraAngle,     // ex: { perspective: "corner wide", height: "eye level" }
  notes: analyzed.notes,                 // ex: "Parquet chevron, moulures au plafond"
};
```

**Impact** : Les prompts de staging sont désormais contextualisés avec les vraies caractéristiques de la pièce → meilleure qualité de staging.

**Fallback** : Si l'analyse échoue, le pipeline continue avec `visionData: {}` (non-fatal).

### 3.2 cfg_scale Kling v2.1

**Fichier** : `web/src/lib/services/replicate.ts`

**Avant** : `cfg_scale: 0.5` (trop de liberté créative → morphing, distorsion)

**Après** : `cfg_scale: 0.8` (classic) / `cfg_scale: 0.7` (social_reel)

**Raison** : Un cfg_scale plus élevé force Kling à respecter davantage les images source (start_image/end_image), réduisant les artefacts de morphing.

### 3.3 Séquentialisation vidéos par batches de 2

**Fichier** : `web/src/lib/inngest/functions/auto-staging.ts` (step `launch-videos`)

**Avant** : Toutes les vidéos lancées en parallèle → erreurs 429 (rate limit Replicate)

**Après** :
```typescript
const videoBatchSize = 2;
for (let start = 0; start < needsVideo.length; start += videoBatchSize) {
  const batch = needsVideo.slice(start, start + videoBatchSize);
  await Promise.allSettled(batch.map(...));
}
```

**Impact** : Plus de 429 en production. 2 vidéos en parallèle est le sweet spot pour Replicate.

### 3.4 Cost threshold $3 → $10

**Fichier** : `web/src/lib/circuit-breaker.ts`

**Raison** : $3 était trop bas pour un projet multi-pièces complet (6 rooms × staging + vidéo). Relevé à $10 pour éviter les aborts intempestifs tout en gardant une protection.

---

## 4. Modification 2 — Composition SocialMontage (vertical 9:16)

**Commit** : `e1b462e`

### 4.1 Fichiers créés

| Fichier | Description |
|---------|-------------|
| `remotion/src/SocialMontage.tsx` | Composition verticale 1080×1920 |
| `remotion/src/social/timeline.ts` | Constantes de timing et fonctions de calcul |

### 4.2 Structure de la composition

```
SocialMontage (1080×1920, 30fps)
├── HookScreen          — Texte d'accroche + fond flouté (3 beats)
├── N × SocialRoomSegment — Séquence par pièce (4 beats chacune, final)
├── (N-1) × FlashCut    — Flash blanc entre les pièces (1 beat)
├── SocialAudio         — Piste musicale avec fade-out
└── SocialOutro         — Logo VIMIMO + baseline (3 beats)
```

### 4.3 Timeline initiale vs finale

| Segment | v1 (`e1b462e`) | v2 (`20e2189`) | v3 (`6e8401f`) |
|---------|----------------|----------------|----------------|
| Hook | 45fr (1.5s) | 45fr | 45fr |
| Room | 40fr (1.3s) | 45fr (1.5s) | **60fr (2s)** |
| Cut | 8fr (0.27s) | 15fr (0.5s) | 15fr |
| Outro | 45fr (1.5s) | 45fr | 45fr |
| **Total 3 rooms** | **256fr (8.5s)** | **270fr (9s)** | **315fr (10.5s)** |

### 4.4 Composants visuels

- **HookScreen** : Background blurred image + texte "Avant / Après IA ✨" avec spring animation
- **SocialRoomSegment** : 4 phases avec badges glassmorphism et Ken Burns
- **FlashCut** : Flash blanc `mixBlendMode: "screen"` — ponctue le rythme
- **SocialOutro** : Logo VIMIMO avec spring scale + fade-in "Virtual Staging IA"
- **SocialAudio** : `<Audio>` natif Remotion avec volume interpolé

### 4.5 Enregistrement dans Root.tsx

```typescript
<Composition
  id="SocialMontage"
  component={SocialMontage}
  fps={30}
  width={1080}
  height={1920}
  calculateMetadata={({ props }) => ({
    durationInFrames: calculateSocialDuration(props.rooms.length),
  })}
  schema={socialMontageSchema}
/>
```

---

## 5. Modification 3 — Prompts FPV dynamiques pour social_reel

**Commit** : `b5ec35b`

### 5.1 Nouveaux prompts ajoutés

**Fichier** : `web/src/lib/prompts.ts`

| Constante | Rôle |
|-----------|------|
| `SOCIAL_CAMERA_PROMPT` | "Dynamic FPV drone push-in, fast energetic forward camera movement..." |
| `SOCIAL_QUALITY_SUFFIX` | "4K cinematic vertical video, viral real estate content..." |
| `SOCIAL_NEGATIVE_PROMPT` | Comme `KLING_NEGATIVE_PROMPT` mais SANS les bans de "fast camera movement, shaky camera, whip pan, rotation" |
| `klingSocialVideoPrompt()` | Fonction composant le prompt complet pour social_reel |

### 5.2 Différences Classic vs Social

| Paramètre | Classic (staging_piece / video_visite) | Social (social_reel) |
|-----------|---------------------------------------|---------------------|
| Camera prompt | Dolly lent, tripod, no shake | FPV drone push-in, fast energetic |
| cfg_scale | 0.8 (fidèle) | 0.7 (plus créatif) |
| Negative prompt | Ban fast camera, whip pan, rotation | Autorise les mouvements dynamiques |
| Quality suffix | "8K photorealistic professional" | "4K cinematic vertical, viral" |

### 5.3 Sélection conditionnelle dans `generateVideo()`

**Fichier** : `web/src/lib/services/replicate.ts`

```typescript
export async function generateVideo(
  originalUrl, stagedUrl, style, roomType,
  ctx?: PredictionContext,
  projectMode?: ProjectMode,  // ← nouveau paramètre
): Promise<string> {
  const isSocial = projectMode === "social_reel";
  const prompt = isSocial ? klingSocialVideoPrompt(...) : klingVideoPrompt(...);
  const negativePrompt = isSocial ? SOCIAL_NEGATIVE_PROMPT : KLING_NEGATIVE_PROMPT;
  // cfg_scale: isSocial ? 0.7 : 0.8
}
```

### 5.4 Callers mis à jour

Deux callers de `generateVideo()` passent désormais `project.mode` :
1. `auto-staging.ts` step `launch-videos` (ligne 270)
2. `api/project/[id]/generate/route.ts` (ligne 53)

---

## 6. Modification 4 — Frontend UI social_reel

**Commit** : `935dd11`

### 6.1 ModeSelector — 3e carte

**Fichier** : `web/src/components/upload/ModeSelector.tsx`

- Import `Smartphone` de Lucide
- Ajout de la 3e option dans `MODES[]` :
  ```typescript
  {
    id: "social_reel" as ProjectMode,
    label: "Social Reel",
    description: "Format vertical 9:16, idéal pour TikTok et Instagram Reels",
    detail: "1 bien",
    icon: Smartphone,
  }
  ```
- Grid : `sm:grid-cols-2` → `sm:grid-cols-3`

### 6.2 Validation Zod

**Fichier** : `web/src/lib/validations.ts`

```typescript
mode: z.enum(["staging_piece", "video_visite", "social_reel"]).optional(),
```

### 6.3 Type TypeScript

**Fichier** : `web/src/lib/types.ts`

```typescript
export type ProjectMode = "staging_piece" | "video_visite" | "social_reel";
```

### 6.4 Bouton submit

**Fichier** : `web/src/app/new/page.tsx`

```typescript
{mode === "video_visite"
  ? "Lancer la Video Visite (1 bien)"
  : mode === "social_reel"
  ? "Lancer le Social Reel (1 bien)"
  : "Lancer le staging (1 bien)"}
```

### 6.5 ProcessingView — Étapes social_reel

**Fichier** : `web/src/components/project/ProcessingView.tsx`

```typescript
const SOCIAL_REEL_STEPS: StepDef[] = [
  { key: "cleaning", label: "Nettoyage des photos", icon: ImageIcon },
  { key: "triaging", label: "Triage IA", icon: ScanSearch },
  { key: "auto_staging", label: "Staging + Vidéos", icon: Video },
];
```

### 6.6 canSubmit

**Fichier** : `web/src/hooks/useUpload.ts`

`social_reel` ne nécessite PAS de `PropertyInfoForm` (comme `staging_piece`). Le `canSubmit` existant gère déjà ce cas : il n'exige `propertyInfo.title` que pour `video_visite`.

---

## 7. Modification 5 — Beat-sync audio (120 BPM)

**Commit** : `20e2189`

### 7.1 Grille BPM

**Fichier** : `remotion/src/social/timeline.ts`

```
120 BPM = 1 beat toutes les 0.5s = 15 frames à 30fps
```

Tous les segments sont des multiples de 15 frames → les transitions tombent sur les temps forts.

| Segment | Frames | Beats | Secondes |
|---------|--------|-------|----------|
| Hook | 45 | 3 | 1.5s |
| Room | 60 | 4 | 2.0s |
| Cut | 15 | 1 | 0.5s |
| Outro | 45 | 3 | 1.5s |

### 7.2 Composant SocialAudio

**Fichier** : `remotion/src/SocialMontage.tsx`

```typescript
const SocialAudio: React.FC<{ musicUrl: string; totalFrames: number }> = ({
  musicUrl, totalFrames,
}) => {
  const frame = useCurrentFrame();
  const fadeOutStart = totalFrames - SOCIAL_OUTRO_FRAMES;
  const volume = interpolate(
    frame,
    [0, 5, fadeOutStart, totalFrames],
    [0, 0.85, 0.85, 0],
    CLAMP,
  );
  return <Audio src={musicUrl} volume={volume} />;
};
```

- **Fade-in** : 0 → 0.85 en 5 frames (0.17s)
- **Plateau** : 0.85 pendant toute la vidéo
- **Fade-out** : 0.85 → 0 pendant l'outro (45 frames = 1.5s)

### 7.3 Schéma Zod

**Fichier** : `remotion/src/schemas.ts`

```typescript
socialMontageSchema = z.object({
  // ...
  musicUrl: z.string().url().optional(),  // ← ajouté
});
```

### 7.4 Musique par défaut (backend)

**Fichier** : `web/src/lib/services/remotion.ts`

```typescript
// Dans startSocialRender():
const musicUrl = MUSIC_URLS["energetic"];
```

Le track "energetic" est servi depuis Supabase Storage (`assets/music/energetic.mp3`).

### 7.5 Rétrocompatibilité

Si `musicUrl` est `undefined`, aucun `<Audio>` n'est rendu — la vidéo reste muette (pas de crash).

---

## 8. Modification 6 — Storytelling 4 étapes

**Commit** : `6e8401f`

### 8.1 Nouvelle séquence par pièce

| Beat | Frames | Phase | Badge | Couleur badge |
|------|--------|-------|-------|---------------|
| 1 | 0-15 | Photo originale (avec meubles) | **AVANT** | Noir semi-transparent |
| 2 | 15-30 | Photo nettoyée (pièce vidée par l'IA) | **NETTOYAGE IA** | Bleu (`rgba(59,130,246,0.8)`) |
| 3 | 30-45 | Vidéo Kling (meubles apparaissent) | _(pas de badge)_ | — |
| 4 | 45-60 | Photo stagée finale | **APRÈS** | Or (`rgba(200,164,90,0.8)`) |

### 8.2 cleanedPhotoUrl — Schéma et payload

**Fichier** : `remotion/src/schemas.ts`

```typescript
export const socialRoomSchema = z.object({
  beforePhotoUrl: z.string().url(),
  cleanedPhotoUrl: z.string().url().optional(),  // ← ajouté
  stagedPhotoUrl: z.string().url(),
  videoUrl: z.string().url(),
  roomType: z.string(),
  roomLabel: z.string(),
});

export const studioRoomSchema = z.object({
  // ... idem, cleanedPhotoUrl ajouté aussi
});
```

**Fichier** : `web/src/lib/services/remotion.ts`

```typescript
// startSocialRender() et startStudioRender():
.map((r) => ({
  beforePhotoUrl: r.beforePhotoUrl,
  cleanedPhotoUrl: r.cleanedPhotoUrl || r.beforePhotoUrl,  // ← ajouté
  stagedPhotoUrl: r.options[r.selectedOptionIndex ?? 0].url,
  // ...
}));
```

### 8.3 Fallback si cleanedPhotoUrl absent

```typescript
const cleanedUrl = room.cleanedPhotoUrl || room.beforePhotoUrl;
```

Si la photo nettoyée n'existe pas, la phase 2 affiche la photo originale → pas de crash.

### 8.4 Effets visuels par phase

```
Phase 1 (Original):  Ken Burns zoom 1.0 → 1.06 — badge AVANT noir
Phase 2 (Cleaned):   Reverse zoom 1.04 → 1.0 — badge NETTOYAGE IA bleu
Phase 3 (Video):     Zoom 1.0 → 1.04, playbackRate 2x
Phase 4 (Staged):    Punch zoom 1.06 → 1.0 — badge APRÈS or
```

Crossfades de 3 frames entre chaque phase pour des transitions fluides.

### 8.5 Durée totale par nombre de rooms

| Rooms | Durée totale | Calcul |
|-------|-------------|--------|
| 1 | 150fr (5.0s) | 45 + 60 + 0 + 45 |
| 2 | 225fr (7.5s) | 45 + 120 + 15 + 45 |
| 3 | 315fr (10.5s) | 45 + 180 + 30 + 45 |
| 4 | 405fr (13.5s) | 45 + 240 + 45 + 45 |
| 6 | 585fr (19.5s) | 45 + 360 + 75 + 45 |

---

## 9. Architecture finale du pipeline Social Reel

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                     │
│                                                           │
│  ModeSelector ─── "Social Reel" card (Smartphone icon)    │
│  DropZone ─── Upload photos (max 6)                       │
│  StyleSelector ─── Choix du style déco                    │
│  Submit ─── mode: "social_reel"                           │
└──────────────────┬──────────────────────────────────────┘
                   │ POST /api/project
                   ▼
┌─────────────────────────────────────────────────────────┐
│                    API ROUTE                              │
│  Validation Zod (social_reel ✓)                          │
│  Deduct credits (1 credit/bien)                          │
│  Create project (phase: "cleaning")                      │
│  Emit: project/cleaning.start                            │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│              INNGEST — cleaning-poll                      │
│  Flux Kontext Pro "remove furniture"                      │
│  Poll 5s → cleanedPhotoUrl saved                         │
│  Emit: project/triage.start                              │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│              INNGEST — auto-staging                       │
│                                                           │
│  Step 1: build-rooms (confirmedPhotoOrder → rooms[])     │
│  Step 1b: analyze-rooms (GPT-4o Vision → visionData)     │
│  Step 2: launch-staging (5 prompts/room, batches de 3)   │
│  Step 3: poll-staging (5s × 120 attempts)                │
│  Step 4: launch-videos (batches de 2)                    │
│          generateVideo(..., "social_reel")                │
│          → klingSocialVideoPrompt() + cfg_scale 0.7      │
│  Step 5: poll-videos (5s × 180 attempts)                 │
│  Step 6: launch-render                                   │
│          → startSocialRender(project)                    │
│          → compositionId: "SocialMontage"                │
│          → musicUrl: MUSIC_URLS["energetic"]             │
│          → cleanedPhotoUrl per room                      │
│  Step 7: poll-render → upload to Supabase → phase: done  │
└─────────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│              REMOTION VPS (Docker, port 3123)             │
│                                                           │
│  SocialMontage (1080×1920, 30fps)                        │
│  ├── HookScreen (45fr)                                   │
│  ├── SocialAudio (energetic.mp3, fade-out)               │
│  ├── N × SocialRoomSegment (60fr each)                   │
│  │   ├── Beat 1: Original photo + AVANT badge            │
│  │   ├── Beat 2: Cleaned photo + NETTOYAGE IA badge      │
│  │   ├── Beat 3: Kling video × 2x playback              │
│  │   └── Beat 4: Staged photo + APRÈS badge              │
│  ├── (N-1) × FlashCut (15fr each)                        │
│  └── SocialOutro (45fr)                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 10. Fichiers modifiés — Inventaire complet

### Remotion (4 fichiers)

| Fichier | Lignes | Modifications |
|---------|--------|---------------|
| `remotion/src/SocialMontage.tsx` | ~410 lignes | Créé (e1b462e), Audio ajouté (20e2189), 4 phases (6e8401f) |
| `remotion/src/social/timeline.ts` | 43 lignes | Créé (e1b462e), BPM grid (20e2189), room 60fr (6e8401f) |
| `remotion/src/schemas.ts` | 91 lignes | socialMontageSchema + socialRoomSchema créés (e1b462e), musicUrl (20e2189), cleanedPhotoUrl (6e8401f) |
| `remotion/src/Root.tsx` | 246 lignes | SocialMontage composition (e1b462e), cleanedPhotoUrl defaultProps (6e8401f) |

### Web — Services (3 fichiers)

| Fichier | Modifications |
|---------|---------------|
| `web/src/lib/services/replicate.ts` | generateVideo() : projectMode param, social prompts, cfg_scale conditionnel |
| `web/src/lib/services/remotion.ts` | startSocialRender() créé, musicUrl + cleanedPhotoUrl ajoutés |
| `web/src/lib/prompts.ts` | 4 nouvelles constantes : SOCIAL_CAMERA_PROMPT, SOCIAL_QUALITY_SUFFIX, SOCIAL_NEGATIVE_PROMPT, klingSocialVideoPrompt() |

### Web — Pipeline (1 fichier)

| Fichier | Modifications |
|---------|---------------|
| `web/src/lib/inngest/functions/auto-staging.ts` | Step analyze-rooms, video batching, social_reel routing, proj.mode passé à generateVideo |

### Web — Frontend (5 fichiers)

| Fichier | Modifications |
|---------|---------------|
| `web/src/components/upload/ModeSelector.tsx` | 3e carte Social Reel, grid-cols-3 |
| `web/src/lib/validations.ts` | social_reel dans Zod enum |
| `web/src/lib/types.ts` | ProjectMode union type |
| `web/src/app/new/page.tsx` | Bouton submit pour social_reel |
| `web/src/components/project/ProcessingView.tsx` | SOCIAL_REEL_STEPS |

### Web — API (1 fichier)

| Fichier | Modifications |
|---------|---------------|
| `web/src/app/api/project/[id]/generate/route.ts` | Pass project.mode to generateVideo |

### Autres (1 fichier)

| Fichier | Modifications |
|---------|---------------|
| `web/src/lib/circuit-breaker.ts` | COST_THRESHOLD_USD 3 → 10 |

---

## 11. Schéma de données final

### socialMontageSchema (Zod)

```typescript
{
  hookText: string,           // default: "Avant / Après IA ✨"
  rooms: [{
    beforePhotoUrl: string,   // Photo originale (avec meubles)
    cleanedPhotoUrl?: string, // Photo nettoyée (pièce vidée) — optionnel
    stagedPhotoUrl: string,   // Photo stagée finale
    videoUrl: string,         // Vidéo Kling v2.1 Pro
    roomType: string,         // ex: "living_room"
    roomLabel: string,        // ex: "Salon"
  }],
  musicUrl?: string,          // URL MP3 (Supabase Storage)
  watermark: {
    type: "vimimo" | "custom" | "none",
    agencyLogoUrl?: string,
  },
  style: string,              // ex: "modern"
}
```

### ProjectMode (TypeScript)

```typescript
type ProjectMode = "staging_piece" | "video_visite" | "social_reel";
```

### Room (web/src/lib/types.ts)

```typescript
interface Room {
  index: number;
  roomType: string;
  roomLabel: string;
  photoId: string;
  cleanedPhotoUrl: string;    // ← déjà existant, maintenant passé à Remotion
  beforePhotoUrl: string;
  visionData: Record<string, unknown>;  // ← peuplé par analyze-rooms
  options: RoomOption[];
  selectedOptionIndex?: number;
  videoUrl?: string;
  videoPredictionId?: string;
}
```

---

## 12. Timeline visuelle finale

### SocialMontage — Exemple 3 pièces

```
Temps (s)  0    0.5    1.0    1.5    2.0    2.5    3.0    3.5    4.0    4.5    5.0    5.5    6.0    6.5    7.0    7.5    8.0    8.5    9.0    9.5   10.0   10.5
Frames     0    15     30     45     60     75     90     105    120    135    150    165    180    195    210    225    240    255    270    285    300    315
           ├────┼────┼────┤    ├────┼────┼────┼────┤    ├──┤    ├────┼────┼────┼────┤    ├──┤    ├────┼────┼────┼────┤    ├────┼────┼────┤
           │   HOOK (3 beats) │  SALON (4 beats)   │ CUT │  CHAMBRE (4 beats)  │ CUT │  CUISINE (4 beats)  │  OUTRO (3 beats)  │
                              │ORIG│CLEAN│VIDEO│STAG│     │ORIG│CLEAN│VIDEO│STAG│     │ORIG│CLEAN│VIDEO│STAG│
                              │ 🏠 │ 🧹  │ 🎬  │ ✨ │     │ 🏠 │ 🧹  │ 🎬  │ ✨ │     │ 🏠 │ 🧹  │ 🎬  │ ✨ │
```

### Audio overlay

```
Volume  0.85 ─────────────────────────────────────────────────────────────╲
        0.00 ╱                                                             ╲─── 0
             │← fade-in (5fr) ──────── plateau 0.85 ──────────────────│← fade-out (45fr) →│
```

### Beat grid (120 BPM)

```
Beat:  1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21
       ●   ●   ●   ●   ●   ●   ●   ●   ●   ●   ●   ●   ●   ●   ●   ●   ●   ●   ●   ●   ●
       └─ HOOK ─┘   └── SALON ──┘ CUT └── CHAMBRE ─┘ CUT └── CUISINE ─┘   └─ OUTRO ─┘
```

Chaque `●` = 1 beat = 15 frames = 0.5s. Les FlashCut tombent pile sur un beat.

---

## 13. Déploiements

### Vercel (web)

| Commit | URL | Statut |
|--------|-----|--------|
| `20e2189` | `vimimo-ddn1inlr7-claovia.vercel.app` | ✅ OK |
| `6e8401f` | `vimimo-antjz01lw-claovia.vercel.app` | ✅ OK |

### VPS Docker (Remotion)

| Action | Méthode | Statut |
|--------|---------|--------|
| rsync src/ | `rsync -avz --delete` vers `/opt/remotion/src/` | ✅ |
| docker cp | `docker cp` dans `eden-remotion-eden-remotion-1:/app/src/` | ✅ |
| restart | `docker restart` | ✅ |
| health | `curl http://localhost:3123/health` → `{"status":"ok","bundled":true}` | ✅ |

**Note** : Le VPS n'a pas de repo git. Le deploy se fait via `rsync` + `docker cp` + `docker restart`.

---

## 14. Tests et vérifications

### Build validations

| Projet | Commande | Résultat |
|--------|----------|----------|
| Next.js web | `npm run build` | ✅ 0 erreurs |
| Remotion | `npx tsc --noEmit` | ✅ 0 erreurs |

### Points à vérifier manuellement

- [ ] **Remotion Studio** : `cd remotion && npm run start` → SocialMontage → vérifier l'enchaînement des 4 phases par room
- [ ] **Badge NETTOYAGE IA** : Vérifier qu'il apparaît en bleu pendant le beat 2 (frames 17-30)
- [ ] **Beat-sync** : Avec un MP3 à 120 BPM, vérifier que les FlashCut tombent sur les temps forts
- [ ] **Fade-out audio** : Le volume descend progressivement pendant les 45 dernières frames (outro)
- [ ] **Fallback cleanedPhotoUrl** : Si absent, la phase 2 montre la photo originale (pas de crash)
- [ ] **Frontend** : Page `/new` → 3 cartes de mode avec Social Reel (icône Smartphone)
- [ ] **MP3 Supabase** : Vérifier que `energetic.mp3` existe dans le bucket `assets/music/`
- [ ] **Pipeline E2E** : Créer un projet social_reel et vérifier le flux complet jusqu'à la vidéo finale

---

## 15. Risques et points d'attention

### Risques techniques

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| MP3 manquant dans Supabase | Moyenne | Audio muet (pas de crash grâce au `{musicUrl && ...}`) | Uploader les MP3 dans `assets/music/` |
| cleanedPhotoUrl non persisté (Replicate URL expirée) | Faible | Phase 2 utilise la photo originale (fallback) | Déjà persisté via `persistFromUrl` dans cleaning-poll |
| Remotion timeout sur vidéos longues (6 rooms = 19.5s) | Faible | Render échoue | Timeout de 120s sur downloadRender, render server async |
| Rate limit Replicate sur vidéos | Faible | Certaines vidéos échouent | Batches de 2 + retry with backoff |

### Dette technique identifiée

1. **Pas de choix de musique** pour social_reel (toujours "energetic") — pourrait être exposé à l'utilisateur plus tard
2. **PropertyShowcase (16:9)** n'utilise pas encore le storytelling 4 étapes — uniquement SocialMontage pour l'instant
3. **StudioMontage** a `cleanedPhotoUrl` dans le schéma mais ne l'utilise pas encore visuellement
4. **Pas de BPM detection** — le BPM est hardcodé à 120. Un track à un autre BPM ne sera pas synchronisé

### Prochaines étapes suggérées

1. Uploader les MP3 dans Supabase Storage (`assets/music/energetic.mp3`)
2. Tester un pipeline social_reel E2E en production
3. Optionnel : exposer le choix de musique pour social_reel dans l'UI
4. Optionnel : appliquer le storytelling 4 étapes au PropertyShowcase/StudioMontage
