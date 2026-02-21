# VIMIMO v2.2 — Audit Technique Complet

*Derniere mise a jour : 20 fevrier 2026*

---

## 1. Objectif du Projet

**VIMIMO** (Virtual Imaging for Immobilier) est un pipeline de **Virtual Staging IA** entierement automatise, accessible via un bot Telegram.

**Principe** : L'utilisateur envoie des photos de pieces (vides ou meublees) → l'IA nettoie les meubles existants → genere des propositions de decoration → l'utilisateur choisit ses preferes → le systeme produit des videos avant/apres cinematiques.

**Cas d'usage** : Agents immobiliers, promoteurs, decorateurs d'interieur qui veulent montrer le potentiel d'un bien sans meubler physiquement.

**Pipeline simplifie** :
```
Photos pieces → Nettoyage IA (suppression meubles) → Analyse GPT-4o → 5 options staging Flux →
Selection utilisateur → Videos Kling → Montage Remotion (AVANT/APRES) → Video finale Telegram
```

---

## 2. Stack Technique

| Composant | Technologie | Role |
|-----------|------------|------|
| Orchestration | **n8n** (self-hosted) | Workflow automation, state machine |
| Interface utilisateur | **Telegram Bot** | Envoi photos, selection inline, reception videos |
| Analyse de scene | **GPT-4o Vision** (OpenAI) | Identification pieces, inventaire structurel, generation prompts |
| Nettoyage photos | **Flux Kontext Pro** (Replicate) | Suppression meubles existants, preservation structure |
| Staging IA | **Flux Kontext Pro** (Replicate) | Generation 5 options d'ameublement par piece |
| Generation video | **Kling v2.1 Pro** (Replicate) | Video morphing original → stage |
| Montage video | **Remotion** (Node.js/React) | Composition multi-pieces avec AVANT/APRES |
| Hebergement | **VPS Hostinger** | n8n + Remotion server (Docker) |

---

## 3. Infrastructure

```
                    Internet
                       |
        +--------------+--------------+
        |                             |
   Telegram API                  Replicate API
   (webhook)                     (Flux/Kling)
        |                             |
        v                             v
+-------+--------+         +---------+---------+
|  n8n Instance   |-------->| OpenAI API        |
|  (VPS Docker)   |         | (GPT-4o Vision)   |
+-------+--------+         +-------------------+
        |
        | http://172.18.0.1:8000
        v
+-------+--------+
| Remotion Server |
| (Docker, :8000) |
+-----------------+
```

- **n8n** : `https://n8n.srv1129073.hstgr.cloud`
- **Workflow ID** : `ZlSOfh3wPav4DGPE`
- **Bot Telegram** : `@VIMIMO_bot` (ID: 8120972729)
- **User Telegram** : chat_id `559474177` (@madein4501)
- **Remotion server** : `http://172.18.0.1:8000` (reseau Docker interne)
- **Remotion source** : `/opt/vimimo-render/` (VPS)
- **Webhook Telegram** : `max_connections=1` (anti race-condition)

---

## 4. Flow Utilisateur Complet

### Phase 1 — Collecte (AccumulatePhoto + SaveStyleChoice)
1. L'utilisateur envoie 1 a N photos (individuelles ou album Telegram)
2. Chaque photo est stockee dans `staticData[photo_{chatId}_{fileId}]`
3. Un clavier de styles apparait : Scandinave, Industriel, Moderne, Classique, Boheme
4. L'utilisateur choisit un style → sauvegarde dans `staticData[style_{chatId}]`
5. L'utilisateur tape `/go` (ou auto-demarrage si album + style deja choisi)

### Phase 2 — Preparation (StartProcessing → CleanPhotos → BatchVision → InitializeSession)
6. Validation : photos presentes + style selectionne + pas de session active
7. Telechargement de toutes les photos via Telegram `getFile` API
8. **CleanPhotos** : Flux Kontext Pro supprime les meubles existants (lits, canapes, tables, chaises, cartons, vetements). Conserve : murs, sols, plafonds, fenetres, portes, radiateurs, prises electriques, placards encastres. Stocke l'URL originale (avec meubles) dans `originalUrl` pour le rendu AVANT/APRES.
9. **BatchVisionAnalysis** : GPT-4o analyse toutes les photos nettoyees en batch → JSON structurel (type de piece, dimensions, materiaux, eclairage, angle camera)
10. **InitializeSession** : Creation de la session dans `staticData` avec phase `selecting`. Stocke `beforePhotoUrl` (photo originale avec meubles) et `photoUrl` (photo nettoyee).

### Phase 3 — Selection Interactive (GenerateRoomOptions + HandleCallbackQuery)
11. Pour chaque piece (en commencant par la premiere) :
    - Envoi de la photo nettoyee sur Telegram
    - GPT-4o genere 5 prompts editing avec regles anti-distortion + structuralInventory
    - 5 appels Flux Kontext Pro (staging IA)
    - Les 5 options sont envoyees comme photos sur Telegram
    - Un clavier inline apparait : [1] [2] [3] [4] [5] + [Nouvelles options]
12. L'utilisateur choisit une option (ou regenere, max 3 fois par piece)
13. Passage a la piece suivante → meme processus
14. Quand toutes les pieces sont selectionnees → lancement pipeline video

### Phase 4 — Videos (HandleCallbackQuery — partie video)
15. Galerie des photos stagees envoyee sur Telegram
16. Pour chaque piece :
    - Kling v2.1 Pro : video morphing (photo nettoyee → photo stagee, 5s)
    - Telechargement + envoi individuel de la video sur Telegram
17. **Remotion** : montage final avec AVANT (photo originale avec meubles) → wipe → video → APRES (photo stagee)
18. Envoi de la video finale montee sur Telegram
19. Nettoyage de la session

