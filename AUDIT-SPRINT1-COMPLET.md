# AUDIT COMPLET — Sprint 1 + Prompts Social Reel

**Date** : 25 Fevrier 2026
**Commits** : `e1b462e` (Sprint 1) + `b5ec35b` (Social prompts)
**Build** : Next.js OK | Remotion TypeScript OK
**Deploys** : Vercel prod OK | VPS Docker OK (bundled, health: ok)

---

## TABLE DES MATIERES

1. [Recap executif](#1-recap-executif)
2. [Sprint 1 — Corrections pipeline](#2-sprint-1--corrections-pipeline)
3. [Sprint 1 — SocialMontage composition](#3-sprint-1--socialmontage-composition)
4. [Prompts video dynamiques social_reel](#4-prompts-video-dynamiques-social_reel)
5. [Fichiers modifies — inventaire complet](#5-fichiers-modifies--inventaire-complet)
6. [Diffs detailles par fichier](#6-diffs-detailles-par-fichier)
7. [Tableau des couts](#7-tableau-des-couts)
8. [Deploys effectues](#8-deploys-effectues)
9. [Points a verifier manuellement](#9-points-a-verifier-manuellement)
10. [Sprint 2+ — Prochaines etapes](#10-sprint-2--prochaines-etapes)

---

## 1. Recap executif

**4 corrections critiques** au pipeline de staging video + **1 nouvelle composition Remotion** verticale + **1 systeme de prompt dynamique** pour les videos sociales.

| Categorie | Modifications | Impact |
|-----------|---------------|--------|
| Qualite staging | visionData GPT-4o + cfg_scale 0.8 | Meubles coherents avec la piece |
| Fiabilite | Videos en batch de 2 + seuil $10 | Plus de 429/CostThreshold |
| Nouvelle feature | SocialMontage 1080x1920 | Reels/TikTok vertical |
| Prompts video | FPV dynamique pour social_reel | Videos virales energiques |

---

## 2. Sprint 1 — Corrections pipeline

### 2.1 VisionData — Analyse GPT-4o avant staging (P0)

**Fichier** : `web/src/lib/inngest/functions/auto-staging.ts`
**Lignes** : 106-142

**Probleme** : Le step "build-rooms" initialisait chaque room avec `visionData: {}`. GPT-4o generait des prompts de staging sans connaitre le sol, les fenetres, l'eclairage. Resultat : meubles incoherents, mauvaise echelle, meubles devant les fenetres.

**Solution** : Nouveau step **"analyze-rooms"** (Step 1b) :
- Appelle `analyzePhotos()` sur toutes les photos nettoyees
- Remplit `visionData` avec : `dimensions`, `existingMaterials`, `lighting`, `cameraAngle`, `notes`
- Non-bloquant (try/catch, continue avec visionData vide si erreur)
- Cout : +$0.03 par projet (~0.7% du total)

**Flux avant/apres** :
```
AVANT : build-rooms (visionData: {}) → launch-staging (prompts aveugles)
APRES : build-rooms (visionData: {}) → analyze-rooms (GPT-4o Vision) → launch-staging (prompts informes)
```

---

### 2.2 cfg_scale 0.7 → 0.8 (P0)

**Fichier** : `web/src/lib/services/replicate.ts`
**Ligne** : 136

```typescript
// AVANT
cfg_scale: 0.7,

// APRES (modes classiques)
cfg_scale: 0.8,
// (social_reel utilise 0.7 pour plus de liberte creative)
```

**Impact** : Meilleure fidelite au prompt de mouvement de camera. Transitions plus nettes entre photo originale et photo stagee. Moins de distorsion.

---

### 2.3 Sequentialisation videos — batch de 2 (P0)

**Fichier** : `web/src/lib/inngest/functions/auto-staging.ts`
**Lignes** : 258-277

**Probleme** : Toutes les videos lancees en `Promise.allSettled()` simultanement. 5+ rooms = 5+ requetes paralleles → 429 Too Many Requests de Replicate.

**Solution** :
```typescript
const videoBatchSize = 2;
for (let start = 0; start < needsVideo.length; start += videoBatchSize) {
  const batch = needsVideo.slice(start, start + videoBatchSize);
  await Promise.allSettled(batch.map(async (room) => { ... }));
}
```

**Impact** : Plus de 429. Temps +20-30s par batch supplementaire, fiabilite ++.

---

### 2.4 Seuil de cout $3 → $10 (P0)

**Fichier** : `web/src/lib/circuit-breaker.ts`
**Ligne** : 12

```typescript
// AVANT
const COST_THRESHOLD_USD = parseFloat(process.env.COST_THRESHOLD_USD || "3.0");

// APRES
const COST_THRESHOLD_USD = parseFloat(process.env.COST_THRESHOLD_USD || "10.0");
```

**Justification** : Un projet 5 rooms coute ~$4.18. Le seuil a $3 bloquait tous les projets de 4+ rooms.

---

## 3. Sprint 1 — SocialMontage composition

### 3.1 Composition Remotion verticale

**Nouveau fichier** : `remotion/src/SocialMontage.tsx` (383 lignes)

| Composant | Duree | Comportement |
|-----------|-------|--------------|
| **HookScreen** | 1.5s (45f) | Texte hook bold + fond image floutee + zoom inverse |
| **SocialRoomSegment** | 1.3s (40f) | AVANT (0.33s) → Video x2.5 (0.77s) → APRES (0.23s) |
| **FlashCut** | 0.27s (8f) | Flash blanc (mix-blend: screen) entre rooms |
| **SocialOutro** | 1.5s (45f) | Branding VIMIMO avec spring animation |

**Timeline 5 rooms** : `45 + 5×40 + 4×8 + 45 = 322 frames = 10.7s`

**Detail SocialRoomSegment (40 frames)** :
```
f0-10  : Photo AVANT, Ken Burns (scale 1.0→1.08), badge "AVANT" noir
f10-12 : Crossfade → video
f12-35 : Video IA acceleree ×2.5, zoom subtil (1.0→1.04)
f33-36 : Crossfade → photo stagee
f34-40 : Beauty shot APRES (scale 1.06→1.0), badge dore "APRES"
```

**Badges** :
- AVANT : `rgba(0,0,0,0.7)`, blur 8px, border blanc 20%
- APRES : `rgba(200,164,90,0.8)`, border or, letterspacing 3
- Room label : glassmorphism `rgba(255,255,255,0.1)`, blur 12px

### 3.2 Timeline utilities

**Nouveau fichier** : `remotion/src/social/timeline.ts` (39 lignes)

```typescript
SOCIAL_FPS = 30
SOCIAL_HOOK_FRAMES = 45    // 1.5s
SOCIAL_ROOM_FRAMES = 40    // 1.3s
SOCIAL_CUT_FRAMES = 8      // 0.27s
SOCIAL_OUTRO_FRAMES = 45   // 1.5s
```

### 3.3 Schema Zod

**Fichier modifie** : `remotion/src/schemas.ts` — lignes 69-87

```typescript
socialMontageSchema = z.object({
  hookText: z.string().default("Avant / Apres IA"),
  rooms: z.array(socialRoomSchema).min(1).max(30),
  watermark: watermarkSchema.default({}),
  style: z.string().default("modern"),
});
```

Differences vs StudioMontage :
- Pas de `propertyInfo` (pas d'overlay prix/surface)
- Pas de `musicUrl` (reels utilisent leur propre musique)
- `hookText` personnalisable
- `min(1)` au lieu de `min(2)` (fonctionne avec 1 room)

### 3.4 Registration Root.tsx

**Fichier modifie** : `remotion/src/Root.tsx` — 4eme composition ajoutee

| ID | Resolution | Mode | Min rooms |
|----|-----------|------|-----------|
| VirtualStaging | 1920×1080 | v1 legacy | 1 |
| PropertyShowcase | 1920×1080 | staging_piece | 1 |
| StudioMontage | 1920×1080 | video_visite | 2 |
| **SocialMontage** | **1080×1920** | **social_reel** | **1** |

### 3.5 Service startSocialRender()

**Fichier modifie** : `web/src/lib/services/remotion.ts` — lignes 185-230

Nouvelle fonction :
```typescript
export async function startSocialRender(project: Project): Promise<string>
```
- Filtre rooms avec video + options
- Resout watermark (vimimo/custom selon abonnement)
- Envoie `compositionId: "SocialMontage"` au serveur Remotion VPS
- Props : `hookText`, `rooms`, `watermark`, `style`

### 3.6 Type ProjectMode etendu

**Fichier modifie** : `web/src/lib/types.ts` — ligne 69

```typescript
// AVANT
export type ProjectMode = "staging_piece" | "video_visite";

// APRES
export type ProjectMode = "staging_piece" | "video_visite" | "social_reel";
```

### 3.7 Routing auto-staging Step 6

**Fichier modifie** : `web/src/lib/inngest/functions/auto-staging.ts` — lignes 326-383

```
if (mode === "social_reel" && rooms >= 1) → startSocialRender()
else if (rooms >= 2 && montageConfig)     → startStudioRender()
else if (rooms >= 2)                       → startRender()
else                                       → phase = "done"
```

---

## 4. Prompts video dynamiques social_reel

### 4.1 Analyse du systeme existant

Le prompt video Kling v2.1 est assemble en 3 couches :

| Couche | Constante | Role |
|--------|-----------|------|
| Camera | `VIDEO_CAMERA_PROMPT` | "Ultra slow smooth cinematic dolly-in" |
| Contenu | inline dans `klingVideoPrompt()` | "Seamless transition from empty X to furnished X" |
| Qualite | `VIDEO_QUALITY_SUFFIX` | "8K photorealistic, strict temporal consistency" |
| Negatif | `KLING_NEGATIVE_PROMPT` | "no fast camera movement, no whip pan" |

**Probleme** : Pour `social_reel`, les mouvements rapides sont souhaites mais le prompt les interdit explicitement a 2 endroits :
1. `VIDEO_CAMERA_PROMPT` : "no handheld shake, no fast pan, no whip movement"
2. `KLING_NEGATIVE_PROMPT` : "fast camera movement, shaky camera, handheld, whip pan"

### 4.2 Solution implementee

**Fichier modifie** : `web/src/lib/prompts.ts` — 4 nouveaux exports

#### SOCIAL_CAMERA_PROMPT
```
"Dynamic FPV drone push-in with smooth acceleration,
fast energetic forward camera movement through the room,
immersive first-person walkthrough cinematography,
dramatic reveal of furnished space, bold camera motion,
camera height sweeping from low to eye level."
```

**vs classique** : "Ultra slow smooth cinematic dolly-in, locked tripod-mounted camera..."

#### SOCIAL_QUALITY_SUFFIX
```
"4K cinematic vertical video, viral real estate content,
strict temporal consistency, frame-to-frame coherence,
no morphing, no melting, no warping, no object flickering,
all furniture physically stable and stationary throughout,
walls, floor, windows, doors structurally rigid in every frame,
natural indoor lighting with consistent shadows,
social media cinematic quality, smooth 24fps motion."
```

**vs classique** : "8K photorealistic" → "4K cinematic vertical", "Architectural Digest" → "social media cinematic"

#### SOCIAL_NEGATIVE_PROMPT
```
"blurry, out of focus, low quality, low resolution, grainy,
warped walls, warped floor, warped windows, bent doorframes, curved ceiling,
changed room proportions, room shape shift, structural deformation,
furniture sliding, furniture floating, furniture morphing, objects melting,
fisheye distortion, extreme lens flare,
flickering lights, inconsistent shadows, temporal artifacts,
text, watermark, logo, signature."
```

**Difference avec KLING_NEGATIVE_PROMPT** :
- SUPPRIME : `"fast camera movement, shaky camera, handheld, whip pan, rotation,"`
- SUPPRIME : `"perspective shift,"` (le FPV change naturellement de perspective)
- GARDE : toutes les protections structurelles (warped walls, furniture morphing, etc.)

#### klingSocialVideoPrompt(style, roomType)
```typescript
export function klingSocialVideoPrompt(style: string, roomType: string): string {
  return [
    SOCIAL_CAMERA_PROMPT,
    `Dramatic reveal from empty ${roomType} to stunning ${style} ${roomType}.`,
    "Room structure, walls, floor, ceiling, windows, and doors remain PERFECTLY IDENTICAL.",
    "Furniture appears in a cinematic reveal — fast, bold, immersive.",
    SOCIAL_QUALITY_SUFFIX,
  ].join(" ");
}
```

**vs klingVideoPrompt** : "Seamless transition" → "Dramatic reveal", "gradually and naturally" → "fast, bold, immersive"

### 4.3 Modification generateVideo()

**Fichier** : `web/src/lib/services/replicate.ts`

```typescript
// AVANT
export async function generateVideo(
  originalUrl, stagedUrl, style, roomType, ctx?
)

// APRES — nouveau parametre projectMode
export async function generateVideo(
  originalUrl, stagedUrl, style, roomType, ctx?, projectMode?
)
```

**Logique interne** :
```typescript
const isSocial = projectMode === "social_reel";

// Prompt dynamique vs classique
const prompt = isSocial
  ? klingSocialVideoPrompt(style, roomType)
  : klingVideoPrompt(style, roomType);

// Negative prompt permissif vs strict
const negativePrompt = isSocial
  ? SOCIAL_NEGATIVE_PROMPT
  : KLING_NEGATIVE_PROMPT;

// cfg_scale : 0.7 (plus creatif) vs 0.8 (plus fidele)
cfg_scale: isSocial ? 0.7 : 0.8,
```

### 4.4 Points d'appel mis a jour

| Appelant | Fichier | Mode passe |
|----------|---------|------------|
| auto-staging Step 4 | `auto-staging.ts:270` | `proj.mode` |
| generate API route | `generate/route.ts:52` | `project.mode` |

**Retrocompatibilite** : `projectMode` est optionnel (`undefined`). Quand absent, `isSocial = false` → comportement identique a avant.

---

## 5. Fichiers modifies — inventaire complet

### Fichiers modifies (8)

| Fichier | Lignes modifiees | Type |
|---------|-----------------|------|
| `web/src/lib/prompts.ts` | +56 lignes (exports sociaux) | Feature |
| `web/src/lib/services/replicate.ts` | +16 lignes (mode switch) | Feature |
| `web/src/lib/inngest/functions/auto-staging.ts` | +53 lignes (analyze-rooms, batch videos, social routing) | Fix + Feature |
| `web/src/lib/circuit-breaker.ts` | 1 ligne (seuil $10) | Fix |
| `web/src/lib/types.ts` | 1 ligne (social_reel) | Feature |
| `web/src/lib/services/remotion.ts` | +47 lignes (startSocialRender) | Feature |
| `web/src/app/api/project/[id]/generate/route.ts` | 1 ligne (pass mode) | Fix |
| `remotion/src/Root.tsx` | +44 lignes (SocialMontage registration) | Feature |
| `remotion/src/schemas.ts` | +20 lignes (socialMontageSchema) | Feature |

### Fichiers crees (3)

| Fichier | Lignes | Description |
|---------|--------|-------------|
| `remotion/src/SocialMontage.tsx` | 383 | Composition verticale complete |
| `remotion/src/social/timeline.ts` | 39 | Constantes et calculs timeline |
| `AUDIT-SPRINT1.md` | ~180 | Audit Sprint 1 (document precedent) |

---

## 6. Diffs detailles par fichier

### web/src/lib/prompts.ts

```diff
+ // ─── Social Reel video prompts (dynamic FPV camera) ───
+
+ export const SOCIAL_CAMERA_PROMPT = [
+   "Dynamic FPV drone push-in with smooth acceleration,",
+   "fast energetic forward camera movement through the room,",
+   "immersive first-person walkthrough cinematography,",
+   "dramatic reveal of furnished space, bold camera motion,",
+   "camera height sweeping from low to eye level.",
+ ].join(" ");
+
+ export const SOCIAL_QUALITY_SUFFIX = [
+   "4K cinematic vertical video, viral real estate content,",
+   "strict temporal consistency, frame-to-frame coherence,",
+   "no morphing, no melting, no warping, no object flickering,",
+   "all furniture physically stable and stationary throughout,",
+   "walls, floor, windows, doors structurally rigid in every frame,",
+   "natural indoor lighting with consistent shadows,",
+   "social media cinematic quality, smooth 24fps motion.",
+ ].join(" ");
+
+ export const SOCIAL_NEGATIVE_PROMPT = [
+   "blurry, out of focus, low quality, low resolution, grainy,",
+   "warped walls, warped floor, warped windows, bent doorframes, curved ceiling,",
+   "changed room proportions, room shape shift, structural deformation,",
+   "furniture sliding, furniture floating, furniture morphing, objects melting,",
+   "fisheye distortion, extreme lens flare,",
+   "flickering lights, inconsistent shadows, temporal artifacts,",
+   "text, watermark, logo, signature.",
+ ].join(" ");
+
+ export function klingSocialVideoPrompt(style: string, roomType: string): string {
+   return [
+     SOCIAL_CAMERA_PROMPT,
+     `Dramatic reveal from empty ${roomType} to stunning ${style} ${roomType}.`,
+     "Room structure, walls, floor, ceiling, windows, and doors remain PERFECTLY IDENTICAL.",
+     "Furniture appears in a cinematic reveal — fast, bold, immersive.",
+     SOCIAL_QUALITY_SUFFIX,
+   ].join(" ");
+ }
```

### web/src/lib/services/replicate.ts

```diff
  import {
    CLEAN_PHOTO_PROMPT,
    CLEANING_QUALITY_SUFFIX,
    STAGING_QUALITY_SUFFIX,
    klingVideoPrompt,
    KLING_NEGATIVE_PROMPT,
+   klingSocialVideoPrompt,
+   SOCIAL_NEGATIVE_PROMPT,
  } from "../prompts";
+ import type { ProjectMode } from "../types";

  export async function generateVideo(
    originalUrl: string,
    stagedUrl: string,
    style: string,
    roomType: string,
    ctx?: PredictionContext,
+   projectMode?: ProjectMode,
  ): Promise<string> {
    if (ctx?.projectId) await costGuard(ctx.projectId, "kling-v2.1-pro");

+   const isSocial = projectMode === "social_reel";
+   const prompt = isSocial
+     ? klingSocialVideoPrompt(style, roomType)
+     : klingVideoPrompt(style, roomType);
+   const negativePrompt = isSocial
+     ? SOCIAL_NEGATIVE_PROMPT
+     : KLING_NEGATIVE_PROMPT;

    const result = await withCircuitBreaker("replicate_video", () =>
      withRetry(async () => {
        const prediction = await getClient().predictions.create({
          model: "kwaivgi/kling-v2.1",
          input: {
-           prompt: klingVideoPrompt(style, roomType),
+           prompt,
            start_image: originalUrl,
            end_image: stagedUrl,
            mode: "pro",
            duration: 5,
-           cfg_scale: 0.8,
-           negative_prompt: KLING_NEGATIVE_PROMPT,
+           cfg_scale: isSocial ? 0.7 : 0.8,
+           negative_prompt: negativePrompt,
          },
```

### web/src/lib/inngest/functions/auto-staging.ts

```diff
- import { generateStagingPrompts } from "@/lib/services/openai";
- import { startRender, startStudioRender } from "@/lib/services/remotion";
+ import { generateStagingPrompts, analyzePhotos } from "@/lib/services/openai";
+ import { startRender, startStudioRender, startSocialRender } from "@/lib/services/remotion";

  // After build-rooms step:
+ // Step 1b: Analyze rooms (populate visionData via GPT-4o Vision)
+ await step.run("analyze-rooms", async () => {
+   const proj = await getProject(projectId);
+   if (!proj || proj.phase !== "auto_staging") return;
+   const needsAnalysis = proj.rooms.some(
+     (r) => !r.visionData || Object.keys(r.visionData).length === 0,
+   );
+   if (!needsAnalysis) return;
+   try {
+     const photoUrls = proj.rooms.map((r, i) => ({ index: i + 1, url: r.cleanedPhotoUrl }));
+     const analysis = await analyzePhotos(photoUrls, proj.style, undefined, projectId);
+     for (const analyzed of analysis.rooms) {
+       const room = proj.rooms[analyzed.photoIndex - 1];
+       if (!room) continue;
+       room.visionData = {
+         dimensions: analyzed.dimensions,
+         existingMaterials: analyzed.existingMaterials,
+         lighting: analyzed.lighting,
+         cameraAngle: analyzed.cameraAngle,
+         notes: analyzed.notes,
+       };
+     }
+     await saveProject(proj);
+   } catch (error) {
+     console.error("[auto-staging] Room analysis failed:", error);
+   }
+ });

  // Step 4: videos now batched
- await Promise.allSettled(needsVideo.map(async (room) => { ... }));
+ const videoBatchSize = 2;
+ for (let start = 0; start < needsVideo.length; start += videoBatchSize) {
+   const batch = needsVideo.slice(start, start + videoBatchSize);
+   await Promise.allSettled(batch.map(async (room) => { ... }));
+ }

  // Step 4: pass mode to generateVideo
- const predictionId = await generateVideo(
-   room.beforePhotoUrl, stagedUrl, proj.styleLabel, room.roomType);
+ const predictionId = await generateVideo(
+   room.beforePhotoUrl, stagedUrl, proj.styleLabel, room.roomType,
+   undefined, proj.mode);

  // Step 6: social_reel routing added
+ if (proj.mode === "social_reel" && roomsWithVideo.length >= 1) {
+   const renderId = await startSocialRender(proj);
+   ...
+ }
```

---

## 7. Tableau des couts

### Cout par projet (5 rooms)

| Etape | Avant Sprint 1 | Apres Sprint 1 |
|-------|----------------|-----------------|
| Cleaning (Flux Kontext Pro) | 5 × $0.05 = $0.25 | $0.25 |
| **Analyse GPT-4o Vision** | **$0.00** | **$0.03** |
| Staging prompts (GPT-4o) | 5 × $0.03 = $0.15 | $0.15 |
| Options staging (Flux) | 25 × $0.05 = $1.25 | $1.25 |
| Videos (Kling v2.1 Pro) | 5 × $0.50 = $2.50 | $2.50 |
| **Total** | **$4.15** | **$4.18** |

Delta : +$0.03 (+0.7%) pour une amelioration significative de la qualite du staging.

### Comparaison cfg_scale par mode

| Mode | cfg_scale | Effet |
|------|-----------|-------|
| staging_piece | 0.8 | Fidele au prompt, mouvement controle |
| video_visite | 0.8 | Fidele au prompt, mouvement controle |
| social_reel | 0.7 | Plus creatif, mouvement dynamique permis |

---

## 8. Deploys effectues

### Vercel (Web/API)

| Deploy | URL | Commit | Statut |
|--------|-----|--------|--------|
| Sprint 1 | `vimimo-615c2rc14-claovia.vercel.app` | `e1b462e` | OK |
| Social prompts | `vimimo-btsbh75ir-claovia.vercel.app` | `b5ec35b` | OK |

### VPS Remotion (Docker)

| Serveur | IP | Port | Statut |
|---------|----|----|--------|
| remotion-server | 72.61.109.9 | 8000 | `{"status":"ok","bundled":true,"activeRenders":0}` |

**Methode** : rsync src/ → docker build → docker run
**Compositions disponibles** : VirtualStaging, PropertyShowcase, StudioMontage, **SocialMontage**

---

## 9. Points a verifier manuellement

### Sur les prochaines generations video

- [ ] **Mode classique inchange** : Lancer un projet `staging_piece` ou `video_visite` et verifier que la video est toujours en dolly-in lent et cinematique. Le prompt utilise doit contenir "Ultra slow smooth cinematic dolly-in".

- [ ] **Mode social_reel dynamique** : Lancer un projet avec `mode: "social_reel"` et verifier que la video est energique avec mouvement de camera rapide. Le prompt doit contenir "Dynamic FPV drone push-in".

- [ ] **VisionData rempli** : Apres le step "analyze-rooms", verifier dans Supabase que `rooms[].visionData` contient `dimensions`, `existingMaterials`, `lighting`, `cameraAngle`, `notes`.

- [ ] **Pas de 429 Replicate** : Verifier dans les logs Inngest que les videos se lancent par paires (2 max en parallele) et qu'il n'y a pas d'erreur 429.

- [ ] **Seuil de cout** : Un projet 5 rooms (~$4.18) ne doit plus etre bloque par `CostThresholdError`.

- [ ] **SocialMontage vertical** : Un render `SocialMontage` doit produire une video 1080×1920 (vertical) avec hook text + fast cuts.

- [ ] **Negative prompt social** : Verifier dans les logs Replicate que le `negative_prompt` pour `social_reel` ne contient PAS "fast camera movement, shaky camera, whip pan".

### Verification rapide des prompts

Pour verifier quel prompt est envoye, ajouter temporairement un `console.log` dans `generateVideo()` :
```typescript
console.log(`[generateVideo] mode=${projectMode}, isSocial=${isSocial}`);
console.log(`[generateVideo] prompt=${prompt.substring(0, 80)}...`);
```

Resultats attendus :
- staging_piece/video_visite : `"Ultra slow smooth cinematic dolly-in..."`
- social_reel : `"Dynamic FPV drone push-in with smooth acceleration..."`

---

## 10. Sprint 2+ — Prochaines etapes

| # | Tache | Priorite | Description |
|---|-------|----------|-------------|
| 1 | **UI mode social_reel** | P1 | Ajouter le choix "Reel Social" dans le formulaire de creation de projet (bouton/toggle) |
| 2 | **Test A/B prompts** | P2 | Tester 3-5 variantes du SOCIAL_CAMERA_PROMPT sur 10 rooms differentes |
| 3 | **Prompt video customisable** | P2 | Permettre au user de choisir entre "lent immobilier" et "dynamique social" |
| 4 | **Musique integree social** | P2 | Ajouter une option de musique courte (8-15s) optimisee pour les reels |
| 5 | **Watermark vertical** | P2 | Adapter le watermark VIMIMO pour le format vertical (plus petit, coin) |
| 6 | **Cleaning quality check** | P2 | Verifier automatiquement que le nettoyage n'a pas laisse de meubles residuels |
| 7 | **Dual render** | P3 | Generer automatiquement les 2 formats (horizontal + vertical) pour chaque projet |
