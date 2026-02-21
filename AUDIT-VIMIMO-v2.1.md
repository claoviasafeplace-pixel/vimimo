# AUDIT COMPLET — VIMIMO v2.1
## Pipeline Virtual Staging IA
### Date : 20 fevrier 2026

---

# TABLE DES MATIERES

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture technique](#2-architecture-technique)
3. [Flux utilisateur](#3-flux-utilisateur)
4. [Infrastructure n8n](#4-infrastructure-n8n)
5. [Graphe des noeuds et connexions](#5-graphe-des-noeuds-et-connexions)
6. [Machine a etats (State Machine)](#6-machine-a-etats)
7. [Fichiers sources — n8n Nodes](#7-fichiers-sources--n8n-nodes)
8. [Fichiers sources — Build & Deploy](#8-fichiers-sources--build--deploy)
9. [Fichiers sources — Remotion](#9-fichiers-sources--remotion)
10. [Systeme de retry](#10-systeme-de-retry)
11. [Variables d'environnement et credentials](#11-variables-denvironnement-et-credentials)
12. [Processus de deploiement](#12-processus-de-deploiement)
13. [Bugs connus et corriges](#13-bugs-connus-et-corriges)
14. [Failles et recommandations](#14-failles-et-recommandations)

---

# 1. VUE D'ENSEMBLE

**VIMIMO** est un pipeline de virtual staging IA qui transforme des photos de pieces vides en videos cinematiques de pieces meublees. L'utilisateur interagit via un bot Telegram.

**Stack technologique :**
- **n8n** (v2.4.8) — orchestration du workflow (VPS Hostinger)
- **Telegram Bot API** — interface utilisateur
- **GPT-4o Vision** (OpenAI) — analyse des pieces + generation de prompts
- **Flux Kontext Pro** (Replicate) — staging IA des images
- **Kling v2.1 Pro** (Replicate) — generation videos avant/apres
- **Remotion** (React) — montage video final (PropertyShowcase)
- **Express** — serveur de rendu Remotion (Docker, port 8000)

**Flux principal :**
```
Photos vides → Nettoyage IA → Analyse GPT-4o → 5 options staging par piece
→ Selection utilisateur → Video Kling par piece → Montage Remotion → Envoi Telegram
```

---

# 2. ARCHITECTURE TECHNIQUE

```
┌─────────────────────────────────────────────────────────────────┐
│                        TELEGRAM USER                             │
│                  (photos + style + /go)                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │ webhook (max_connections=1)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     n8n (VPS Hostinger)                            │
│  URL: https://n8n.srv1129073.hstgr.cloud                          │
│  Workflow ID: ZlSOfh3wPav4DGPE                                    │
│                                                                    │
│  TelegramBot → CommandRouter (Switch 8 rules + fallback)          │
│       │                                                            │
│       ├─ /start → SendWelcome                                     │
│       ├─ /styles → SendStylesCatalog                              │
│       ├─ /exemples → SendExamples                                 │
│       ├─ /aide → SendTips                                         │
│       ├─ /go → StartProcessing ──┐                                │
│       ├─ photo → AccumulatePhoto → AckStyleKeyboard               │
│       ├─ style → SaveStyleChoice → SendStyleConfirmation          │
│       │                          → AutoStartCheck ──┐             │
│       └─ callback → HandleCallbackQuery ──┐         │             │
│                                           ▼         ▼             │
│                              DownloadAllPhotos + SendProcessingMsg │
│                                      │                             │
│                                      ▼                             │
│                                CleanPhotos (Flux Kontext Pro)      │
│                                      │                             │
│                                      ▼                             │
│                             BatchVisionAnalysis (GPT-4o)           │
│                                      │                             │
│                                      ▼                             │
│                             InitializeSession                      │
│                                      │                             │
│                                      ▼                             │
│                           GenerateRoomOptions                      │
│                        (GPT-4o + 5x Flux Kontext Pro)              │
│                                      │                             │
│                              [inline keyboard]                     │
│                                      │                             │
│                                      ▼                             │
│                          HandleCallbackQuery                       │
│                     (selection / regen / videos / render)           │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ POST /renders
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│            Remotion Render Server (Docker, port 8000)              │
│  Express + @remotion/renderer                                     │
│  Composition: PropertyShowcase                                    │
│  Resultat: MP4 1920x1080 30fps                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

# 3. FLUX UTILISATEUR

## 3.1. Envoi de photos

**Photo individuelle :**
1. Utilisateur envoie 1 photo
2. `AccumulatePhoto` stocke dans `staticData[photo_{chatId}_{fileId}]`
3. `AckStyleKeyboard` repond "Photo X recue" + clavier styles

**Album (media_group) :**
1. Utilisateur envoie N photos en album
2. `AccumulatePhoto` stocke chaque photo + detecte `media_group_id`
3. Premier message : "Album detecte !" + clavier styles (reply_markup keyboard)
4. Deuxieme message : bouton inline "Lancer le Staging" (`callback_data: album_go`)
5. Les photos suivantes de l'album sont stockees silencieusement (`return []`)

## 3.2. Selection du style

1. Utilisateur clique sur un style (Scandinave, Industriel, Moderne, Classique, Boheme)
2. `SaveStyleChoice` stocke dans `staticData[style_{chatId}]`
3. `SendStyleConfirmation` confirme le choix
4. `AutoStartCheck` verifie si album + style sont prets → lance automatiquement le pipeline

## 3.3. Lancement (3 voies)

| Declencheur | Source | Noeud d'entree |
|-------------|--------|----------------|
| `/go` | commande manuelle | StartProcessing |
| Auto-start | album + style detectes | AutoStartCheck |
| Bouton inline | "Lancer le Staging" | HandleCallbackQuery (`album_go`) |

Les 3 voies convergent vers `DownloadAllPhotos + SendProcessingMessage`.

## 3.4. Pipeline principal

1. **DownloadAllPhotos** — convertit `file_id` Telegram en URLs telechargeables
2. **CleanPhotos** — nettoie les meubles existants via Flux Kontext Pro (avec retry x3)
3. **BatchVisionAnalysis** — GPT-4o analyse chaque piece (type, dimensions, materiaux, eclairage, angle camera)
4. **InitializeSession** — cree `session_{chatId}` avec phase `selecting`, rooms[], currentRoomIndex=0
5. **GenerateRoomOptions** — pour la 1ere piece : GPT-4o genere 5 prompts + 5 images Flux → inline keyboard

## 3.5. Selection interactive (boucle)

Pour chaque piece :
1. 5 options de staging affichees (photos individuelles)
2. Inline keyboard : boutons 1-5 + "Nouvelles options"
3. Utilisateur choisit → `HandleCallbackQuery` :
   - Si `regen` : regenere 5 nouvelles options (max 3 par piece)
   - Si `1-5` : stocke selection → passe a la piece suivante ou lance les videos

## 3.6. Generation videos + montage

Quand toutes les pieces sont selectionnees :
1. Phase `videos` : pour chaque piece, Kling v2.1 Pro genere une video 5s avant→apres
2. **Chaque video individuelle est envoyee sur Telegram** (download + multipart upload)
3. Phase `rendering` : Remotion compile la video finale montee (PropertyShowcase)
4. Video finale envoyee sur Telegram
5. Session nettoyee

---

# 4. INFRASTRUCTURE n8n

| Parametre | Valeur |
|-----------|--------|
| URL | `https://n8n.srv1129073.hstgr.cloud` |
| Version | 2.4.8 |
| Workflow ID | `ZlSOfh3wPav4DGPE` |
| Task Runner | JS (nouveau v2.4.8) |
| Container | `root-n8n-1` |
| Remotion Docker IP | `172.18.0.1:8000` |
| Webhook URL | `{N8N_URL}/webhook/{WORKFLOW_ID}/telegrambot/webhook` |
| max_connections | 1 (force sequentiel) |
| allowed_updates | `["message", "callback_query"]` |

### Contraintes n8n v2.4.8

- `process` n'est PAS global → `const process = require('process');` obligatoire
- `$env.VAR_NAME` bloque dans les expressions HTTP Request → tokens hardcodes dans les URLs
- `fetch` est `undefined` → utiliser `require('https')` natif
- `axios` crash (sandbox rend `Error.message` read-only)
- `URL` global indisponible → `const { URL } = require('url')`
- IF node v2 : `false` evalue comme truthy → eviter, gerer dans Code nodes

---

# 5. GRAPHE DES NOEUDS ET CONNEXIONS

## 5.1. Liste des 20 noeuds

| # | ID | Nom | Type | Position |
|---|-----|------|------|----------|
| 1 | telegram-trigger | TelegramBot | telegramTrigger v1 | [0, 800] |
| 2 | command-router | CommandRouter | switch v3 | [300, 800] |
| 3 | send-welcome | SendWelcome | telegram v1.2 | [650, 0] |
| 4 | send-styles | SendStylesCatalog | httpRequest v4.2 | [650, 200] |
| 5 | send-examples | SendExamples | telegram v1.2 | [650, 400] |
| 6 | send-tips | SendTips | telegram v1.2 | [650, 600] |
| 7 | accumulate-photo | AccumulatePhoto | code v2 | [650, 850] |
| 8 | send-ack-keyboard | AckStyleKeyboard | httpRequest v4.2 | [950, 850] |
| 9 | save-style | SaveStyleChoice | code v2 | [650, 1100] |
| 10 | send-style-confirm | SendStyleConfirmation | httpRequest v4.2 | [950, 1100] |
| 11 | start-processing | StartProcessing | code v2 | [650, 1400] |
| 12 | download-all-photos | DownloadAllPhotos | code v2 | [1250, 1300] |
| 13 | send-processing-msg | SendProcessingMessage | httpRequest v4.2 | [1250, 1500] |
| 14 | clean-photos | CleanPhotos | code v2 | [1400, 1300] |
| 15 | batch-vision | BatchVisionAnalysis | code v2 | [1700, 1300] |
| 16 | initialize-session | InitializeSession | code v2 | [1850, 1300] |
| 17 | generate-room-options | GenerateRoomOptions | code v2 | [2150, 1300] |
| 18 | auto-start-check | AutoStartCheck | code v2 | [1250, 1100] |
| 19 | handle-callback | HandleCallbackQuery | code v2 | [650, 1700] |
| 20 | send-default | SendDefault | telegram v1.2 | [650, 1950] |

## 5.2. Connexions (11 sources)

```
TelegramBot ──────────→ CommandRouter

CommandRouter ──┬─ [0] start ────────→ SendWelcome
                ├─ [1] styles ───────→ SendStylesCatalog
                ├─ [2] exemples ─────→ SendExamples
                ├─ [3] aide ─────────→ SendTips
                ├─ [4] go ──────────→ StartProcessing
                ├─ [5] media ────────→ AccumulatePhoto
                ├─ [6] style_choice ─→ SaveStyleChoice
                ├─ [7] callback ─────→ HandleCallbackQuery
                └─ [8] fallback ─────→ SendDefault

AccumulatePhoto ─────────→ AckStyleKeyboard

SaveStyleChoice ───┬─────→ SendStyleConfirmation
                   └─────→ AutoStartCheck

AutoStartCheck ────┬─────→ DownloadAllPhotos
                   └─────→ SendProcessingMessage

StartProcessing ───┬─────→ DownloadAllPhotos
                   └─────→ SendProcessingMessage

HandleCallbackQuery ─┬───→ DownloadAllPhotos      (album_go seulement)
                     └───→ SendProcessingMessage   (album_go seulement)

DownloadAllPhotos ────────→ CleanPhotos
CleanPhotos ──────────────→ BatchVisionAnalysis
BatchVisionAnalysis ──────→ InitializeSession
InitializeSession ────────→ GenerateRoomOptions

(GenerateRoomOptions est terminal — la suite est geree par HandleCallbackQuery via staticData)
```

## 5.3. Flux de donnees simplifie

```
                     ┌─ /go ──────→ StartProcessing ─────────┐
                     │                                        │
TelegramBot → Router ├─ album_go → HandleCallbackQuery ──────┼──→ DownloadAllPhotos
                     │                                        │         │
                     ├─ style ───→ AutoStartCheck ────────────┘         │
                     │                                                  ▼
                     ├─ photo ───→ AccumulatePhoto                CleanPhotos
                     │                                                  │
                     └─ sel_X_Y → HandleCallbackQuery                   ▼
                         │         (state machine interne)       BatchVision
                         │                                              │
                         │     ┌── regen → generateRoomOptions()        ▼
                         ├─────┤                                InitializeSession
                         │     └── select → next room ou                │
                         │                  lance videos                ▼
                         │                       │            GenerateRoomOptions
                         │                       │              (1ere piece)
                         │                       ▼
                         │              Kling videos (boucle)
                         │                       │
                         │              Envoi individuel Telegram
                         │                       │
                         │              Remotion render
                         │                       │
                         │              Envoi video finale
                         │                       │
                         └──────────────→ Session cleanup
```

---

# 6. MACHINE A ETATS

## 6.1. Cles staticData

| Pattern | Usage | TTL |
|---------|-------|-----|
| `photo_{chatId}_{fileId}` | Photo stockee | 30min (filtre dans StartProcessing) |
| `mg_{chatId}_{mediaGroupId}` | Marqueur album (dedup ack) | Nettoye par StartProcessing |
| `style_{chatId}` | Style selectionne `{style, label}` | Nettoye par InitializeSession |
| `session_{chatId}` | Session active (objet complet) | 15min inactivite |
| `autoStart_{chatId}` | Flag anti-double declenchement | 15min |

## 6.2. Phases de session

```
(pas de session) → selecting → videos → rendering → (session supprimee)
```

| Phase | Description |
|-------|-------------|
| `selecting` | Utilisateur choisit ses stagings piece par piece |
| `videos` | Generation des videos Kling en cours |
| `rendering` | Compilation Remotion en cours |

## 6.3. Objet session complet

```javascript
staticData[`session_${chatId}`] = {
  phase: 'selecting',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  style: 'modern_minimalist',     // code style
  styleLabel: 'Moderne',           // label affiche
  currentRoomIndex: 0,
  totalRooms: N,
  rooms: [
    {
      index: 0,
      roomType: 'living_room',
      roomLabel: 'Salon principal',
      photoUrl: 'https://api.telegram.org/file/bot.../photos/...',
      beforePhotoUrl: 'https://...',  // photo originale (avant nettoyage)
      visionData: { /* analyse GPT-4o complete */ },
      options: ['url1', 'url2', ...],  // 5 URLs Flux
      galleryMessageId: 12345,          // pour editMessageText
      selectedUrl: null,                // URL choisie
      regenerationCount: 0              // max 3
    },
    // ...
  ]
};
```

## 6.4. Format callback_data

| Callback | Signification |
|----------|---------------|
| `album_go` | Bouton "Lancer le Staging" (album) |
| `sel_{chatId}_{roomIndex}_{1-5}` | Selection d'une option |
| `sel_{chatId}_{roomIndex}_regen` | Demande de regeneration |

---

# 7. FICHIERS SOURCES — n8n NODES

## 7.1. AccumulatePhoto (inline dans build-v21.js)

**Role :** Stocke chaque photo/video recue dans staticData. Gere la deduplication album.

**Logique :**
- Stocke `staticData[photo_{chatId}_{fileId}] = { fileId, mediaType, chatId, timestamp }`
- Si `media_group_id` present (album) : envoie ack+keyboard une seule fois par album via `mg_{chatId}_{mgId}` comme marqueur
- Album : envoie 2 messages (clavier style + bouton inline "Lancer le Staging")
- Single : retourne les donnees pour AckStyleKeyboard downstream

**Fichier :** Inline dans `n8n/build-v21.js` (lignes 23-89)

---

## 7.2. SaveStyleChoice (inline dans build-v21.js)

**Role :** Enregistre le style choisi par l'utilisateur.

**Styles disponibles :**
| Label | Code |
|-------|------|
| Scandinave | `scandinavian` |
| Industriel | `industrial` |
| Moderne | `modern_minimalist` |
| Classique | `classic_french` |
| Boheme | `bohemian` |

**Fichier :** Inline dans `n8n/build-v21.js` (lignes 91-119)

---

## 7.3. StartProcessing.js (114 lignes)

**Fichier :** `n8n/nodes/StartProcessing.js`

**Role :** Valide les preconditions et collecte les donnees pour /go.

**Logique :**
1. Nettoie les sessions expirees (>15min)
2. Bloque si session active recente (phase `selecting`, <15min)
3. Nettoie les flags `autoStart_` et marqueurs `mg_`
4. **Filtre les photos >30min** (file_id expires) + nettoie les cles expirees
5. Verifie qu'il y a des photos ET un style selectionne
6. Retourne `{ chatId, photos, style, styleLabel, totalPhotos }`

---

## 7.4. AutoStartCheck.js (52 lignes)

**Fichier :** `n8n/nodes/AutoStartCheck.js`

**Role :** Declenche automatiquement le pipeline quand album + style sont prets.

**Conditions de declenchement :**
- Un album a ete envoye (marqueur `mg_{chatId}_*` existe)
- Un style est selectionne
- Des photos existent
- Pas de session active (<15min)
- Pas de double-declenchement (`autoStart_{chatId}` flag, TTL 15min)

---

## 7.5. DownloadAllPhotos (inline dans build-v21.js)

**Fichier :** Inline dans `n8n/build-v21.js` (lignes 121-172)

**Role :** Convertit les `file_id` Telegram en URLs telechargeables.

**Logique :**
- Pour chaque photo, appelle `getFile` API Telegram
- `try/catch` + `continue` sur echec (photo expiree → skip, pas crash)
- Retourne `{ photoUrls: [{index, url, mediaType}], totalPhotos }`

---

## 7.6. CleanPhotos.js (159 lignes)

**Fichier :** `n8n/nodes/CleanPhotos.js`

**Role :** Nettoie les meubles existants des photos via Flux Kontext Pro.

**Prompt :** "Edit this exact photo [...] Remove ALL movable furniture [...] Keep ONLY bare room structure"

**Robustesse :**
- `runPrediction()` avec `maxRetries: 2, pollInterval: 5s, maxPolls: 60`
- Fallback : garde la photo originale + notifie l'utilisateur sur Telegram
- Stocke l'URL originale dans `originalUrl` pour la comparaison avant/apres

---

## 7.7. BatchVisionAnalysis (inline dans build-v21.js)

**Fichier :** Inline dans `n8n/build-v21.js` (lignes 174-243)

**Role :** Analyse chaque piece via GPT-4o Vision.

**Output JSON par piece :**
```json
{
  "photoIndex": 1,
  "roomType": "living_room",
  "roomLabel": "Salon principal",
  "dimensions": { "estimatedArea": "25m2", "ceilingHeight": "2.5m", "shape": "rectangular" },
  "existingMaterials": { "flooring": "parquet", "walls": "white painted", "ceiling": "flat white" },
  "lighting": { "naturalLight": "good", "windowCount": 2, "lightDirection": "south" },
  "cameraAngle": { "perspective": "corner wide", "height": "eye level", "orientation": "landscape" },
  "stagingPriority": "high",
  "notes": "..."
}
```

---

## 7.8. InitializeSession.js (48 lignes)

**Fichier :** `n8n/nodes/InitializeSession.js`

**Role :** Cree la session interactive a partir de l'analyse vision.

**Actions :**
1. Parse le JSON de BatchVisionAnalysis
2. Cree `session_{chatId}` avec toutes les rooms
3. Associe chaque `photoUrl` au bon index
4. Nettoie les cles temporaires (`photo_*`, `album_*`, `style_*`, `autoStart_*`)

---

## 7.9. GenerateRoomOptions.js (302 lignes)

**Fichier :** `n8n/nodes/GenerateRoomOptions.js`

**Role :** Genere 5 options de staging pour la premiere piece.

**Processus :**
1. Envoie la photo originale sur Telegram
2. GPT-4o Vision analyse + genere 5 prompts d'edition Flux
3. 5 appels Flux Kontext Pro via `runPrediction()` (maxRetries: 1)
4. Envoie les 5 photos individuellement
5. Envoie l'inline keyboard (choix 1-5 + regeneration)

**Prompt GPT-4o — regles anti-distorsion :**
- CAMERA LOCK : ne jamais decrire la structure de la piece
- STRUCTURE FREEZE : murs/sol/plafond inchanges pixel-perfect
- PROPORTIONS : dimensions identiques
- Prompts COURTS (2 phrases max entre debut/fin)
- 5 categories differentes : meubles principaux, layout alternatif, decoration, minimal, luxe

**Structural Inventory :** Le `visionData` de BatchVision est injecte dans le prompt utilisateur pour que GPT-4o place les meubles logiquement (eviter de bloquer fenetres/portes).

---

## 7.10. HandleCallbackQuery.js (625 lignes)

**Fichier :** `n8n/nodes/HandleCallbackQuery.js`

**Role :** Machine a etats centrale — gere toutes les interactions inline keyboard.

### Handlers :

**1. `album_go` (lignes 127-190) :**
- Verifie style + photos + pas de session active
- Edit le message du bouton → "Album valide !"
- Retourne les donnees pour DownloadAllPhotos

**2. Selection `sel_{chatId}_{roomIdx}_{1-5}` (lignes 407-623) :**
- Stocke `selectedUrl`
- Edit le keyboard → "Option X selectionnee !"
- Si pieces restantes : avance `currentRoomIndex`, genere options piece suivante
- Si toutes selectionnees : lance le pipeline videos

**3. Regeneration `sel_{chatId}_{roomIdx}_regen` (lignes 393-405) :**
- Max 3 regenerations par piece
- Appelle `generateRoomOptions()` (helper interne)

**4. Pipeline videos (lignes 450-623) :**
- Passe en phase `videos`
- Envoie galerie des photos stagees (sendMediaGroup)
- Boucle Kling v2.1 Pro : video 5s avant→apres par piece
  - `runPrediction()` maxRetries: 1, pollInterval: 10s, maxPolls: 120
- **Chaque video telecharee + envoyee individuellement** (downloadBinary + multipartUpload)
  - Fallback : envoie URL directement si upload echoue
  - Fallback : image statique si video echoue
- Passe en phase `rendering`
- Remotion render via POST `http://172.18.0.1:8000/renders`
- Poll status toutes les 15s
- Download + multipart upload video finale
- Supprime la session

### Helpers internes :
- `httpRequest()`, `post()`, `get()` — HTTP natif (https/http)
- `downloadBinary()` — telecharge un fichier en Buffer
- `multipartUpload()` — envoie une video via multipart form-data a Telegram
- `pollPrediction()` — poll simple Replicate
- `withRetry()` — retry exponentiel
- `runPrediction()` — cycle complet Replicate avec retry
- `generateRoomOptions()` — genere 5 options + keyboard (reutilise pour regen et pieces suivantes)

---

# 8. FICHIERS SOURCES — BUILD & DEPLOY

## 8.1. build-v21.js (731 lignes)

**Fichier :** `n8n/build-v21.js`

**Role :** Assemble tous les nodes JS + les nodes natifs n8n en `workflow-v2.json`.

**Structure :**
1. Lit les 6 fichiers `nodes/*.js` via `readNodeCode()`
2. Definit 3 nodes inline (AccumulatePhoto, SaveStyleChoice, DownloadAllPhotos, BatchVisionAnalysis)
3. Construit l'objet workflow avec 20 noeuds + 11 sources de connexions
4. Ecrit `workflow-v2.json`

---

## 8.2. build-deploy.js (46 lignes)

**Fichier :** `n8n/build-deploy.js`

**Role :** Convertit les IDs lisibles en UUIDs deterministes pour le deploiement.

**Methode :** MD5 hash de `vimimo-v21-{nodeName}` → UUID v4 format

---

## 8.3. deploy-v21.sh (68 lignes)

**Fichier :** `n8n/deploy-v21.sh`

**Etapes :**
1. `node build-v21.js` — genere workflow-v2.json
2. `node build-deploy.js` — genere workflow-v2-deploy.json
3. Supprime `staticData` et `tags` du body
4. POST `/api/v1/workflows/{id}/deactivate`
5. PUT `/api/v1/workflows/{id}` avec le body JSON
6. POST `/api/v1/workflows/{id}/activate`
7. `setWebhook` Telegram avec `max_connections=1`
8. Cleanup fichiers temporaires

---

# 9. FICHIERS SOURCES — REMOTION

## 9.1. Architecture Remotion

```
remotion/
├── Dockerfile              # Node 22 + Chromium
├── server/
│   └── index.ts            # Express render server (port 8000)
└── src/
    ├── index.ts             # Entrypoint (exporte RemotionRoot)
    ├── Root.tsx             # 2 Compositions (VirtualStaging v1 + PropertyShowcase v2)
    ├── Composition.tsx      # v1 speed ramp (deprecated)
    ├── schemas.ts           # Zod schemas v2
    ├── PropertyShowcase.tsx # v2 composition principale
    └── components/
        ├── IntroCard.tsx    # Carte intro (titre + adresse)
        ├── RoomSegment.tsx  # Segment par piece (4 phases)
        ├── SplitReveal.tsx  # Wipe vertical avant/apres
        ├── CinematicOverlay.tsx # Letterbox + vignette
        ├── RoomLabel.tsx    # Label de la piece
        └── OutroCard.tsx    # Carte VIMIMO
```

## 9.2. PropertyShowcase — Timeline

**Constantes :**
| Nom | Frames | Secondes |
|-----|--------|----------|
| INTRO_DUR | 90 | 3.0s |
| ROOM_DUR | 210 | 7.0s |
| CROSSFADE | 20 | 0.67s |
| OUTRO_DUR | 90 | 3.0s |

**Formule de duree totale :**
```
calculateDuration(N) = 90 + N * 210 - (N-1) * 20 + 90
```

| N pieces | Frames | Duree |
|----------|--------|-------|
| 1 | 390 | 13.0s |
| 2 | 580 | 19.3s |
| 3 | 770 | 25.7s |
| 5 | 1150 | 38.3s |
| 10 | 2100 | 70.0s |
| 20 | 4000 | 133.3s |

**`calculateMetadata` dans Root.tsx** adapte dynamiquement la duree en fonction de `props.rooms.length`.

## 9.3. RoomSegment — 4 phases (210 frames = 7s)

| Phase | Frames | Duree | Contenu |
|-------|--------|-------|---------|
| Before photo | 0-42 | 1.4s | Photo originale + badge "AVANT" + Ken Burns |
| SplitReveal | 37-72 | 1.2s | Wipe vertical avant → vide (avec crossfade) |
| Video | 67-182 | 3.8s | OffthreadVideo Kling (avec crossfade) |
| Staged photo | 177-210 | 1.1s | Photo stagee + badge "APRES" + RoomLabel |

Les transitions utilisent des crossfades de 5 frames aux jonctions.

## 9.4. Schemas Zod (schemas.ts)

```typescript
roomSchema = {
  beforePhotoUrl: string (optional),
  originalPhotoUrl: string,
  stagedPhotoUrl: string,
  videoUrl: string,
  roomType: string,
  roomLabel: string
}

propertyShowcaseSchema = {
  property: { title, address?, style },
  rooms: Room[] (1-20)
}
```

## 9.5. Render Server (server/index.ts)

| Endpoint | Methode | Description |
|----------|---------|-------------|
| `/renders` | POST | Lance un rendu (retourne `{id, status}`) |
| `/renders/:id` | GET | Status du rendu (progress %) |
| `/renders/:id/download` | GET | Telecharge le MP4 |
| `/health` | GET | Health check |

- Bundle au demarrage (pre-compile)
- Rendu asynchrone en arriere-plan
- Statuts : `bundling` → `rendering` → `done` / `error`

## 9.6. Docker (Dockerfile)

- Base : `node:22-slim`
- Chromium installe manuellement (pas Puppeteer)
- `CHROMIUM_PATH=/usr/bin/chromium`
- Port 8000
- CMD : `npx tsx server/index.ts`

---

# 10. SYSTEME DE RETRY

## 10.1. withRetry(fn, maxRetries, baseDelay)

```
Delai = baseDelay * 2^attempt
Tentative 0: immediat
Tentative 1: baseDelay (2-3s)
Tentative 2: baseDelay * 2 (4-6s)
Tentative 3: baseDelay * 4 (8-12s)
```

## 10.2. runPrediction(modelUrl, input, headers, opts)

Cycle complet Replicate :
1. **Creer prediction** avec `withRetry(fn, 2, 3000)` — 3 tentatives sur HTTP 429/5xx
2. **Pollir** toutes les `pollInterval` ms, max `maxPolls` iterations
   - Tolere 3 erreurs de poll consecutives avant abandon
3. Si `failed`/`canceled` → retry le cycle entier (jusqu'a `maxRetries`)
4. Retourne l'URL du resultat ou `null`

## 10.3. Configuration par modele

| Modele | maxRetries | pollInterval | maxPolls | Temps max |
|--------|-----------|-------------|---------|-----------|
| Flux Kontext Pro (clean) | 2 | 5s | 60 | ~15min |
| Flux Kontext Pro (staging) | 1 | 5s | 60 | ~10min |
| Kling v2.1 Pro | 1 | 10s | 120 | ~40min |

---

# 11. VARIABLES D'ENVIRONNEMENT ET CREDENTIALS

## 11.1. Variables d'environnement (process.env)

| Variable | Utilisation |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | API Telegram (dans tous les Code nodes) |
| `OPENAI_API_KEY` | API GPT-4o Vision |
| `REPLICATE_API_TOKEN` | API Replicate (Flux, Kling) |

## 11.2. Credentials n8n

| Credential | ID | Usage |
|-----------|-----|-------|
| VIMIMO Telegram Bot | `r3or1rCFrz8TM9ri` | TelegramTrigger + noeud Telegram |
| OpenAI | `NO4ILqvBrfzsbecx` | (non utilise directement — Code nodes) |
| Replicate | `bGeZ2M0KiCK1DBEs` | (non utilise directement — Code nodes) |

## 11.3. Token hardcode (HTTP Request nodes)

Le bot token `8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU` est hardcode dans les URLs de 4 noeuds HTTP Request :
- SendStylesCatalog
- AckStyleKeyboard
- SendStyleConfirmation
- SendProcessingMessage

**Raison :** `$env.VAR_NAME` est bloque dans les expressions n8n v2.4.8.

## 11.4. API n8n

| Parametre | Valeur |
|-----------|--------|
| API Key | JWT (dans deploy-v21.sh) |
| Encryption key | `HxYZ9zZNpJzrLpT/RgWipEkNXi9WoiYo` |

---

# 12. PROCESSUS DE DEPLOIEMENT

```bash
cd /chemin/vers/VIMIMO/n8n
bash deploy-v21.sh
```

**Prerequis :** Variables d'environnement definies sur le VPS n8n.

**Etapes detaillees :**
1. `node build-v21.js` → `workflow-v2.json` (IDs lisibles)
2. `node build-deploy.js` → `workflow-v2-deploy.json` (UUIDs)
3. Deactivate workflow via API
4. PUT workflow via API (body JSON sans staticData/tags)
5. Activate workflow via API
6. `setWebhook` Telegram avec `max_connections=1` + `allowed_updates`

**Verification post-deploy :**
```bash
# Webhook actif ?
curl "https://api.telegram.org/bot{TOKEN}/getWebhookInfo"

# Workflow actif ?
curl -s "https://n8n.srv1129073.hstgr.cloud/api/v1/workflows/ZlSOfh3wPav4DGPE" \
  -H "X-N8N-API-KEY: {KEY}" | jq .active

# Logs n8n
ssh root@VPS "docker logs root-n8n-1 --tail 50"
```

---

# 13. BUGS CONNUS ET CORRIGES

| # | Bug | Cause | Correction |
|---|-----|-------|------------|
| 1 | `process is not defined` | n8n v2.4.8 Task Runner | `const process = require('process')` dans tous les Code nodes |
| 2 | `access to env vars denied` | n8n v2.4.8 bloque `$env` | Token hardcode dans HTTP Request URLs |
| 3 | `Not Found` dans DownloadAllPhotos | file_id Telegram expires apres ~30min | Filtre 30min dans StartProcessing + try/catch continue |
| 4 | AutoStartCheck ne detecte pas les albums | Mauvais prefixe `album_` vs `mg_` | Corrige en `mg_{chatId}_` |
| 5 | Webhook rate limiting | Appels trop rapides a setWebhook | Sleep 2s + retry |
| 6 | IF node boolean coercion | n8n v2 `false` → truthy | Logique dans Code nodes avec `return []` |
| 7 | sendVideo echoue depuis n8n | Telegram ne peut pas telecharger depuis IP:port interne | multipartUpload (download buffer + upload multipart) |
| 8 | axios crash dans sandbox | `Error.message` read-only | Remplace par https natif |

---

# 14. FAILLES ET RECOMMANDATIONS

## 14.1. Securite

| Severite | Faille | Recommandation |
|----------|--------|----------------|
| HAUTE | Bot token hardcode dans build-v21.js et workflow JSON | Migrer vers process.env exclusivement quand n8n fixera $env |
| HAUTE | API key n8n en clair dans deploy-v21.sh | Utiliser un fichier .env ou secret manager |
| MOYENNE | Pas de validation chatId (n'importe qui peut utiliser le bot) | Ajouter whitelist de chatIds autorises |
| BASSE | Credentials n8n IDs en clair dans le code | Acceptable pour dev, a securiser en prod |

## 14.2. Robustesse

| Severite | Probleme | Recommandation |
|----------|---------|----------------|
| HAUTE | HandleCallbackQuery est un monolithe de 625 lignes | Splitter en fichiers separes (albumGo.js, selection.js, videoPipeline.js) |
| HAUTE | Pas de timeout global sur les sessions | Ajouter un cron/webhook periodique pour nettoyer les sessions bloquees |
| MOYENNE | InitializeSession nettoie `album_*` mais le prefix est `mg_*` | Corriger pour nettoyer `mg_{chatId}_*` aussi |
| MOYENNE | Pas de gestion de la concurrence (2 users simultanees) | staticData est global — les sessions sont isolees par chatId, OK |
| BASSE | Remotion render pas de timeout | Le poll dans HandleCallbackQuery n'a pas de maxPolls, boucle infinie possible |

## 14.3. Fonctionnel

| Priorite | Amelioration | Description |
|----------|-------------|-------------|
| HAUTE | Prise en charge des erreurs Remotion | Si le serveur Remotion est down, l'utilisateur ne recoit aucun feedback |
| MOYENNE | Historique utilisateur | Stocker les rendus precedents pour reprise |
| MOYENNE | Progres en temps reel | Envoyer le % de progression Remotion sur Telegram |
| BASSE | Multi-langue | Actuellement tout en francais |

## 14.4. Performance

| Priorite | Probleme | Recommandation |
|----------|---------|----------------|
| HAUTE | 5 appels Flux sequentiels par piece (2s entre chaque) | Paralleliser les 5 appels Flux (Promise.all avec rate limiting) |
| MOYENNE | Videos Kling sequentielles | Paralleliser 2-3 videos simultanement |
| BASSE | Bundle Remotion au demarrage du container | Pre-build le bundle dans le Dockerfile |

---

# RESUME DES FICHIERS

| Fichier | Lignes | Role |
|---------|--------|------|
| `n8n/nodes/StartProcessing.js` | 114 | Validation /go + collecte photos |
| `n8n/nodes/InitializeSession.js` | 48 | Creation session interactive |
| `n8n/nodes/GenerateRoomOptions.js` | 302 | 5 options staging (GPT-4o + Flux) |
| `n8n/nodes/HandleCallbackQuery.js` | 625 | Machine a etats centrale |
| `n8n/nodes/CleanPhotos.js` | 159 | Nettoyage meubles (Flux + retry) |
| `n8n/nodes/AutoStartCheck.js` | 52 | Auto-declenchement album+style |
| `n8n/build-v21.js` | 731 | Assembleur workflow (20 noeuds) |
| `n8n/build-deploy.js` | 46 | Conversion IDs → UUIDs |
| `n8n/deploy-v21.sh` | 68 | Script de deploiement |
| `remotion/src/Root.tsx` | 149 | Compositions Remotion (v1+v2) |
| `remotion/src/PropertyShowcase.tsx` | 117 | Composition multi-room |
| `remotion/src/schemas.ts` | 27 | Schemas Zod v2 |
| `remotion/src/components/RoomSegment.tsx` | 160 | Segment par piece (4 phases) |
| `remotion/src/components/SplitReveal.tsx` | 55 | Wipe vertical |
| `remotion/src/components/IntroCard.tsx` | 62 | Carte intro |
| `remotion/src/components/OutroCard.tsx` | 53 | Carte outro |
| `remotion/src/components/CinematicOverlay.tsx` | 43 | Letterbox + vignette |
| `remotion/src/components/RoomLabel.tsx` | 45 | Label piece |
| `remotion/server/index.ts` | 137 | Serveur Express Remotion |
| `remotion/Dockerfile` | 37 | Docker image |
| **TOTAL** | **~3030** | |