---

## 5. Architecture du Workflow n8n

### 5.1 Schema des Connexions (20 nodes)

```
TelegramBot ──→ CommandRouter (Switch, 9 outputs)
                  |
                  |── [0] /start    ──→ SendWelcome
                  |── [1] /styles   ──→ SendStylesCatalog
                  |── [2] /exemples ──→ SendExamples
                  |── [3] /aide     ──→ SendTips
                  |── [4] /go       ──→ StartProcessing ──┬──→ DownloadAllPhotos ──→ CleanPhotos
                  |                                       |       ──→ BatchVisionAnalysis
                  |                                       |            ──→ InitializeSession
                  |                                       |                 ──→ GenerateRoomOptions
                  |                                       └──→ SendProcessingMessage
                  |── [5] media     ──→ AccumulatePhoto ──→ AckStyleKeyboard
                  |── [6] style     ──→ SaveStyleChoice ──┬──→ SendStyleConfirmation
                  |                                       └──→ AutoStartCheck ──┬──→ DownloadAllPhotos...
                  |                                                             └──→ SendProcessingMessage
                  |── [7] callback  ──→ HandleCallbackQuery
                  |── [8] fallback  ──→ SendDefault
```

### 5.2 Liste des 20 Nodes

| # | Node | Type | Role |
|---|------|------|------|
| 1 | TelegramBot | telegramTrigger v1 | Webhook Telegram (message + callback_query) |
| 2 | CommandRouter | Switch v3 | 8 regles + fallback : /start, /styles, /exemples, /aide, /go, media, style, callback |
| 3 | SendWelcome | Telegram v1.2 | Message de bienvenue |
| 4 | SendStylesCatalog | HTTP Request v4.2 | Catalogue styles avec reply_markup keyboard |
| 5 | SendExamples | Telegram v1.2 | Exemples de realisations |
| 6 | SendTips | Telegram v1.2 | Conseils pour photographier |
| 7 | AccumulatePhoto | Code v2 | Stocke photos dans staticData, envoie ack+clavier style (V5) |
| 8 | AckStyleKeyboard | HTTP Request v4.2 | Confirmation reception photo + clavier styles |
| 9 | SaveStyleChoice | Code v2 | Sauvegarde style dans staticData |
| 10 | SendStyleConfirmation | HTTP Request v4.2 | Confirmation du style choisi |
| 11 | AutoStartCheck | Code v2 | Auto-declenchement si album + style deja pret |
| 12 | StartProcessing | Code v2 | Validation /go : photos, style, session |
| 13 | DownloadAllPhotos | Code v2 | Telegram getFile → URLs publiques |
| 14 | SendProcessingMessage | HTTP Request v4.2 | Message "Analyse en cours..." |
| 15 | CleanPhotos | Code v2 | Flux Kontext Pro : suppression meubles existants, preservation structurelle |
| 16 | BatchVisionAnalysis | Code v2 | GPT-4o Vision : analyse batch multi-photos |
| 17 | InitializeSession | Code v2 | Creation session dans staticData (avec beforePhotoUrl) |
| 18 | GenerateRoomOptions | Code v2 | GPT-4o + 5x Flux Kontext Pro pour la 1ere piece |
| 19 | HandleCallbackQuery | Code v2 | Machine a etats : selection, regen, videos, render |
| 20 | SendDefault | Telegram v1.2 | Message par defaut (commande non reconnue) |

### 5.3 Machine a Etats (staticData)

Chaque interaction Telegram = nouvelle execution webhook. L'etat persiste dans `staticData` (memoire globale n8n).

```
Phase: selecting  ←→  HandleCallbackQuery (selection/regen/next room)
     |
     v (toutes les pieces selectionnees)
Phase: videos     ←→  Kling v2.1 Pro par piece + envoi individuel Telegram
     |
     v (toutes les videos generees)
Phase: rendering  ←→  Remotion compile → envoi final → delete session
```

**Structure session :**
```javascript
staticData[`session_${chatId}`] = {
  phase: "selecting" | "videos" | "rendering",
  createdAt: timestamp,
  updatedAt: timestamp,
  style: "scandinavian",
  styleLabel: "Scandinave",
  currentRoomIndex: 0,
  totalRooms: 3,
  rooms: [{
    index: 0,
    roomType: "living_room",
    roomLabel: "Salon principal",
    photoUrl: "https://...cleaned.jpg",          // Photo nettoyee (sans meubles)
    beforePhotoUrl: "https://...original.jpg",   // Photo ORIGINALE (avec meubles) — v2.2
    visionData: { /* analyse GPT-4o : dimensions, materiaux, eclairage, camera */ },
    options: ["url1", "url2", "url3", "url4", "url5"],
    galleryMessageId: 12345,
    selectedUrl: "url3",
    regenerationCount: 0
  }]
};
```

**Autres cles staticData :**
- `photo_{chatId}_{fileId}` — photo stockee (fileId, mediaType, timestamp)
- `style_{chatId}` — style choisi (style, label)
- `mg_{chatId}_{mediaGroupId}` — dedup pour albums (un seul ack par album)
- `autoStart_{chatId}` — flag anti double-declenchement

**Nettoyage :** Sessions expirees apres 15min d'inactivite (nettoyage au /go et dans AutoStartCheck).

---

## 6. Detail des Nodes Code

### 6.1 AccumulatePhoto (V5)

**Fichier** : inline dans `build-v21.js`

**Role** : Stocke chaque photo recue dans staticData. Gere les albums Telegram (media_group_id) et les photos individuelles differemment.

