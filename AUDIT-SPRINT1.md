# AUDIT SPRINT 1 — VIMIMO Pipeline

**Date** : 25 Fevrier 2026
**Statut** : Implemente — Build OK (Next.js + Remotion TypeScript)

---

## Sommaire des modifications

| # | Fichier | Type | Priorite | Statut |
|---|---------|------|----------|--------|
| 1 | `web/src/lib/inngest/functions/auto-staging.ts` | Fix + Feature | P0 | Done |
| 2 | `web/src/lib/services/replicate.ts` | Fix | P0 | Done |
| 3 | `web/src/lib/circuit-breaker.ts` | Fix | P0 | Done |
| 4 | `web/src/lib/types.ts` | Feature | P1 | Done |
| 5 | `web/src/lib/services/remotion.ts` | Feature | P1 | Done |
| 6 | `remotion/src/SocialMontage.tsx` | **Nouveau** | P1 | Done |
| 7 | `remotion/src/social/timeline.ts` | **Nouveau** | P1 | Done |
| 8 | `remotion/src/schemas.ts` | Feature | P1 | Done |
| 9 | `remotion/src/Root.tsx` | Feature | P1 | Done |

---

## 1. VisionData — Analyse GPT-4o avant staging (P0)

### Probleme

Dans `auto-staging.ts` Step 1 "build-rooms" (ligne 99), chaque room etait initialisee avec `visionData: {}`.

Consequence : GPT-4o generait des prompts de staging **sans connaitre** le type de sol, la position des fenetres, l'eclairage, l'angle de la camera. Les meubles generes pouvaient etre incoherents avec la piece (meubles devant une fenetre, style de parquet ignore, echelle incorrecte).

### Solution

**Nouveau step "analyze-rooms"** (Step 1b) entre "build-rooms" et "launch-staging" :

```
auto-staging.ts — lignes 106-142
```

- Appelle `analyzePhotos()` (GPT-4o Vision) sur toutes les photos nettoyees
- Remplit `visionData` avec 5 champs structures :
  - `dimensions` — estimation des dimensions de la piece
  - `existingMaterials` — sol, murs, plafond (parquet, carrelage, peinture...)
  - `lighting` — type d'eclairage, direction, intensite
  - `cameraAngle` — angle et hauteur de la camera
  - `notes` — observations supplementaires (moulures, cheminee, poutres...)
- **Non-bloquant** : si l'analyse echoue, le pipeline continue avec `visionData: {}` (fallback)
- **Cout** : ~$0.03 par appel GPT-4o Vision (1 appel pour toutes les rooms)

### Impact attendu

Le staging devrait etre significativement plus coherent :
- Meubles a la bonne echelle par rapport a la piece
- Respect du type de sol (pas de tapis sur du parquet, etc.)
- Eclairage du staging coherent avec la lumiere naturelle
- Pas de meubles devant les fenetres

### Code avant/apres

**Avant :**
```
Step 1: build-rooms → visionData: {}
Step 2: launch-staging → GPT-4o recoit visionData vide
```

**Apres :**
```
Step 1: build-rooms → visionData: {}
Step 1b: analyze-rooms → GPT-4o Vision remplit visionData
Step 2: launch-staging → GPT-4o recoit dimensions, materiaux, eclairage, angle
```

---

## 2. cfg_scale 0.7 → 0.8 (P0)

### Probleme

Dans `replicate.ts` ligne 136, le parametre `cfg_scale` de Kling v2.1 Pro etait a `0.7`.

`cfg_scale` controle l'adherence au prompt : une valeur trop basse donne des videos avec des mouvements de camera imprevisibles et des transitions floues entre l'image de depart et d'arrivee.

### Solution

```typescript
// Avant
cfg_scale: 0.7,

// Apres
cfg_scale: 0.8,
```

### Impact attendu

- Meilleure fidelite au prompt de mouvement de camera
- Transitions plus nettes entre photo originale et photo stagee
- Moins de distorsion et d'artefacts visuels
- La video suit mieux la trajectoire prescrite (pan lent, zoom subtil)

### Fichier modifie

`web/src/lib/services/replicate.ts` — ligne 136

---

## 3. Sequentialisation des videos (P0)

### Probleme

Dans `auto-staging.ts` Step 4 "launch-videos", **toutes les videos** etaient lancees en parallele via `Promise.allSettled()`.

Avec 5+ rooms, cela envoyait 5+ requetes simultanees a Replicate, provoquant des erreurs 429 (Too Many Requests) et des echecs silencieux.

### Solution

```typescript
// Avant — tout en parallele
await Promise.allSettled(
  needsVideo.map(async (room) => { ... })
);

// Apres — batches de 2
const videoBatchSize = 2;
for (let start = 0; start < needsVideo.length; start += videoBatchSize) {
  const batch = needsVideo.slice(start, start + videoBatchSize);
  await Promise.allSettled(
    batch.map(async (room) => { ... })
  );
}
```

### Impact attendu

