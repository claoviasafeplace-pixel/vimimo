# AUDIT COMPLET — Pipeline IA VIMIMO

**Date** : 25 fevrier 2026
**Version** : v2.1 (Inngest + Remotion VPS)
**Auditeur** : Claude Code (Opus 4.6)

---

## Table des matieres

1. [Vue d'ensemble du pipeline](#1-vue-densemble-du-pipeline)
2. [Nettoyage IA (suppression mobilier)](#2-nettoyage-ia-suppression-mobilier)
3. [Staging IA (decoration virtuelle)](#3-staging-ia-decoration-virtuelle)
4. [Generation video (Kling v2.1 Pro)](#4-generation-video-kling-v21-pro)
5. [Montage Remotion (compilation finale)](#5-montage-remotion-compilation-finale)
6. [Architecture technique](#6-architecture-technique)
7. [Analyse des couts](#7-analyse-des-couts)
8. [Bugs et problemes identifies](#8-bugs-et-problemes-identifies)
9. [Plan d'action prioritaire](#9-plan-daction-prioritaire)

---

## 1. Vue d'ensemble du pipeline

```
Upload photos
    |
    v
[1. NETTOYAGE] Flux Kontext Pro — suppression meubles/deco
    |
    v
[2. ANALYSE] GPT-4o Vision — inventaire structural + triage
    |
    v
[3. STAGING] GPT-4o (5 prompts) + Flux Kontext Pro (5 images/piece)
    |
    v
[4. SELECTION] Auto-selection option 0 ou choix utilisateur
    |
    v
[5. VIDEO] Kling v2.1 Pro — transition before/after (5s/piece)
    |
    v
[6. MONTAGE] Remotion — PropertyShowcase ou StudioMontage
    |
    v
[7. LIVRAISON] Video finale + videos individuelles + descriptions IA
```

**Modes disponibles** :
- `staging_piece` : staging par piece, montage PropertyShowcase
- `video_visite` : visite immobiliere, montage StudioMontage

---

## 2. Nettoyage IA (suppression mobilier)

### Specifications

| Parametre | Valeur |
|-----------|--------|
| Modele | `black-forest-labs/flux-kontext-pro` |
| Cout | $0.05 / image |
| Format sortie | JPEG |
| Aspect ratio | `match_input_image` |
| Safety tolerance | 2 (maximum) |
| Seed | Aleatoire (0-999999) |
| Retry | 2 retries (3 tentatives), backoff 1-3s |
| Timeout polling | 60 tentatives x 5s = 5 min max |

### Prompt de nettoyage

**Fichier** : `web/src/lib/prompts.ts` (lignes 1-2)

```
Edit this exact photo, keep camera angle, perspective, and structure 100% identical:
Remove ALL movable furniture, beds, sofas, tables, chairs, boxes, clothes, clutter,
and decorations. Keep ONLY the bare room structure: walls, floor texture and material
unchanged, ceiling, windows, doors, radiators, electrical outlets, light switches,
ceiling lights, built-in closets, and all fixed architectural elements. The room must
appear completely empty but structurally identical. Photorealistic, exact room
proportions, exact floor material, no distortion, camera locked.
```

**Suffixe qualite** :
```
Ultra-photorealistic, shot on Canon EOS R5,
exact room geometry preserved, all architectural elements pixel-perfect,
consistent lighting and shadows, 8K resolution, no artifacts.
```

### Flux du nettoyage

```
web/src/app/api/project/route.ts (lignes 75-89)
  -> cleanPhoto() pour chaque photo en parallele (Promise.all)
  -> Sauvegarde prediction IDs

web/src/lib/inngest/functions/cleaning-poll.ts (lignes 33-104)
  -> Pre-check services (OpenAI + Replicate)
  -> Polling 5s pendant max 5 min
  -> Succes : photo.cleanedUrl = output Replicate
  -> Echec : photo.cleanedUrl = photo.originalUrl (fallback silencieux)
```

### Evaluation qualite : 6/10

**Points forts** :
- Prompt couvre bien les elements a conserver (prises, radiateurs, interrupteurs)
- Fallback automatique si le nettoyage echoue
- Circuit breaker + retry integres

**Points faibles** :

| Probleme | Severite | Detail |
|----------|----------|--------|
| Format JPEG | Moyenne | Compression avec perte, degrade les details fins utiles au staging. WebP ou PNG serait preferable. |
| Seed aleatoire | Faible | Meme photo uploadee 2 fois = 2 resultats differents. Seed deterministe (hash de l'URL) serait plus fiable. |
| Prompt unique pour toutes les pieces | Moyenne | Une cuisine a des elements fixes specifiques (plan de travail, credence, electromenager encastre) qu'un salon n'a pas. Prompts specialises par type de piece amelioreraient la precision. |
| Aucune validation qualite | Haute | Si le nettoyage echoue partiellement (meubles encore visibles), le pipeline continue silencieusement. Pas de verification que les meubles ont bien ete supprimes. |
| Pas de prompt negatif | Moyenne | Contrairement a Kling qui a KLING_NEGATIVE_PROMPT, Flux n'a aucun token anti-artefact dedie. |
| Timeout silencieux | Moyenne | Si Replicate depasse 5 min, fallback vers la photo originale sans aucun log ni alerte. |

---

## 3. Staging IA (decoration virtuelle)

### Architecture en 2 etapes

**Etape A — Analyse et generation de prompts (GPT-4o Vision)**

| Parametre | Valeur |
|-----------|--------|
| Modele | GPT-4o (vision) |
| Temperature | 0.5 |
| Max tokens | 2000 |
| Cout | $0.03 / appel |
| Retry | 3 retries, backoff 2-8s |
| Sortie | JSON : `{ analysis, prompts[5] }` |

**Etape B — Generation d'images (Flux Kontext Pro)**

| Parametre | Valeur |
|-----------|--------|
| Modele | `black-forest-labs/flux-kontext-pro` |
| Cout | $0.05 / image (x5 = $0.25/piece) |
| Aspect ratio | `match_input_image` |
| Format | JPEG |
| Seed | Aleatoire |
| Parallelisation | 5 images en parallele par piece, batch de 3 pieces |

### Prompts de staging

**Fichier** : `web/src/lib/prompts.ts` (lignes 27-75)

#### System prompt GPT-4o (resume)

Le system prompt definit un decorateur expert niveau Architectural Digest avec :
- Exemples concrets BAD vs GOOD (niveau de detail attendu)
- 10 regles anti-distortion (ne jamais decrire la structure)
- 5 variantes obligatoires par piece :
  1. **SIGNATURE** — hero shot, staging complet
  2. **ALTERNATIVE** — layout different, meme richesse
  3. **EDITORIAL** — densite deco maximale, gallery wall
  4. **WARM & LIVABLE** — cozy premium, textiles chaleureux
  5. **SHOWROOM LUXE** — ultra-premium, marbre/laiton/velours

#### Checklist obligatoire par prompt

```
- Mobilier principal (materiau/couleur/texture)
- Tapis (materiau/couleur/motif)
- 2 sources d'eclairage (descriptions materiaux)
- Art mural (cadre + sujet)
- Au moins 1 plante (espece + pot)
- Objets deco sur chaque surface (livres, bougies, vases)
- Textiles (plaids + coussins + rideaux)
- Chaque objet : materiau + couleur + texture
```

#### Suffixe qualite (ajoute a CHAQUE prompt Flux)

```
Ultra-photorealistic interior photography, shot on Canon EOS R5 with 16-35mm f/2.8 lens,
natural window light mixed with warm interior lighting,
8K resolution, architectural magazine quality, Architectural Digest editorial,
exact room geometry preserved, walls plumb, floor plane undistorted,
all doors, windows, radiators, outlets, light switches, and fixed elements pixel-perfect unchanged,
correct perspective, no lens warping, no floating objects, physically plausible furniture placement,
consistent shadows matching existing light direction, subtle ambient occlusion under furniture.
```

### Styles disponibles

| ID | Label | Esthetique | Marques/References |
|----|-------|------------|-------------------|
| `scandinavian` | Scandinave | Bois clair, tons neutres, design epure | Hay, Muuto, &Tradition |
| `industrial` | Industriel | Metal brut, cuir vieilli, esprit loft | Restoration Hardware, BDDW |
| `modern_minimalist` | Moderne Minimaliste | Lignes pures, less is more | B&B Italia, Minotti |
| `classic_french` | Classique Francais | Moulures, velours, or | Pierre Frey |
| `bohemian` | Boheme | Textures riches, couleurs chaudes | Anthropologie, Justina Blakeney |

Chaque style a un guide detaille (8-10 lignes) couvrant : mobilier, canape, textiles, tapis, eclairage, decoration, plantes, art, palette de couleurs.

**Fichier** : `web/src/lib/prompts.ts` (lignes 77-132)

### Evaluation qualite : 7/10

**Points forts** :
- Prompts extremement detailles avec exemples concrets
- 5 variantes distinctes par piece couvrant differents gouts
- Guides de style complets et references de marques reelles
- Anti-distortion rules bien documentees
- Quality suffix avec Canon EOS R5 + Architectural Digest

**Points faibles** :

| Probleme | Severite | Detail |
|----------|----------|--------|
| **visionData toujours vide** | **CRITIQUE** | Dans `auto-staging.ts:99`, `visionData` est initialise a `{}`. GPT-4o ne recoit AUCUNE information sur la piece (sol, plafond, fenetres, materiaux). Le staging est donc generique au lieu d'etre adapte. |
| Pas de guidance_scale | Moyenne | Flux Kontext Pro ne recoit aucun parametre de force d'adherence au prompt. La qualite depend entierement du texte. |
| Pas de prompt negatif Flux | Moyenne | Kling a un negative prompt detaille, mais Flux staging n'en a pas. Risque d'artefacts non controles. |
| Selection automatique option 0 | Faible | Le pipeline auto-selectionne la premiere option terminee, pas la meilleure visuellement. |
| Format JPEG | Faible | Meme probleme que le nettoyage — compression avec perte. |

---

## 4. Generation video (Kling v2.1 Pro)

### Specifications

| Parametre | Valeur |
|-----------|--------|
| Modele | `kwaivgi/kling-v2.1` |
| Mode | `pro` (qualite maximale) |
| Duree | 5 secondes |
| cfg_scale | 0.7 |
| Cout | $0.50 / video |
| Input | `start_image` (before) + `end_image` (staged) |
| Retry | 2 retries, backoff 1-3s |
| Timeout polling | 180 tentatives x 5s = 15 min max |

### Prompt video

**Fichier** : `web/src/lib/prompts.ts` (lignes 165-203)

**Structure du prompt** :
```
[CAMERA] + [TRANSITION] + [RIGIDITE STRUCTURELLE] + [QUALITE]
```

**Partie 1 — Camera** :
```
Ultra slow smooth cinematic dolly-in,
locked tripod-mounted camera with imperceptible forward glide,
professional real estate walkthrough cinematography,
no handheld shake, no fast pan, no whip movement, no rotation,
camera height fixed at eye level throughout entire sequence.
```

**Partie 2 — Transition** :
```
Seamless transition from empty {roomType} to beautifully furnished {style} {roomType}.
```

**Partie 3 — Rigidite** :
```
Room structure, walls, floor, ceiling, windows, and doors remain PERFECTLY IDENTICAL
in every frame. Furniture appears gradually and naturally, already in final position
— no sliding, no floating.
```

**Partie 4 — Qualite** :
```
8K photorealistic professional real estate video,
strict temporal consistency, frame-to-frame coherence,
no morphing, no melting, no warping, no object flickering,
all furniture physically stable and stationary throughout,
walls, floor, windows, doors structurally rigid in every frame,
natural indoor lighting with consistent shadows, no light flickering,
Architectural Digest cinematic quality, 24fps smooth motion.
```

### Prompt negatif

**Fichier** : `web/src/lib/prompts.ts` (lignes 205-214)

8 categories anti-artefacts :
1. Flou/qualite : blurry, out of focus, low quality, grainy
2. Deformation structure : warped walls, warped floor, bent doorframes
3. Distortion piece : changed room proportions, room shape shift
4. Physique meubles : furniture sliding, floating, morphing, melting
5. Mouvement camera : fast movement, shaky, handheld, whip pan
6. Perspective : perspective shift, fisheye distortion, lens flare
7. Eclairage : flickering lights, inconsistent shadows
8. Elements parasites : text, watermark, logo, signature

### Evaluation qualite : 7/10

**Points forts** :
- Prompt camera tres specifique (dolly-in lent, tripod)
- Negative prompt complet et structure
- Tokens anti-morphing forts (temporal consistency, frame-to-frame coherence)
- Mode `pro` pour la meilleure qualite Kling

**Points faibles** :

| Probleme | Severite | Detail |
|----------|----------|--------|
| **cfg_scale 0.7 trop bas** | **Haute** | Moins d'adherence au prompt = plus de morphing et distortion. 0.8-0.9 recommande pour la stabilite structurelle. |
| Duree fixe 5s | Faible | Non adaptable selon la piece. Un grand salon peut necessiter plus de temps de transition. |
| Video compressee dans le timeline | Moyenne | Kling produit 5s mais Remotion n'utilise que ~3.67s (116 frames a 30fps). Perte de contenu. |
| Parallelisation excessive | Haute | 6 videos lancees en parallele depassent le quota Replicate (burst limit). Rooms 3-5 echouent systematiquement en 429. |
| Pas de controle resolution | Faible | Resolution de sortie Kling non specifiee — depend du mode pro par defaut. |

---

## 5. Montage Remotion (compilation finale)

### 5.1 PropertyShowcase (mode staging_piece)

**Fichier** : `remotion/src/PropertyShowcase.tsx`

| Parametre | Valeur |
|-----------|--------|
| FPS | 30 |
| Resolution | 1920x1080 |
| Duree | Dynamique : `90 + N*210 - (N-1)*20 + 90` frames |
| Exemple 3 pieces | 770 frames = 25.7s |

**Timeline par piece (210 frames = 7s)** :

```
[0-42 frames]    Phase 1 : Photo AVANT + Ken Burns zoom (1.0->1.04)
                 Badge "AVANT" avec spring animation
[37-72 frames]   Phase 2 : SplitReveal (wipe vertical gauche->droite)
                 Ligne blanche 3px avec ombre
[67-182 frames]  Phase 3 : Video Kling (playback 1x)
                 Crossfade avec SplitReveal
[177-210 frames] Phase 4 : Photo APRES + badge "APRES"
                 RoomLabel (nom de la piece)
```

**Composants** :
- `IntroCard` : Titre propriete + adresse + prix, spring animations echelonnees
- `RoomSegment` : 4 phases before/wipe/video/beauty
- `SplitReveal` : Wipe vertical (clipPath CSS)
- `RoomLabel` : Label piece en bas-gauche, fond semi-transparent avec blur
- `OutroCard` : Logo VIMIMO ou agence, fade to black
- `CinematicOverlay` : Letterbox (4.5%) + vignette radiale

**Transitions entre pieces** : Crossfade simple (20 frames d'overlap opacity)

**Audio** : Musique optionnelle, fade-in 30fr, fade-out 60fr, volume max 80%

**Note qualite** : 7.5/10 — Propre et professionnel mais transitions basiques.

---

### 5.2 StudioMontage (mode video_visite)

**Fichier** : `remotion/src/StudioMontage.tsx`

| Parametre | Valeur |
|-----------|--------|
| FPS | 30 |
| Resolution | 1920x1080 |
| Duree | Dynamique : `120 + N*150 + (N-1)*40 + 90` frames |
| Exemple 3 pieces | 740 frames = 24.7s |

**Timeline par piece (150 frames = 5s)** :

```
[0-35 frames]    Phase A : Photo AVANT + parallax + Ken Burns (1.0->1.06)
                 Badge "AVANT" avec entree 3D (rotateY)
[35-65 frames]   Phase B : Reveal diagonal avec profondeur 3D
                 Ligne doree lumineuse (glow 20px)
                 Light leak pulse au point median
[58-135 frames]  Phase C : Video Kling + label glass-morphism
                 Zoom subtil (1.0->1.03)
                 Label : blur 12px + fond blanc 10%
[128-150 frames] Phase D : Beauty shot avec mouvement subtil
                 Zoom-out (1.03->1.0) + pan horizontal
                 Badge "APRES" dore avec inner glow
```

**4 transitions premium (cycliques)** :

| Transition | Duree | Effet |
|------------|-------|-------|
| ZoomThrough | 40 frames | Zoom extreme (1->8x) + flash blanc 60% + zoom inverse |
| CubeRotation | 40 frames | Rotation 3D cube (perspective 1200px, rotateY 90deg) |
| ParallaxSlide | 40 frames | Slide horizontal a vitesses differentes + blur central |
| WhipPan | 40 frames | Pan rapide + motion blur 20px + stretch horizontal |

**4 overlays cinematiques** :

| Overlay | Effet |
|---------|-------|
| FilmGrain | Bruit fractal Perlin (SVG), 4% opacite, blend overlay |
| LightLeak | Gradient radial orange dore, oscillation sinusoidale, blend screen |
| CinematicBars | Letterbox dynamique (12%->5.5% intro, 5.5%->12% outro) |
| ParticleField | 25 particules dorees flottantes, visibles intro/outro uniquement |

**Intro StudioIntro** (120 frames = 4s) :
- Reveal mot par mot 3D (rotateX + translateZ 150-200px)
- Spring physics : damping 14, stiffness 120
- Badges info (ville, quartier, prix, surface, pieces)
- Highlight pills dores pour les amenites
- Preview floutee de la premiere piece (30% opacite)

**Outro StudioOutro** (90 frames = 3s) :
- Reveal lettre par lettre 3D de "VIMIMO" (rotateY 90deg->0, 4 frames/lettre)
- Ligne separatrice doree animee (0->200px)
- Credit "Video generee par VIMIMO"
- Fade to black sur les 20 derniers frames

**Note qualite** : 9/10 — Tres cinematique, transitions premium, overlays professionnels.

---

### 5.3 Comparaison des compositions

| Aspect | PropertyShowcase | StudioMontage |
|--------|-----------------|---------------|
| Duree/piece | 7s | 5s |
| Transitions | Crossfade simple | 4 transitions 3D |
| Effets visuels | Letterbox + vignette | Grain + light leaks + particules + letterbox |
| Animations texte | Spring basique | 3D perspective + rotation |
| Badges | Spring slide-down | 3D rotateY + glow dore |
| Labels | Fond semi-transparent | Glass-morphism (blur + transparence) |
| Intro | Titre + adresse | Mot par mot 3D + badges info + preview |
| Outro | Logo simple | Lettre par lettre 3D + ligne doree |
| Sensation globale | Propre, professionnel | Premium, cinematique, luxe |

---

### 5.4 VirtualStaging v1 (composition originale)

**Fichier** : `remotion/src/Composition.tsx`

| Parametre | Valeur |
|-----------|--------|
| Duree | 10s fixe (300 frames a 30fps) |
| Resolution | 1920x1080 |
| Usage | 1 seule piece |

**Speed ramp** :
- Intro (0-60fr) : 2x speed
- Staging (60-240fr) : 0.5x speed (slowmo cinematique)
- Outro (240-300fr) : 2x speed

**Effets** : crossfades avec blur gaussien, zoom progressif (1.0->1.08), flash de 5 images de transformation, letterbox + vignette.

Non utilise dans le pipeline actuel (remplace par PropertyShowcase/StudioMontage).

---

## 6. Architecture technique

### Pipeline Inngest

**Fichier** : `web/src/lib/inngest/functions/auto-staging.ts`

| Step | Fonction | Max polling | Description |
|------|----------|-------------|-------------|
| 0 | pre-check | - | Verifie OpenAI, Replicate, Remotion |
| 1 | build-rooms | - | Cree les rooms depuis les photos confirmees |
| 2 | launch-staging | - | GPT-4o prompts + 5 Flux/piece (batch 3) |
| 3 | check-staging | 120 x 5s = 10 min | Poll predictions staging |
| 4 | launch-videos | - | Kling v2.1 Pro pour chaque piece |
| 5 | check-auto-videos | 180 x 5s = 15 min | Poll predictions video |
| 6 | launch-render | - | Remotion PropertyShowcase ou StudioMontage |
| 7 | check-render | 120 x 5s = 10 min | Poll render Remotion |

### Circuit Breaker

**Fichier** : `web/src/lib/circuit-breaker.ts`

| Service | Seuil | Cooldown | Health probe |
|---------|-------|----------|-------------|
| openai | 5 echecs | 5 min | API models list |
| replicate | 5 echecs | 5 min | API predictions list |
| replicate_video | 5 echecs | 5 min | API predictions list |
| remotion | 5 echecs | 5 min | GET /health |
| supabase | 5 echecs | 5 min | DB query |

### Retry

**Fichier** : `web/src/lib/retry.ts`

| Profil | Max retries | Base delay | Max delay | Codes retryables |
|--------|-------------|-----------|-----------|-----------------|
| OPENAI_RETRY | 3 | 2000ms | 8000ms | 429, 500, 502, 503 |
| REPLICATE_RETRY | 2 | 1000ms | 3000ms | 429, 500, 502, 503 |
| REMOTION_RETRY | 3 | 5000ms | 20000ms | 429, 500, 502, 503 |

### Persistance

| Donnee | Stockage | Duree de vie |
|--------|----------|-------------|
| Projet (JSONB) | Supabase PostgreSQL | Permanent |
| Photos originales | Supabase Storage (bucket `photos`) | Permanent |
| Images staging | Supabase Storage (`staging/`) | Permanent (depuis correction) |
| Videos Kling | Supabase Storage (`videos/`) | Permanent (depuis correction) |
| Video montage | Supabase Storage (`montages/`) | Permanent (depuis correction) |
| URLs Replicate | Temporaire (~1h) | Expirent — DOIVENT etre persistees |

### Watermark

**Fichier** : `web/src/lib/services/remotion.ts` (lignes 13-21)

| Plan | Type watermark | Detail |
|------|---------------|--------|
| Guest / Pack | `vimimo` | Logo VIMIMO dans l'outro |
| Starter | `vimimo` | Logo VIMIMO dans l'outro |
| Pro | `custom` | Logo agence (marque blanche) |
| Agency | `custom` | Logo agence (marque blanche) |

---

## 7. Analyse des couts

### Cout par piece

| Operation | Cout unitaire | Quantite | Total |
|-----------|-------------|----------|-------|
| Nettoyage (Flux) | $0.05 | 1 | $0.05 |
| Analyse (GPT-4o Vision) | $0.03 | 1 | $0.03 |
| Staging (Flux x5) | $0.05 | 5 | $0.25 |
| Video (Kling Pro) | $0.50 | 1 | $0.50 |
| **Total par piece** | | | **$0.83** |

### Cout par projet (exemples)

| Scenario | Pieces | Cout IA | Cout Remotion | Total |
|----------|--------|---------|---------------|-------|
| Studio 1 piece | 1 | $0.83 | $0 (pas de montage) | $0.83 |
| Appartement 3 pieces | 3 | $2.49 | ~$0.01 (VPS) | $2.50 |
| Maison 6 pieces | 6 | $4.98 | ~$0.01 | $4.99 |
| Villa 10 pieces | 10 | $8.30 | ~$0.01 | $8.31 |

**Seuil de cout** : $3.00 par defaut (`COST_THRESHOLD_USD`). Un projet de 4+ pieces depasse ce seuil.

### Marge commerciale

| Offre | Prix HT | Cout IA (3 pieces) | Marge |
|-------|---------|-------------------|-------|
| Pack 1 credit | 49.00 EUR | ~$2.50 | ~95% |
| Pack 3 credits | 99.00 EUR | ~$7.50 | ~92% |
| Starter 5/mois | 29.00 EUR/mois | ~$12.50 | ~57% |
| Pro 15/mois | 79.00 EUR/mois | ~$37.50 | ~53% |
| Agency 50/mois | 199.00 EUR/mois | ~$125.00 | ~37% |

---

## 8. Bugs et problemes identifies

### P0 — Critiques (impact direct sur la qualite)

#### 8.1 visionData toujours vide

**Fichier** : `web/src/lib/inngest/functions/auto-staging.ts` (ligne 99)

```typescript
visionData: {},  // TOUJOURS VIDE
```

**Impact** : GPT-4o ne recoit AUCUNE information sur la piece quand il genere les 5 prompts de staging. Le `STRUCTURAL INVENTORY` envoye est `{}`. GPT ne connait donc pas :
- Le type de sol (parquet chene, carrelage, moquette)
- La hauteur sous plafond
- Le nombre et la position des fenetres
- La direction de la lumiere naturelle
- Les materiaux existants des murs

**Consequence** : Le staging est generique au lieu d'etre adapte a la piece. Un salon avec parquet fonce peut recevoir un staging avec des meubles clairs qui jurent, ou des meubles places devant des fenetres que GPT ne "voit" pas dans l'inventaire.

**Correction** : Remplir `visionData` avec le resultat de l'analyse GPT-4o Vision (batch_vision ou triage) avant de lancer le staging.

---

#### 8.2 cfg_scale Kling trop bas

**Fichier** : `web/src/lib/services/replicate.ts` (ligne 136)

```typescript
cfg_scale: 0.7
```

**Impact** : Un cfg_scale de 0.7 donne trop de liberte creative au modele. Le prompt de camera (dolly-in lent, pas de rotation) est moins respecte. Resultat : morphing des murs, meubles qui glissent, changements de perspective.

**Correction** : Monter a `0.8` ou `0.85` pour une meilleure adherence au prompt tout en gardant de la naturalite.

---

#### 8.3 Parallelisation video excessive

**Fichier** : `web/src/lib/inngest/functions/auto-staging.ts` (lignes 220-234)

Toutes les videos sont lancees en parallele (`Promise.allSettled`). Avec 6 pieces, ca envoie 6 requetes simultanees a Replicate. Avec un credit < $5, le burst limit est de 1 requete, ce qui cause des 429 sur les rooms 3-5.

**Consequence** : 50% des pieces n'ont pas de video.

**Correction** : Sequentialiser ou limiter a 2-3 videos simultanees max.

---

### P1 — Importants (impact sur l'experience)

#### 8.4 PropertyShowcase utilise par defaut au lieu de StudioMontage

**Fichier** : `web/src/lib/inngest/functions/auto-staging.ts` (lignes 279-293)

Quand il n'y a pas de `montageConfig` (mode `staging_piece`), c'est PropertyShowcase qui est lance — transitions crossfade basiques au lieu des transitions 3D premium de StudioMontage.

**Correction** : Generer un `montageConfig` par defaut pour utiliser StudioMontage.

---

#### 8.5 Musique non configuree

Les URLs de musique dans `remotion.ts` pointent vers Supabase Storage (`assets/music/`) mais aucun fichier audio n'a ete uploade dans ce bucket.

**Consequence** : Montage sans musique = beaucoup moins impactant.

**Correction** : Uploader 4 tracks royalty-free (elegant, energetic, minimal, dramatic) dans Supabase.

---

#### 8.6 Seuil de cout trop bas

`COST_THRESHOLD_USD = $3.00` est insuffisant pour un projet de 4+ pieces ($3.32 pour 4 pieces). Le pipeline s'auto-bloque.

**Correction** : Monter a $10.00 ou calculer dynamiquement selon le nombre de pieces.

---

### P2 — Ameliorations qualite

| # | Probleme | Fichier | Correction |
|---|----------|---------|------------|
| 8.7 | Format JPEG pour cleaning + staging | `replicate.ts` | Passer a `webp` (meilleure qualite, taille similaire) |
| 8.8 | Pas de text shadow sur les labels Remotion | `RoomLabel.tsx` | Ajouter `textShadow: '0 2px 4px rgba(0,0,0,0.8)'` |
| 8.9 | Ken Burns inconsistant (1.04 vs 1.06) | PropertyShowcase / StudioMontage | Unifier a 1.05 |
| 8.10 | Video 5s compressee en 3.67s | `RoomSegment.tsx` | Ajuster la timeline pour utiliser les 5s completes |
| 8.11 | Pas de color grading | Compositions Remotion | Ajouter un filtre CSS (warm tones, contrast +5%) |

### P3 — Nice to have

| # | Amelioration | Detail |
|---|-------------|--------|
| 8.12 | Seed deterministe pour cleaning | Hash MD5 de l'URL photo comme seed |
| 8.13 | Prompts nettoyage par type de piece | Variantes cuisine/salon/chambre/sdb |
| 8.14 | Validation qualite post-nettoyage | GPT-4o mini pour verifier que les meubles sont bien supprimes |
| 8.15 | Synchronisation musique/transitions | Detecter le BPM et caler les transitions sur les beats |
| 8.16 | Color LUT cinematique | Appliquer un LUT (Kodak, Fuji) pour un look film |
| 8.17 | Profondeur de champ simulee | Blur leger foreground/background pour un look camera pro |

---

## 9. Plan d'action prioritaire

### Sprint 1 — Corrections critiques (impact immediat)

| # | Action | Fichier(s) | Effort |
|---|--------|-----------|--------|
| 1 | Remplir `visionData` avec l'analyse GPT-4o | `auto-staging.ts`, `cleaning-poll.ts` | 2h |
| 2 | Monter `cfg_scale` a 0.8 | `replicate.ts` | 5min |
| 3 | Sequentialiser les videos (max 2 en parallele) | `auto-staging.ts` | 30min |
| 4 | Monter `COST_THRESHOLD_USD` a 10 | `.env` / Vercel | 5min |

### Sprint 2 — Amelioration montage

| # | Action | Fichier(s) | Effort |
|---|--------|-----------|--------|
| 5 | Utiliser StudioMontage par defaut | `auto-staging.ts` | 1h |
| 6 | Uploader 4 tracks musique | Supabase Storage | 30min |
| 7 | Format `webp` au lieu de `jpg` | `replicate.ts` | 10min |
| 8 | Text shadow + lisibilite labels | Composants Remotion | 30min |
| 9 | Utiliser les 5s completes de video | `RoomSegment.tsx` | 1h |

### Sprint 3 — Polish cinematique

| # | Action | Fichier(s) | Effort |
|---|--------|-----------|--------|
| 10 | Color grading warm tones | Compositions Remotion | 1h |
| 11 | Ken Burns unifie (1.05) | Compositions Remotion | 15min |
| 12 | Seed deterministe cleaning | `replicate.ts` | 15min |
| 13 | Prompts cleaning par type de piece | `prompts.ts` | 1h |
| 14 | Validation qualite post-cleaning | `cleaning-poll.ts`, `openai.ts` | 2h |

---

## Fichiers cles references

| Fichier | Role |
|---------|------|
| `web/src/lib/prompts.ts` | Tous les prompts IA (cleaning, staging, video, descriptions) |
| `web/src/lib/services/replicate.ts` | API Replicate (Flux cleaning, Flux staging, Kling video) |
| `web/src/lib/services/openai.ts` | API OpenAI (analyse vision, prompts staging, descriptions) |
| `web/src/lib/services/remotion.ts` | Communication avec le serveur Remotion VPS |
| `web/src/lib/services/storage.ts` | Upload/persistance Supabase Storage |
| `web/src/lib/inngest/functions/auto-staging.ts` | Pipeline principal (7 steps) |
| `web/src/lib/inngest/functions/cleaning-poll.ts` | Polling nettoyage + analyse |
| `web/src/lib/inngest/functions/videos.ts` | Polling videos (standalone) |
| `web/src/lib/inngest/functions/montage.ts` | Polling montage Remotion |
| `web/src/lib/circuit-breaker.ts` | Circuit breaker + cost guard + health checks |
| `web/src/lib/retry.ts` | Retry avec backoff exponentiel |
| `web/src/lib/types.ts` | Types Project, Room, styles, plans, packs |
| `remotion/src/PropertyShowcase.tsx` | Composition multi-room basique |
| `remotion/src/StudioMontage.tsx` | Composition premium avec transitions 3D |
| `remotion/src/Composition.tsx` | Composition v1 single room (legacy) |
| `remotion/src/studio/` | Composants StudioMontage (intro, room, outro, transitions, overlays) |
| `remotion/src/components/` | Composants PropertyShowcase |
| `remotion/src/schemas.ts` | Schemas Zod pour les props des compositions |
| `remotion/server/index.ts` | Serveur Express de rendu (VPS) |