**Logique** :
- Extrait `fileId` de la photo/video recue
- Stocke dans `staticData[photo_{chatId}_{fileId}]`
- **Album** : Si `msg.media_group_id` existe → premiere photo de l'album envoie un ack + clavier styles via `postTelegram()` inline → `return []` (coupe la chaine n8n pour eviter race condition)
- **Photo individuelle** : Retourne les donnees → declenche AckStyleKeyboard en aval

**Anti race-condition** : Les albums Telegram arrivent comme N webhooks simultanes. V5 utilise `return []` pour couper immediatement et envoie l'ack inline via API directe, sans passer par les nodes suivants.

### 6.2 StartProcessing

**Fichier** : `n8n/nodes/StartProcessing.js` (103 lignes)

**Role** : Validation du `/go`. Verifie que les photos et le style existent, qu'aucune session active recente n'est en cours.

**Logique** :
1. Nettoie les sessions expirees (>15min)
2. Bloque si session `selecting` recente existe
3. Nettoie les flags transitoires (`autoStart_*`, `mg_*`)
4. Verifie photos > 0 et style selectionne
5. Retourne `{ chatId, photos, style, styleLabel, totalPhotos }`

### 6.3 CleanPhotos

**Fichier** : `n8n/nodes/CleanPhotos.js` (83 lignes)

**Role** : Passe chaque photo dans Flux Kontext Pro avec un prompt de nettoyage precis. Preserve l'URL originale (avec meubles) dans `originalUrl` pour le rendu AVANT/APRES.

**Prompt** :
```
Edit this exact photo, keep camera angle, perspective, and structure 100% identical:
Remove ALL movable furniture, beds, sofas, tables, chairs, boxes, clothes, clutter,
and decorations. Keep ONLY the bare room structure: walls, floor texture and material
unchanged, ceiling, windows, doors, radiators, electrical outlets, light switches,
ceiling lights, built-in closets, and all fixed architectural elements. The room must
appear completely empty but structurally identical. Photorealistic, exact room
proportions, exact floor material, no distortion, camera locked.
```

**Elements supprimes** : meubles mobiles, lits, canapes, tables, chaises, cartons, vetements, decorations
**Elements preserves** : murs, texture de sol, plafond, fenetres, portes, radiateurs, prises electriques, interrupteurs, plafonniers, placards encastres

**Sortie** : `{ ...photo, url: cleanedUrl, originalUrl: photo.url }` — la photo nettoyee remplace l'URL, l'originale est conservee.

**Fallback** : Si le nettoyage echoue, garde la photo originale sans `originalUrl`.

### 6.4 BatchVisionAnalysis

**Fichier** : inline dans `build-v21.js`

**Role** : Envoie toutes les photos (nettoyees) a GPT-4o Vision en un seul appel. Retourne un JSON structure avec type de bien, type de chaque piece, dimensions estimees, materiaux, eclairage, angle camera.

**Output JSON** :
```json
{
  "propertyType": "apartment",
  "rooms": [
    {
      "photoIndex": 1,
      "roomType": "living_room",
      "roomLabel": "Salon principal",
      "dimensions": { "estimatedArea": "25m2", "ceilingHeight": "2.5m", "shape": "rectangular" },
      "existingMaterials": { "flooring": "parquet", "walls": "white painted", "ceiling": "flat white" },
      "lighting": { "naturalLight": "good", "windowCount": 2, "lightDirection": "south" },
      "cameraAngle": { "perspective": "corner wide", "height": "eye level", "orientation": "landscape" },
      "stagingPriority": "high",
      "notes": "specific observations"
    }
  ]
}
```

### 6.5 InitializeSession

**Fichier** : `n8n/nodes/InitializeSession.js` (47 lignes)

**Role** : Parse la reponse BatchVision, cree la session dans staticData avec `phase: 'selecting'`, et nettoie les cles photo/style/album/autoStart accumulees.

**v2.2** : Stocke `beforePhotoUrl` pour chaque room :
```javascript
rooms: analysis.rooms.map((room, i) => ({
  index: i,
  roomType: room.roomType,
  roomLabel: room.roomLabel,
  photoUrl: photoUrls[i] ? photoUrls[i].url : photoUrls[0].url,
  beforePhotoUrl: photoUrls[i] ? (photoUrls[i].originalUrl || photoUrls[i].url) : photoUrls[0].url,
  visionData: room,
  options: [],
  galleryMessageId: null,
  selectedUrl: null,
  regenerationCount: 0
}))
```

`beforePhotoUrl` = URL originale avec meubles (de CleanPhotos `originalUrl`). Si `originalUrl` n'existe pas (nettoyage echoue), fallback vers la photo nettoyee.

### 6.6 GenerateRoomOptions

**Fichier** : `n8n/nodes/GenerateRoomOptions.js` (250 lignes)

**Role** : Pour la piece courante (room 0 au depart), genere 5 options de staging via GPT-4o + Flux Kontext Pro, et envoie le clavier inline de selection.

**Etapes** :
1. Envoie la photo nettoyee sur Telegram
2. GPT-4o Vision analyse la photo + genere 5 prompts editing (avec regles anti-distortion + structuralInventory)
3. Lance 5 predictions Flux Kontext Pro en parallele (avec delai de 3s entre chaque)
4. Poll chaque prediction jusqu'a completion (max 60 tentatives x 5s = 5min)
5. Envoie les 5 photos options sur Telegram
6. Envoie le clavier inline : [1] [2] [3] [4] [5] + [Nouvelles options]