- Plus aucune erreur 429 sur Replicate
- Les videos sont lancees par paires (2 en parallele, puis 2 suivantes, etc.)
- Temps total legerement plus long (+20-30s par batch) mais fiabilite fortement amelioree

### Fichier modifie

`web/src/lib/inngest/functions/auto-staging.ts` — lignes 258-277

---

## 4. Seuil de cout $3 → $10 (P0)

### Probleme

Le `COST_THRESHOLD_USD` dans `circuit-breaker.ts` etait a `3.0` par defaut.

Un projet standard avec 5 rooms coute :
- 5 × $0.05 (cleaning) = $0.25
- 1 × $0.03 (analyse GPT-4o) = $0.03
- 5 × $0.03 (staging prompts GPT-4o) = $0.15
- 5 × 5 × $0.05 (25 options staging) = $1.25
- 5 × $0.50 (5 videos Kling) = $2.50
- **Total = ~$4.18**

Donc tout projet de 5+ rooms etait bloque par le seuil de cout, generant un `CostThresholdError` et un remboursement automatique.

### Solution

```typescript
// Avant
const COST_THRESHOLD_USD = parseFloat(process.env.COST_THRESHOLD_USD || "3.0");

// Apres
const COST_THRESHOLD_USD = parseFloat(process.env.COST_THRESHOLD_USD || "10.0");
```

### Impact attendu

- Les projets de 5-10 rooms ne seront plus bloques
- Le seuil reste configurable via la variable d'environnement `COST_THRESHOLD_USD`
- L'alerte email admin est toujours envoyee si le seuil est depasse

### Fichier modifie

`web/src/lib/circuit-breaker.ts` — ligne 12

---

## 5. Nouveau mode `social_reel` (P1)

### Ajout

Le type `ProjectMode` dans `types.ts` accepte desormais trois valeurs :

```typescript
// Avant
export type ProjectMode = "staging_piece" | "video_visite";

// Apres
export type ProjectMode = "staging_piece" | "video_visite" | "social_reel";
```

### Usage

Le mode `social_reel` permet de generer une video verticale (1080x1920) optimisee pour TikTok, Instagram Reels et YouTube Shorts.

### Fichier modifie

`web/src/lib/types.ts` — ligne 69

---

## 6. SocialMontage — Composition Remotion verticale (P1)

### Nouveaux fichiers

#### `remotion/src/SocialMontage.tsx` (383 lignes)

Composition verticale **1080x1920** optimisee pour les reseaux sociaux :

| Composant | Duree | Description |
|-----------|-------|-------------|
| **HookScreen** | 1.5s (45 frames) | Texte hook bold centre ("Avant / Apres IA") sur fond image floutee avec zoom inverse (1.1→1.0). Spring animation sur le texte. |
| **SocialRoomSegment** | 1.3s (40 frames) | Sequence rapide par room : Avant (0.33s) → Video acceleree ×2.5 (0.77s) → Apres beauty shot (0.23s). Badges AVANT/APRES et label room. |
| **FlashCut** | 0.27s (8 frames) | Transition flash blanc entre les rooms (mix-blend: screen). Peak a 0.8 opacite. |
| **SocialOutro** | 1.5s (45 frames) | Branding VIMIMO avec spring animation + sous-titre "Virtual Staging IA". |

**Timeline pour 5 rooms :**
```
Hook(45f) + 5×Room(40f) + 4×Cut(8f) + Outro(45f) = 322 frames = 10.7s
```

**Effets visuels du SocialRoomSegment :**

```
Frame 0-10  : Photo AVANT avec Ken Burns (scale 1.0→1.08) + badge "AVANT"
Frame 10-12 : Crossfade vers video
Frame 12-35 : Video IA accele ×2.5 avec zoom subtil (1.0→1.04)
Frame 33-36 : Crossfade vers photo staged
Frame 34-40 : Beauty shot APRES (scale 1.06→1.0) + badge dore "APRES"
```

**Badges :**
- AVANT : fond noir 70%, blur(8px), border blanc 20%, letterspacing 3
- APRES : fond dore (rgba(200,164,90,0.8)), border or 50%, letterspacing 3
- Room label : glassmorphism (blanc 10%, blur 12px)

#### `remotion/src/social/timeline.ts` (39 lignes)

Constantes et fonctions de timing :

```typescript
SOCIAL_FPS = 30
SOCIAL_HOOK_FRAMES = 45          // 1.5s
SOCIAL_ROOM_FRAMES = 40          // 1.3s
SOCIAL_CUT_FRAMES = 8            // 0.27s
SOCIAL_OUTRO_FRAMES = 45         // 1.5s

calculateSocialDuration(N)       // hook + N×room + (N-1)×cut + outro
getSocialRoomStart(index)        // frame de debut d'une room
getSocialOutroStart(N)           // frame de debut de l'outro
```

---

## 7. Schema Zod SocialMontage

### Ajout dans `remotion/src/schemas.ts`