**Prompt GPT-4o (system)** — Regles anti-distortion :
```
CRITICAL ANTI-DISTORTION RULES:
1. CAMERA LOCK: NEVER describe the room itself (walls, floor, windows, ceiling).
   Flux Kontext Pro already sees the photo — describing structure CAUSES DISTORTION.
2. STRUCTURE FREEZE: Walls, floor, ceiling, windows, doors must remain PIXEL-PERFECT.
3. PROPORTIONS: Room dimensions, window sizes, door heights must keep IDENTICAL ratios.
4. Start every prompt with: "Edit this exact photo, keep camera angle, perspective,
   and room structure 100% identical. Add [furniture] to this room."
5. End every prompt with: "Keep all walls, floor, windows, doors, ceiling unchanged.
   Photorealistic, exact room proportions, no distortion, camera locked."
6. Reference spatial positions from the photo.
7. Only mention furniture, rugs, artwork, plants, lamps. NO structural changes.
8. Keep each prompt SHORT (2 sentences MAX). Longer prompts = more distortion.
9. Generate 5 prompts with DIFFERENT approaches:
   - Prompt 1: MAIN FURNITURE (sofa, bed, table, chairs)
   - Prompt 2: DIFFERENT MAIN FURNITURE layout
   - Prompt 3: DECORATION focus (art, plants, cushions, rugs, curtains)
   - Prompt 4: COMPLETE but MINIMAL setup
   - Prompt 5: LUXURIOUS/FULL setup
   All 5 must keep the SAME design style but vary in density and focus.
```

**Injection structuralInventory** : Le prompt user inclut `room.visionData` (JSON de BatchVision) pour que GPT-4o place les meubles logiquement sans bloquer fenetres/portes et en respectant les dimensions de la piece.

**Suffixe Flux** : Chaque prompt est complete par `' Photorealistic, exact room proportions, no distortion, camera locked.'`

### 6.7 HandleCallbackQuery

**Fichier** : `n8n/nodes/HandleCallbackQuery.js` (512 lignes)

**Role** : Machine a etats centrale. Recoit les callbacks du clavier inline Telegram et gere :
- **Regeneration** : Nouvelle serie de 5 options (max 3 par piece)
- **Selection** : Stocke le choix, passe a la piece suivante ou lance le pipeline video
- **Video pipeline** : Kling v2.1 Pro + envoi individuel + Remotion + envoi final

**Format callback_data** : `sel_{chatId}_{roomIndex}_{choice}` ou choice = "1"-"5" ou "regen"

**Pipeline video (quand toutes les pieces sont selectionnees)** :
1. Envoie la galerie des photos stagees sur Telegram (`sendMediaGroup`)
2. Pour chaque piece :
   - Lance Kling v2.1 Pro (start_image → end_image, mode pro, 5s)
   - Poll jusqu'a completion (max 120 tentatives x 10s = 20min)
   - Telecharge la video en buffer binaire (`downloadBinary`)
   - Upload multipart vers Telegram (`multipartUpload` → `sendVideo`)
   - Envoie confirmation `"Video X/N — Room envoyee !"`
3. Lance le render Remotion (POST `http://172.18.0.1:8000/renders`)
4. Poll le status du render (toutes les 15s)
5. Telecharge le MP4 final + upload multipart vers Telegram
6. Supprime la session

**v2.2** : `videoResults` inclut `beforePhotoUrl` pour chaque piece :
```javascript
videoResults.push({
  beforePhotoUrl: r.beforePhotoUrl || r.photoUrl,
  originalPhotoUrl: r.photoUrl,        // Photo nettoyee
  stagedPhotoUrl: r.selectedUrl,        // Photo stagee choisie
  videoUrl,                             // Video Kling
  roomType: r.roomType,
  roomLabel: r.roomLabel
});
```

**Payload Remotion** :
```javascript
{
  compositionId: 'PropertyShowcase',
  inputProps: {
    property: { title: 'Visite Virtuelle VIMIMO', style: session.style },
    rooms: videoResults.map(r => ({
      beforePhotoUrl: r.beforePhotoUrl,       // Photo originale avec meubles
      originalPhotoUrl: r.originalPhotoUrl,    // Photo nettoyee
      stagedPhotoUrl: r.stagedPhotoUrl,        // Photo stagee
      videoUrl: r.videoUrl,                    // Video Kling
      roomType: r.roomType,
      roomLabel: r.roomLabel
    }))
  }
}
```

**Prompt Kling** :
```
Morph from original empty room to furnished room. KEEP EXACT same room structure,
walls, floor, windows, camera angle, perspective, and proportions throughout the
entire video. Subtle dolly zoom only, no perspective change. {style} {roomType},
photorealistic professional real estate video, smooth furniture appearance,
steady camera, natural lighting.
```

**Negative prompt Kling** :
```
blurry, distorted, low quality, warped walls, warped windows, changed proportions,
furniture movement, structural changes, perspective shift, room deformation
```

**Helpers inclus** :
- `generateRoomOptions()` — meme logique que GenerateRoomOptions.js (pour regen/next room)
- `pollPrediction()` — poll Replicate prediction (120 tentatives x 10s = 20min max)
- `downloadBinary()` — telechargement HTTP en Buffer (timeout 120s)
- `multipartUpload()` — envoi multipart form-data vers Telegram sendVideo (timeout 120s)

### 6.8 AutoStartCheck

**Fichier** : `n8n/nodes/AutoStartCheck.js` (51 lignes)

**Role** : Auto-declenchement du pipeline quand l'utilisateur a envoye un album ET choisit un style (sans devoir taper /go). Se declenche apres SaveStyleChoice.

**Conditions** :
- Album existe (`album_*` keys dans staticData)
- Style choisi
- Photos presentes
- Pas de session active recente (<15min)
- Pas de double declenchement (`autoStart_*` flag avec timeout 15min)

**Securite** : Ne cree PAS de session preliminaire (evite de bloquer /go si le pipeline echoue).

---

## 7. Composant Remotion — Montage Video

### 7.1 Architecture

```
remotion/
  src/
    index.ts                 — Point d'entree Remotion
    Root.tsx                 — Enregistrement des compositions (v1 + v2)
    Composition.tsx          — VirtualStaging (v1, speed ramp, 10s)
    PropertyShowcase.tsx     — PropertyShowcase (v2, multi-pieces)
    schemas.ts               — Zod schemas (Room, PropertyShowcaseProps)
    components/
      IntroCard.tsx           — Carte titre animee (fade-in)
      OutroCard.tsx           — Carte "VIMIMO" (fade-in)
      RoomSegment.tsx         — Segment 210 frames par piece (AVANT/APRES)
      SplitReveal.tsx         — Transition wipe avant/apres
      RoomLabel.tsx           — Label de piece anime
      CinematicOverlay.tsx    — Bandes noires + vignette cinematique
  server/
    index.ts                 — Express server (POST/GET /renders)
  Dockerfile                 — Node 22 + Chromium
```

### 7.2 Zod Schemas

```typescript
// schemas.ts
export const roomSchema = z.object({
  beforePhotoUrl: z.string().url().optional(),    // v2.2 — Photo originale avec meubles
  originalPhotoUrl: z.string().url(),             // Photo nettoyee
  stagedPhotoUrl: z.string().url(),               // Photo stagee (choix utilisateur)
  videoUrl: z.string().url(),                     // Video Kling
  roomType: z.string(),
  roomLabel: z.string(),
});

export const propertyShowcaseSchema = z.object({
  property: z.object({
    title: z.string().default("Visite Virtuelle"),
    address: z.string().optional(),
    style: z.string().default("modern"),
  }).default({}),
  rooms: z.array(roomSchema).min(1).max(20),
});
```

`beforePhotoUrl` est optionnel pour la retro-compatibilite. Si absent, `RoomSegment` utilise `originalPhotoUrl` a la place.

### 7.3 Composition PropertyShowcase

**Resolution** : 1920x1080, 30fps

**Timeline** :
```
[0-90]     IntroCard         — "Visite Virtuelle VIMIMO" (fade-in titre + adresse)
[90-280]   RoomSegment 1     — 210 frames (7s) avec AVANT/APRES
[270-460]  RoomSegment 2     — 20 frames crossfade avec le precedent
[450-640]  RoomSegment 3     — etc.
...
[fin]      OutroCard          — "VIMIMO - Virtual Staging IA" (fade-in, 90 frames)
```

**Duree dynamique** (`calculateDuration`) :
```
durationInFrames = INTRO(90) + N * ROOM(210) - (N-1) * CROSSFADE(20) + OUTRO(90)
```

| Pieces | Duree | Secondes |
|--------|-------|----------|
| 1 | 390 frames | 13s |
| 3 | 770 frames | ~26s |
| 5 | 1150 frames | ~38s |
| 10 | 2100 frames | 70s |

`calculateMetadata` dans Root.tsx adapte dynamiquement la duree a l'execution en fonction du nombre de rooms dans `props.rooms`.

### 7.4 RoomSegment (210 frames = 7s) — v2.2

**Fichier** : `remotion/src/components/RoomSegment.tsx` (159 lignes)

Timeline 4 phases avec badges AVANT/APRES :

```
[0-40]      Phase 1 : Photo AVANT (originale avec meubles) + badge "AVANT" + Ken Burns zoom 1.0→1.04
[40-70]     Phase 2 : SplitReveal wipe (avant → stagee) avec curseur vertical
[70-180]    Phase 3 : Video Kling (OffthreadVideo, playbackRate 1.0)
[180-210]   Phase 4 : Photo APRES (stagee) + badge "APRES" + RoomLabel
```

**Transitions crossfade** (5 frames entre chaque phase) :
- Phase 1→2 : frames 37-42 (opBefore → opSplit)
- Phase 2→3 : frames 67-72 (opSplitOut → opVideo)
- Phase 3→4 : frames 177-182 (opVideoOut → opStaged)

**Badges** :
- **AVANT** (Phase 1) : Pill noir (`rgba(0,0,0,0.7)`) + texte blanc, fade-in frames 5-15, position top-left (40,48)
- **APRES** (Phase 4) : Pill blanc (`rgba(255,255,255,0.9)`) + texte noir, fade-in frames 185-195, position top-left (40,48)
- Style commun : fontSize 22, fontWeight 700, padding 8x20, borderRadius 20, letterSpacing 2, uppercase, backdropFilter blur(8px)

**Selection de l'URL "before"** :
```typescript
const beforeUrl = room.beforePhotoUrl || room.originalPhotoUrl;
```
Fallback vers `originalPhotoUrl` si `beforePhotoUrl` n'est pas fourni.

**SplitReveal** : Utilise `beforeUrl` (photo avec meubles) comme source et `stagedPhotoUrl` comme destination.

### 7.5 Composants

- **SplitReveal** : Wipe vertical avec curseur blanc. `clipPath: inset(0 ${pct}% 0 0)` pour reveler la photo stagee de droite a gauche. Curseur = div 3px blanche avec box-shadow.
- **IntroCard** : Fond noir, titre en blanc (72px) + adresse (36px, gris), fade-in progressif (titre frames 15-45, adresse frames 40-70).
- **OutroCard** : Fond noir, "VIMIMO" (96px, letterSpacing 12) + "Virtual Staging IA" (32px), fade-in (brand frames 10-40, subtitle frames 30-60).
- **CinematicOverlay** : Bandes noires haut/bas (4.5%, gradient transparent) + vignette radiale (transparent centre, 30% opacite bords). Superpose toute la composition avec `pointerEvents: none`.
- **RoomLabel** : Affiche le nom de la piece sur la photo stagee finale (Phase 4). Pill noir semi-transparent, fontSize 28, borderRadius 24. Apparait avec fade-in + translateY slide-up (20 frames).