```typescript
socialRoomSchema = z.object({
  beforePhotoUrl: z.string().url(),
  stagedPhotoUrl: z.string().url(),
  videoUrl: z.string().url(),
  roomType: z.string(),
  roomLabel: z.string(),
});

socialMontageSchema = z.object({
  hookText: z.string().default("Avant / Apres IA"),
  rooms: z.array(socialRoomSchema).min(1).max(30),
  watermark: watermarkSchema.default({}),
  style: z.string().default("modern"),
});
```

**Difference avec StudioMontage :**
- Pas de `propertyInfo` (pas d'overlay prix/surface/agence)
- Pas de `musicUrl` (les reels ont leur propre musique dans l'app)
- Ajout de `hookText` (texte d'accroche personnalisable)
- `min(1)` au lieu de `min(2)` (fonctionne avec une seule room)

### Fichier modifie

`remotion/src/schemas.ts` — lignes 69-87

---

## 8. Enregistrement composition Root.tsx

### Ajout

Nouvelle composition `SocialMontage` enregistree avec :

```typescript
<Composition
  id="SocialMontage"
  component={SocialMontage}
  fps={30}
  width={1080}       // VERTICAL
  height={1920}      // VERTICAL
  durationInFrames={calculateSocialDuration(props.rooms.length)}
  schema={socialMontageSchema}
/>
```

**Compositions Remotion disponibles (4 au total) :**

| ID | Resolution | Usage | Min rooms |
|----|-----------|-------|-----------|
| VirtualStaging | 1920×1080 | v1 legacy (single room) | 1 |
| PropertyShowcase | 1920×1080 | staging_piece multi-room | 1 |
| StudioMontage | 1920×1080 | video_visite premium | 2 |
| **SocialMontage** | **1080×1920** | **social_reel TikTok/Reels** | **1** |

### Fichier modifie

`remotion/src/Root.tsx` — lignes 7-11 (imports) + 201-242 (composition)

---

## 9. Service `startSocialRender()`

### Ajout dans `web/src/lib/services/remotion.ts`

```typescript
export async function startSocialRender(project: Project): Promise<string>
```

- Filtre les rooms avec video et options
- Resout le watermark (vimimo/custom selon abonnement)
- Envoie `compositionId: "SocialMontage"` au serveur Remotion
- Props : `hookText`, `rooms`, `watermark`, `style`

### Fichier modifie

`web/src/lib/services/remotion.ts` — lignes 185-230

---

## 10. Routing `social_reel` dans auto-staging

### Modification du Step 6 "launch-render"

Le routing de rendu est maintenant :

```
if (mode === "social_reel" && rooms >= 1)
  → startSocialRender() → SocialMontage vertical

else if (rooms >= 2 && montageConfig)
  → startStudioRender() → StudioMontage horizontal

else if (rooms >= 2)
  → startRender() → PropertyShowcase horizontal

else
  → phase = "done" (videos individuelles deja disponibles)
```

### Fichier modifie

`web/src/lib/inngest/functions/auto-staging.ts` — lignes 326-383

---

## Tableau recapitulatif des couts

### Cout par projet (5 rooms, mode video_visite)

| Etape | Avant Sprint 1 | Apres Sprint 1 | Delta |
|-------|----------------|-----------------|-------|
| Cleaning (Flux Kontext Pro) | 5 × $0.05 = $0.25 | $0.25 | — |
| **Analyse GPT-4o Vision** | **$0.00** (pas d'analyse) | **$0.03** | +$0.03 |
| Staging prompts (GPT-4o) | 5 × $0.03 = $0.15 | $0.15 | — |
| Options staging (Flux) | 25 × $0.05 = $1.25 | $1.25 | — |
| Videos (Kling v2.1 Pro) | 5 × $0.50 = $2.50 | $2.50 | — |
| **Total** | **$4.15** | **$4.18** | **+$0.03** |

Le surcout de l'analyse Vision est negligeable (+0.7%) mais l'amelioration de qualite du staging est significative.

---

## Verification build

```
Next.js build  : OK (zero erreurs)
Remotion tsc   : OK (zero erreurs)
```

---

## Ce qui reste a faire (Sprint 2+)

| # | Tache | Priorite | Description |
|---|-------|----------|-------------|
| 1 | UI mode social_reel | P1 | Ajouter le choix "Reel Social" dans le formulaire de creation de projet |
| 2 | Deploy SocialMontage sur VPS | P1 | Rebuild Docker + redeploy remotion server avec la nouvelle composition |
| 3 | Prompt video TikTok | P2 | Adapter le prompt Kling pour des mouvements plus dynamiques (zoom rapide, travelling) |
| 4 | Musique integree social | P2 | Ajouter une option de musique courte (8-15s) optimisee pour les reels |
| 5 | Watermark adapte vertical | P2 | Adapter le watermark VIMIMO pour le format vertical (plus petit, coin) |
| 6 | Cleaning quality check | P2 | Verifier que le nettoyage IA n'a pas laisse de meubles residuels avant staging |
| 7 | A/B test cfg_scale | P3 | Tester 0.75 vs 0.80 vs 0.85 sur 10 projets pour trouver le sweet spot |