### 7.6 Render Server

**Fichier** : `remotion/server/index.ts` (136 lignes)

- **Port** : 8000 (reseau Docker interne, accessible via `http://172.18.0.1:8000`)
- **Bundle au demarrage** : `@remotion/bundler` pre-compile le projet React
- **POST /renders** : Demarre un render asynchrone, retourne `{ id, status: "rendering" }`
  - Accepte `compositionId` et `inputProps` dans le body
  - `selectComposition` + `renderMedia` avec codec h264
  - Suivi progression via `onProgress`
- **GET /renders/:id** : Status du render (id, status, progress %, error)
- **GET /renders/:id/download** : Telecharge le MP4 final (`res.download`)
- **GET /health** : Check de sante `{ status: "ok", bundled, activeRenders }`
- **CORS** : Active pour toutes les origines
- **Stockage** : Fichiers MP4 dans `/app/out/` (dans le container Docker)

### 7.7 Docker

**Fichier** : `remotion/Dockerfile`

- Base : `node:22-slim`
- Dependances : Chromium + libs graphiques (libgbm, libnss3, libx11-xcb, etc.)
- `CHROMIUM_PATH=/usr/bin/chromium`
- Entry : `npx tsx server/index.ts`
- Port expose : 8000

**Rebuild VPS** :
```bash
ssh root@srv1129073.hstgr.cloud
cd /opt/vimimo-render
# SCP updated files
docker build -t vimimo-render .
docker stop vimimo-render && docker rm vimimo-render
docker run -d --name vimimo-render -p 8000:8000 --restart unless-stopped vimimo-render
```

---

## 8. Data Flow — beforePhotoUrl (v2.2)

Le champ `beforePhotoUrl` traverse tout le pipeline pour permettre le rendu AVANT/APRES dans la video finale :

```
CleanPhotos.js
  └─ Pour chaque photo : { url: cleanedUrl, originalUrl: photo.url }
       │
       v
InitializeSession.js
  └─ rooms[i].beforePhotoUrl = photoUrls[i].originalUrl || photoUrls[i].url
  └─ rooms[i].photoUrl = photoUrls[i].url (nettoyee)
       │
       v
HandleCallbackQuery.js (pipeline video)
  └─ videoResults[i].beforePhotoUrl = r.beforePhotoUrl || r.photoUrl
       │
       v
Remotion payload → inputProps.rooms[i].beforePhotoUrl
       │
       v
schemas.ts → roomSchema.beforePhotoUrl (optional, z.string().url())
       │
       v
RoomSegment.tsx → const beforeUrl = room.beforePhotoUrl || room.originalPhotoUrl
  └─ Phase 1 [0-40] : Affiche beforeUrl + badge "AVANT"
  └─ Phase 2 [40-70] : SplitReveal wipe (beforeUrl → stagedPhotoUrl)
```

---

## 9. Scripts de Build et Deploy

### 9.1 build-v21.js

**Fichier** : `n8n/build-v21.js` (709 lignes)

**Role** : Assemble le workflow JSON complet. Lit les Code nodes depuis `n8n/nodes/*.js` et les integre dans la structure workflow avec les 20 nodes, connexions, et settings.

**Nodes lus depuis fichiers** (6) : StartProcessing, InitializeSession, GenerateRoomOptions, HandleCallbackQuery, CleanPhotos, AutoStartCheck

**Nodes inline** (4) : AccumulatePhoto (V5 avec `postTelegram`), SaveStyleChoice, DownloadAllPhotos, BatchVisionAnalysis

**Output** : `n8n/workflow-v2.json`

### 9.2 build-deploy.js

**Role** : Convertit les IDs lisibles (ex: `accumulate-photo`) en UUIDs deterministes via MD5 hash. Necessaire car n8n attend des UUIDs pour les IDs de nodes.

**Output** : `n8n/workflow-v2-deploy.json`

### 9.3 deploy-v21.sh

**Fichier** : `n8n/deploy-v21.sh`

**Role** : Deploiement complet en 7 etapes :

```
1. node build-v21.js          → Genere workflow-v2.json
2. node build-deploy.js       → Genere workflow-v2-deploy.json (UUIDs)
3. Supprime staticData/tags   → Prepare le body (evite d'ecraser l'etat en prod)
4. Deactive le workflow        → POST /api/v1/workflows/{id}/deactivate
5. Met a jour via API PUT      → PUT /api/v1/workflows/{id} avec le JSON
6. Active le workflow          → POST /api/v1/workflows/{id}/activate
7. Set Telegram webhook        → max_connections=1, allowed_updates=[message,callback_query]
```

L'etape 7 (webhook) est **critique** : n8n re-enregistre le webhook avec les valeurs par defaut a chaque activation, ce qui reset `max_connections` a 40 et provoque des race conditions sur les albums.

**Commande de deploy** :
```bash
cd n8n && bash deploy-v21.sh
```

---

## 10. Contraintes Techniques et Patterns

### 10.1 n8n Code Node Sandbox

Le sandbox n8n ne donne acces qu'a `require('https')`, `require('http')`, `require('url')`. Pas de `fetch`, pas d'`axios`, pas de `URL` global.

**Pattern HTTP utilise dans tous les Code nodes** :
```javascript
const https = require('https');
const http = require('http');
const { URL } = require('url');

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const reqOpts = {
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    const req = lib.request(reqOpts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    if (options.timeout) req.setTimeout(options.timeout, () => { req.destroy(); reject(new Error('timeout')); });
    if (options.body) req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    req.end();
  });
}

function post(url, data, headers = {}) {
  return httpRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: data,
    timeout: 600000
  });
}

function get(url, headers = {}) {
  return httpRequest(url, { headers, timeout: 600000 });
}
```

### 10.2 Telegram Webhook

- **typeVersion 1** obligatoire pour le trigger Telegram (v1.1 ajoute un `secret_token` qui se desynchronise avec Telegram lors des PUT API)
- **max_connections=1** obligatoire pour serialiser les webhooks d'albums (evite les race conditions sur staticData)
- **sendVideo** : Telegram ne peut pas telecharger depuis une IP privee → upload multipart obligatoire depuis n8n
- **Pas d'espaces dans les noms de nodes trigger** (webhook URL encode les %20)
- **allowed_updates** : `["message", "callback_query"]` (necessaire pour le clavier inline)

### 10.3 Replicate API

- **Flux Kontext Pro** : `prompt`, `input_image`, `aspect_ratio` (`match_input_image`), `output_format` (`jpg`), `safety_tolerance` (max 2 avec input_image), `seed`
- **Kling v2.1 Pro** : `prompt`, `start_image`, `end_image`, `mode` (`pro`), `duration` (5s), `negative_prompt`
- **Polling** : Predictions asynchrones. Flux : poll 5s x 60 = 5min. Kling : poll 10s x 120 = 20min.

### 10.4 Gestion d'Erreurs

- Pas de IF nodes (bugues en n8n v2 pour les booleens — `false` evalue comme truthy). Tout le routing d'erreurs se fait avec `return []` dans les Code nodes.
- Fallbacks systematiques :
  - Si CleanPhotos echoue → garde photo originale (sans `originalUrl`)
  - Si Flux staging echoue → message erreur, possibilite de regenerer
  - Si Kling echoue → utilise image statique (`selectedUrl`) a la place de la video
  - Si Remotion echoue → les videos individuelles sont deja envoyees
- Sessions expirees automatiquement apres 15min d'inactivite.
- Verification taille video finale > 1000 octets avant envoi Telegram.

---

## 11. Prompts IA — Resume

### 11.1 CleanPhotos (Flux Kontext Pro)
```
Edit this exact photo, keep camera angle, perspective, and structure 100% identical:
Remove ALL movable furniture, beds, sofas, tables, chairs, boxes, clothes, clutter,
and decorations. Keep ONLY the bare room structure: walls, floor texture and material
unchanged, ceiling, windows, doors, radiators, electrical outlets, light switches,
ceiling lights, built-in closets, and all fixed architectural elements. The room must
appear completely empty but structurally identical. Photorealistic, exact room
proportions, exact floor material, no distortion, camera locked.
```

### 11.2 BatchVision (GPT-4o)
System prompt : Expert analyse immobiliere. Pour chaque photo : roomType, roomLabel, dimensions, existingMaterials, lighting, cameraAngle, stagingPriority, notes. Reponse JSON stricte.

### 11.3 Staging (GPT-4o → Flux Kontext Pro)
System : 9 regles anti-distortion (camera lock, structure freeze, proportions, spatial references, short prompts, 5 categories differentes). User : room info + structuralInventory JSON + photo. Chaque prompt Flux suffixe : "Photorealistic, exact room proportions, no distortion, camera locked."

### 11.4 Kling v2.1 Pro
Prompt : Morph from original to furnished. Keep exact structure, subtle dolly zoom, {style} {roomType}, photorealistic real estate video.
Negative : blurry, distorted, warped, changed proportions, structural changes, perspective shift.

---

## 12. Bug Fixes Historiques

| Bug | Cause | Fix |
|-----|-------|-----|
| Flux ignore la photo source | Parametre `image_url` invalide | Remplace par `input_image` |
| Photos staging inventees | `input_image` manquant → text-to-image pur | Ajoute `input_image` dans l'appel Flux |
| `safety_tolerance: 5` rejete | Max = 2 avec input_image | Change a 2 |
| /go bloque par session stale | Session precedente non nettoyee | Timeout 15min + auto-reset |
| Album photos perdues (1/3 stockees) | max_connections=40 → race condition staticData | max_connections=1 + deploy-v21.sh step 7 |
| Pas de clavier apres album | AccumulatePhoto V4 return [] pour albums | V5 : envoi inline via postTelegram() |
| Syntax error AccumulatePhoto V5 | Triple backslash dans build-v21.js | Single backslash dans template literals |
| Deploy reset max_connections | n8n re-enregistre webhook a chaque activation | Step 7 dans deploy-v21.sh |
| Distortion des pieces stagees | Prompts Flux decrivent la structure → warping | Regles ANTI-DISTORTION (ne jamais decrire la structure) |
| 1 seule option pour 1 photo | Fast path 1-photo sans selection | Supprime : toutes les pieces passent par 5 options |
| Videos non envoyees individuellement | Pipeline ne retournait que la video finale | Ajout downloadBinary + multipartUpload par video dans la boucle Kling |
| Meubles existants sur photos stagees | Photo source contenait des meubles existants | CleanPhotos (Flux) supprime les meubles avant staging |
| Pas d'avant/apres dans video finale | RoomSegment n'utilisait que la photo nettoyee | v2.2 : beforePhotoUrl + badges AVANT/APRES |

---

## 13. Fichiers du Projet

```
VIMIMO/
  AUDIT-VIMIMO-V21-COMPLET.md   ← Ce document
  SPEC-VIMIMO-V21-FLOW.md       ← Spec du flow
  schema-v2.json                 ← JSON Schema v2
  schema.json                    ← JSON Schema v1

  n8n/
    nodes/
      StartProcessing.js         ← Validation /go (103 lignes)
      InitializeSession.js       ← Creation session + beforePhotoUrl (47 lignes)
      GenerateRoomOptions.js     ← GPT-4o + 5x Flux (250 lignes)
      HandleCallbackQuery.js     ← Machine a etats centrale (512 lignes)
      CleanPhotos.js             ← Nettoyage meubles + preservation structure (83 lignes)
      AutoStartCheck.js          ← Auto-demarrage albums (51 lignes)
    build-v21.js                 ← Assemblage workflow JSON (709 lignes)
    build-deploy.js              ← Conversion IDs → UUIDs
    deploy-v21.sh                ← Script de deploiement complet (7 etapes)
    workflow-v2.json             ← Workflow genere (readable IDs)
    workflow-v2-deploy.json      ← Workflow deploye (UUID IDs)

  remotion/
    src/
      index.ts                   ← Entrypoint Remotion
      Root.tsx                   ← Compositions v1 + v2 (148 lignes)
      Composition.tsx            ← VirtualStaging v1 (speed ramp)
      PropertyShowcase.tsx       ← PropertyShowcase v2 (117 lignes)
      schemas.ts                 ← Zod schemas avec beforePhotoUrl (27 lignes)
      components/
        RoomSegment.tsx          ← 210 frames par piece, AVANT/APRES (159 lignes)
        SplitReveal.tsx          ← Wipe vertical avant/apres (54 lignes)
        IntroCard.tsx            ← Titre anime (61 lignes)
        OutroCard.tsx            ← Brand VIMIMO (52 lignes)
        CinematicOverlay.tsx     ← Bandes + vignette (42 lignes)
        RoomLabel.tsx            ← Label piece anime (44 lignes)
    server/
      index.ts                   ← Express render server (136 lignes)
    Dockerfile                   ← Node 22 + Chromium
```

---

## 14. Couts Estimes par Execution

| Service | Cout unitaire | Par piece | 3 pieces |
|---------|--------------|-----------|----------|
| GPT-4o Vision (batch) | ~$0.01-0.05/appel | 1 appel | ~$0.03 |
| GPT-4o Vision (prompts) | ~$0.01-0.03/appel | 1/piece | ~$0.09 |
| Flux Kontext Pro (clean) | ~$0.03/prediction | 1/piece | ~$0.09 |
| Flux Kontext Pro (staging) | ~$0.03/prediction | 5/piece | ~$0.45 |
| Kling v2.1 Pro (video) | ~$0.10-0.30/video | 1/piece | ~$0.60 |
| Remotion render | Infra propre | 1 total | ~$0.00 |
| **Total estime** | | | **~$1.26** |

*Les regenerations (max 3 par piece) ajoutent ~$0.15 par regen (1 appel GPT-4o + 5 Flux).*
*Pour 10 pieces : ~$4.20 estime.*

---

## 15. Limitations Connues

1. **Tokens hardcodes** : Limitation licence n8n (pas de Variables). Les tokens API (Telegram, OpenAI, Replicate) sont directement dans le code des nodes.
2. **Pas de persistance disque** : staticData est en memoire n8n. Un redemarrage n8n perd toutes les sessions en cours.
3. **Taille max video Telegram** : 50 MB. Les videos longues (10+ pieces, ~70s) pourraient depasser cette limite.
4. **Timeout execution n8n** : HandleCallbackQuery peut tourner 20+ minutes (Kling + Remotion). Le timeout par defaut n8n peut interrompre l'execution.
5. **Pas de retry automatique** : Si une prediction Replicate echoue, on passe au fallback sans retry.
6. **Multi-utilisateur** : staticData est global mais sessions segmentees par chatId. Deux utilisateurs differents peuvent travailler en parallele, mais les appels API sont sequentiels dans le meme webhook.
7. **Nettoyage imparfait** : CleanPhotos utilise Flux Kontext Pro (editing) et non un modele specialise inpainting. Certains meubles complexes peuvent laisser des artefacts.
8. **Stockage MP4 temporaire** : Les renders Remotion sont stockes dans `/app/out/` dans le container Docker. Pas de nettoyage automatique — les fichiers s'accumulent.

---

## 16. Changelog

### v2.2 (20 fevrier 2026)
- **beforePhotoUrl** : Photo originale (avec meubles) preservee tout au long du pipeline pour rendu AVANT/APRES
- **CleanPhotos ameliore** : Prompt precis listant explicitement les elements a supprimer (meubles, vetements) et a conserver (radiateurs, prises, texture sol)
- **RoomSegment AVANT/APRES** : Nouvelle timeline 4 phases avec badges pill (AVANT noir, APRES blanc)
- **SplitReveal** : Transition wipe de la photo originale (avec meubles) vers la photo stagee
- **Videos individuelles** : Chaque video Kling est envoyee individuellement sur Telegram avant la compilation finale

### v2.1 (18 fevrier 2026)
- **Selection interactive** : 5 options par piece avec clavier inline Telegram
- **Regeneration** : Max 3 regenerations par piece
- **Machine a etats** : HandleCallbackQuery gere tout le flow selection → videos → render
- **Auto-start** : Albums + style → demarrage automatique sans /go
- **AccumulatePhoto V5** : Gestion race-condition albums avec envoi inline

### v2.0 (17 fevrier 2026)
- **Multi-pieces** : PropertyShowcase Remotion avec N rooms + crossfade
- **CleanPhotos** : Nettoyage meubles via Flux Kontext Pro
- **BatchVision** : Analyse GPT-4o multi-photos en batch
- **Render server** : Express + Docker pour rendu Remotion sur VPS

### v1.0 (16 fevrier 2026)
- Pipeline single-photo : 1 photo → speed ramp → video 10s
- VirtualStaging composition Remotion (v1)
