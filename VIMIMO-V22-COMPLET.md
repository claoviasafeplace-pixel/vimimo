# VIMIMO v2.2 — Document Complet (Code + Workflow + Architecture)

*20 fevrier 2026*

---

## TABLE DES MATIERES

1. [Vue d'ensemble](#1-vue-densemble)
2. [Infrastructure](#2-infrastructure)
3. [Flow utilisateur](#3-flow-utilisateur)
4. [Architecture workflow n8n](#4-architecture-workflow-n8n)
5. [Code n8n — Nodes](#5-code-n8n--nodes)
6. [Code n8n — Build & Deploy](#6-code-n8n--build--deploy)
7. [Code Remotion — Schemas & Compositions](#7-code-remotion--schemas--compositions)
8. [Code Remotion — Components](#8-code-remotion--components)
9. [Code Remotion — Server & Docker](#9-code-remotion--server--docker)
10. [Data Flow beforePhotoUrl](#10-data-flow-beforephotourl)
11. [Contraintes techniques](#11-contraintes-techniques)
12. [Bug fixes historiques](#12-bug-fixes-historiques)
13. [Changelog](#13-changelog)

---

## 1. Vue d'ensemble

**VIMIMO** = pipeline Virtual Staging IA automatise via Telegram Bot.

```
Photos pieces → Nettoyage IA (suppression meubles) → Analyse GPT-4o →
5 options staging Flux → Selection utilisateur → Videos Kling →
Montage Remotion (AVANT/APRES) → Video finale Telegram
```

| Composant | Technologie | Role |
|-----------|------------|------|
| Orchestration | n8n (self-hosted) | Workflow, state machine |
| Interface | Telegram Bot | Photos, selection inline, videos |
| Analyse | GPT-4o Vision | Identification pieces, inventaire structurel |
| Nettoyage | Flux Kontext Pro (Replicate) | Suppression meubles existants |
| Staging | Flux Kontext Pro (Replicate) | 5 options d'ameublement par piece |
| Video | Kling v2.1 Pro (Replicate) | Morphing original → stage |
| Montage | Remotion (React/Node.js) | Composition AVANT/APRES |
| Hebergement | VPS Hostinger | n8n + Remotion Docker |

---

## 2. Infrastructure

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

| Ressource | Valeur |
|-----------|--------|
| n8n URL | `https://n8n.srv1129073.hstgr.cloud` |
| Workflow ID | `ZlSOfh3wPav4DGPE` |
| Bot Telegram | `@VIMIMO_bot` (ID: 8120972729) |
| User Telegram | chat_id `559474177` (@madein4501) |
| Remotion server | `http://172.18.0.1:8000` (Docker interne) |
| Remotion source VPS | `/opt/vimimo-render/` |
| Webhook | `max_connections=1` |

---

## 3. Flow utilisateur

**Phase 1 — Collecte** : Photos + style → stockage staticData
**Phase 2 — Preparation** : /go → Download → CleanPhotos → BatchVision → InitializeSession
**Phase 3 — Selection** : 5 options par piece → clavier inline → choix utilisateur
**Phase 4 — Videos** : Kling par piece → envoi individuel → Remotion montage → video finale

---

## 4. Architecture workflow n8n

### Connexions (20 nodes)

```
TelegramBot ──→ CommandRouter (Switch, 9 outputs)
                  ├─ [0] /start    → SendWelcome
                  ├─ [1] /styles   → SendStylesCatalog
                  ├─ [2] /exemples → SendExamples
                  ├─ [3] /aide     → SendTips
                  ├─ [4] /go       → StartProcessing ─┬→ DownloadAllPhotos → CleanPhotos
                  │                                    │    → BatchVisionAnalysis
                  │                                    │         → InitializeSession
                  │                                    │              → GenerateRoomOptions
                  │                                    └→ SendProcessingMessage
                  ├─ [5] media     → AccumulatePhoto → AckStyleKeyboard
                  ├─ [6] style     → SaveStyleChoice ─┬→ SendStyleConfirmation
                  │                                    └→ AutoStartCheck ─┬→ DownloadAll...
                  │                                                       └→ SendProcessing...
                  ├─ [7] callback  → HandleCallbackQuery
                  └─ [8] fallback  → SendDefault
```

### Machine a etats (staticData)

```
selecting  ←→  HandleCallbackQuery (selection/regen/next room)
     ↓ (toutes les pieces selectionnees)
videos     ←→  Kling v2.1 Pro par piece + envoi individuel
     ↓ (toutes les videos generees)
rendering  ←→  Remotion compile → envoi final → delete session
```

**Structure session :**
```javascript
staticData[`session_${chatId}`] = {
  phase: "selecting" | "videos" | "rendering",
  createdAt, updatedAt, style, styleLabel,
  currentRoomIndex: 0,
  totalRooms: 3,
  rooms: [{
    index, roomType, roomLabel,
    photoUrl: "cleaned.jpg",            // Photo nettoyee
    beforePhotoUrl: "original.jpg",     // Photo originale avec meubles (v2.2)
    visionData: { /* GPT-4o */ },
    options: ["url1"..."url5"],
    galleryMessageId, selectedUrl,
    regenerationCount: 0
  }]
};
```

---

## 5. Code n8n — Nodes

### 5.1 `n8n/nodes/StartProcessing.js`

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

const staticData = $getWorkflowStaticData('global');
const msg = $input.first().json.message;
const chatId = String(msg.chat.id);

async function sendTelegramError(text) {
  await post('https://api.telegram.org/bot8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU/sendMessage', {
    chat_id: chatId, text, parse_mode: 'Markdown'
  });
}

// Clean expired sessions (> 15min inactivity)
const now = Date.now();
const fifteenMin = 15 * 60 * 1000;
Object.keys(staticData).filter(k => k.startsWith('session_')).forEach(k => {
  if (staticData[k].updatedAt && (now - staticData[k].updatedAt) > fifteenMin) {
    delete staticData[k];
  }
});

// Check for active session (only block if recently active)
const sessionKey = `session_${chatId}`;
if (staticData[sessionKey] && staticData[sessionKey].phase === 'selecting') {
  const sessionAge = now - (staticData[sessionKey].updatedAt || 0);
  if (sessionAge < fifteenMin) {
    await sendTelegramError('⚠️ Vous avez déjà un staging en cours !\n\nTerminez vos sélections ou attendez quelques minutes avant de relancer /go.');
    return [];
  }
  delete staticData[sessionKey];
  await post('https://api.telegram.org/bot8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU/sendMessage', {
    chat_id: chatId, text: '🔄 Session précédente expirée, relancement...', parse_mode: 'Markdown'
  });
}

// Clear transient keys
delete staticData[`autoStart_${chatId}`];
Object.keys(staticData).filter(k => k.startsWith(`mg_${chatId}_`)).forEach(k => delete staticData[k]);

const photoPrefix = `photo_${chatId}_`;
const photoKeys = Object.keys(staticData).filter(k => k.startsWith(photoPrefix));
const photos = photoKeys.map(k => staticData[k]).sort((a, b) => a.timestamp - b.timestamp);

if (photos.length === 0) {
  await sendTelegramError('⚠️ Aucune photo en attente !\n\nEnvoyez des photos puis tapez /go.');
  return [];
}

const styleKey = `style_${chatId}`;
const styleData = staticData[styleKey];
if (!styleData || !styleData.style) {
  await sendTelegramError('⚠️ Aucun style sélectionné !\n\nChoisissez un style avant /go.');
  return [];
}

const result = {
  chatId, photos,
  style: styleData.style,
  styleLabel: styleData.label || 'Moderne',
  totalPhotos: photos.length
};

return [{ json: result }];
```

---

### 5.2 `n8n/nodes/CleanPhotos.js`

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

const data = $input.first().json;
const replicateToken = 'REPLICATE_TOKEN_REDACTED';
const repHeaders = { 'Authorization': `Bearer ${replicateToken}` };

const cleanedUrls = [];

for (const photo of data.photoUrls) {
  try {
    const resp = await post('https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions', {
      input: {
        prompt: 'Edit this exact photo, keep camera angle, perspective, and structure 100% identical: Remove ALL movable furniture, beds, sofas, tables, chairs, boxes, clothes, clutter, and decorations. Keep ONLY the bare room structure: walls, floor texture and material unchanged, ceiling, windows, doors, radiators, electrical outlets, light switches, ceiling lights, built-in closets, and all fixed architectural elements. The room must appear completely empty but structurally identical. Photorealistic, exact room proportions, exact floor material, no distortion, camera locked.',
        input_image: photo.url,
        aspect_ratio: 'match_input_image',
        output_format: 'jpg',
        safety_tolerance: 2
      }
    }, repHeaders);

    if (resp.data.id) {
      let predData;
      for (let attempt = 0; attempt < 60; attempt++) {
        await new Promise(r => setTimeout(r, 5000));
        const pollResp = await get(`https://api.replicate.com/v1/predictions/${resp.data.id}`, repHeaders);
        predData = pollResp.data;
        if (['succeeded', 'failed', 'canceled'].includes(predData.status)) break;
      }
      if (predData && predData.status === 'succeeded' && predData.output) {
        const cleanUrl = Array.isArray(predData.output) ? predData.output[0] : predData.output;
        cleanedUrls.push({ ...photo, url: cleanUrl, originalUrl: photo.url });
        continue;
      }
    }
  } catch (e) { /* fallback to original on error */ }

  // Fallback: keep original URL if cleaning failed
  cleanedUrls.push(photo);
}

return [{ json: { ...data, photoUrls: cleanedUrls } }];
```

---

### 5.3 `n8n/nodes/InitializeSession.js`

```javascript
const staticData = $getWorkflowStaticData('global');
const data = $input.first().json;
const visionRaw = data.visionAnalysis;
const chatId = data.chatId;

// Parse vision analysis
let cleaned = visionRaw.trim();
if (cleaned.startsWith('```')) {
  cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
}
const analysis = JSON.parse(cleaned);

// Create session
const sessionKey = `session_${chatId}`;
const photoUrls = data.photoUrls;

staticData[sessionKey] = {
  phase: 'selecting',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  style: data.style,
  styleLabel: data.styleLabel,
  currentRoomIndex: 0,
  totalRooms: analysis.rooms.length,
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
};

// Clean up accumulated photo/style/album/autoStart keys
const photoPrefix = `photo_${chatId}_`;
Object.keys(staticData).filter(k => k.startsWith(photoPrefix)).forEach(k => delete staticData[k]);
const albumPrefix = `album_${chatId}_`;
Object.keys(staticData).filter(k => k.startsWith(albumPrefix)).forEach(k => delete staticData[k]);
delete staticData[`style_${chatId}`];
delete staticData[`autoStart_${chatId}`];

return [{ json: { chatId, session: staticData[sessionKey] } }];
```

---

### 5.4 `n8n/nodes/AutoStartCheck.js`

```javascript
// AutoStartCheck — Auto-trigger pipeline when album + style are both ready
const staticData = $getWorkflowStaticData('global');
const data = $input.first().json;
const chatId = data.chatId;
const fifteenMin = 15 * 60 * 1000;

// Only auto-trigger if an album was sent (not for individual photos)
const albumPrefix = `album_${chatId}_`;
const hasAlbum = Object.keys(staticData).some(k => k.startsWith(albumPrefix));
if (!hasAlbum) return [];

// Check style is set
const styleKey = `style_${chatId}`;
const styleData = staticData[styleKey];
if (!styleData || !styleData.style) return [];

// Check photos exist
const photoPrefix = `photo_${chatId}_`;
const photoKeys = Object.keys(staticData).filter(k => k.startsWith(photoPrefix));
const photos = photoKeys.map(k => staticData[k]).sort((a, b) => a.timestamp - b.timestamp);
if (photos.length === 0) return [];

// Check no active session
const sessionKey = `session_${chatId}`;
if (staticData[sessionKey]) {
  const sessionAge = Date.now() - (staticData[sessionKey].updatedAt || staticData[sessionKey].createdAt || 0);
  if (sessionAge < fifteenMin) return [];
  delete staticData[sessionKey];
}

// Prevent multiple auto-triggers
const autoKey = `autoStart_${chatId}`;
if (staticData[autoKey] && (Date.now() - staticData[autoKey]) < fifteenMin) return [];
staticData[autoKey] = Date.now();

return [{ json: {
  chatId, photos,
  style: styleData.style,
  styleLabel: styleData.label || 'Moderne',
  totalPhotos: photos.length,
  fromAlbum: true
}}];
```

---

### 5.5 `n8n/nodes/GenerateRoomOptions.js`

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

function downloadBinary(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const opts = {
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method: 'GET'
    };
    const req = lib.request(opts, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('download timeout')); });
    req.end();
  });
}

function multipartUpload(botToken, chatId, videoBuffer, caption) {
  return new Promise((resolve, reject) => {
    const boundary = '----VimimoForm' + Date.now();
    const fields = [
      { name: 'chat_id', value: String(chatId) },
      { name: 'caption', value: caption },
      { name: 'parse_mode', value: 'Markdown' }
    ];
    let preFile = '';
    for (const f of fields) {
      preFile += '--' + boundary + '\r\n';
      preFile += 'Content-Disposition: form-data; name="' + f.name + '"\r\n\r\n';
      preFile += f.value + '\r\n';
    }
    preFile += '--' + boundary + '\r\n';
    preFile += 'Content-Disposition: form-data; name="video"; filename="vimimo.mp4"\r\n';
    preFile += 'Content-Type: video/mp4\r\n\r\n';
    const postFile = '\r\n--' + boundary + '--\r\n';
    const preBuffer = Buffer.from(preFile, 'utf-8');
    const postBuffer = Buffer.from(postFile, 'utf-8');
    const body = Buffer.concat([preBuffer, videoBuffer, postBuffer]);
    const options = {
      hostname: 'api.telegram.org',
      path: '/bot' + botToken + '/sendVideo',
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': body.length
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ ok: false, description: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('upload timeout')); });
    req.write(body);
    req.end();
  });
}

async function pollPrediction(predId, headers) {
  let predData;
  for (let attempt = 0; attempt < 120; attempt++) {
    await new Promise(r => setTimeout(r, 10000));
    const resp = await get(`https://api.replicate.com/v1/predictions/${predId}`, headers);
    predData = resp.data;
    if (['succeeded', 'failed', 'canceled'].includes(predData.status)) return predData;
  }
  return predData;
}

const staticData = $getWorkflowStaticData('global');
const data = $input.first().json;
const chatId = data.chatId;
const sessionKey = `session_${chatId}`;
const session = staticData[sessionKey];

if (!session) throw new Error('No session found for chatId ' + chatId);

const roomIdx = session.currentRoomIndex;
const room = session.rooms[roomIdx];

const botToken = '8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU';
const openaiKey = 'OPENAI_KEY_REDACTED';
const replicateToken = 'REPLICATE_TOKEN_REDACTED';
const repHeaders = { 'Authorization': `Bearer ${replicateToken}` };

// 1. Send original photo
await post(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
  chat_id: Number(chatId),
  photo: room.photoUrl,
  caption: `📷 Pièce ${roomIdx + 1}/${session.totalRooms} : *${room.roomLabel}*\n\n⏳ Génération de 5 options de staging...`,
  parse_mode: 'Markdown'
});

// 2. GPT-4o VISION: analyze photo + generate 5 EDITING prompts
const promptResp = await post('https://api.openai.com/v1/chat/completions', {
  model: 'gpt-4o', temperature: 0.5, max_tokens: 2000,
  messages: [
    { role: 'system', content: 'You are an expert at writing image EDITING prompts for Flux Kontext Pro.\n\nYou will receive a PHOTO of an empty room. Analyze it carefully: the exact wall colors, floor material, window positions, door locations, ceiling type, lighting conditions, and camera perspective.\n\nThen write 5 EDITING prompts that ONLY add furniture/decor to this exact photo.\n\nCRITICAL ANTI-DISTORTION RULES:\n1. CAMERA LOCK: NEVER describe the room itself (walls, floor, windows, ceiling). Flux Kontext Pro already sees the photo — describing structure CAUSES DISTORTION and warping.\n2. STRUCTURE FREEZE: Walls, floor, ceiling, windows, doors must remain PIXEL-PERFECT. Never push, move, resize, or modify any structural element.\n3. PROPORTIONS: Room dimensions, window sizes, door heights must keep IDENTICAL ratios. Furniture must be proportional to the room.\n4. Start every prompt with: "Edit this exact photo, keep camera angle, perspective, and room structure 100% identical. Add [specific furniture] to this room."\n5. End every prompt with: "Keep all walls, floor, windows, doors, ceiling unchanged. Photorealistic, exact room proportions, no distortion, camera locked."\n6. Reference spatial positions from the photo (e.g., "along the back wall", "in front of the window").\n7. Only mention furniture, rugs, artwork, plants, lamps, decorative objects. NO structural changes.\n8. Keep each prompt SHORT (2 sentences MAX between the start/end). Longer prompts = more distortion.\n9. Generate exactly 5 prompts with DIFFERENT approaches:\n   - Prompt 1: MAIN FURNITURE (sofa, bed, table, chairs)\n   - Prompt 2: DIFFERENT MAIN FURNITURE layout\n   - Prompt 3: DECORATION focus (art, plants, cushions, rugs, curtains)\n   - Prompt 4: COMPLETE but MINIMAL setup\n   - Prompt 5: LUXURIOUS/FULL setup\n   All 5 must keep the SAME design style but vary in density and focus.\n\nRespond in JSON: { "analysis": "Brief 1-line description of what you see", "prompts": ["prompt1", "prompt2", "prompt3", "prompt4", "prompt5"] }\nNo markdown, ONLY valid JSON.' },
    { role: 'user', content: [
      { type: 'text', text: `Room: ${room.roomType} (${room.roomLabel}). Style to apply: ${session.style} (${session.styleLabel}).\n\nSTRUCTURAL INVENTORY (from prior analysis — DO NOT modify these):\n${JSON.stringify(room.visionData, null, 2)}\n\nGenerate 5 editing prompts for this photo. Use the structural inventory to place furniture logically (avoid blocking windows/doors, respect room dimensions).` },
      { type: 'image_url', image_url: { url: room.photoUrl } }
    ] }
  ]
}, { 'Authorization': `Bearer ${openaiKey}` });

let promptsRaw = promptResp.data.choices[0].message.content.trim();
if (promptsRaw.startsWith('```')) {
  promptsRaw = promptsRaw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
}
const promptsData = JSON.parse(promptsRaw);
const prompts = promptsData.prompts;
if (promptsData.analysis) {
  await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: Number(chatId),
    text: `🔍 Analyse : ${promptsData.analysis}`
  });
}

// 3. Start 5 Flux Kontext Pro predictions
const predIds = [];
for (let i = 0; i < 5; i++) {
  try {
    const resp = await post('https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions', {
      input: {
        prompt: prompts[i] + ' Photorealistic, exact room proportions, no distortion, camera locked.',
        input_image: room.photoUrl,
        aspect_ratio: 'match_input_image',
        output_format: 'jpg',
        safety_tolerance: 2,
        seed: Math.floor(Math.random() * 999999)
      }
    }, repHeaders);
    if (resp.data.id) predIds.push(resp.data.id);
  } catch (e) { /* skip failed starts */ }
  if (i < 4) await new Promise(r => setTimeout(r, 3000));
}

// 4. Poll all predictions
const options = [];
for (const predId of predIds) {
  let predData;
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise(r => setTimeout(r, 5000));
    const resp = await get(`https://api.replicate.com/v1/predictions/${predId}`, repHeaders);
    predData = resp.data;
    if (['succeeded', 'failed', 'canceled'].includes(predData.status)) break;
  }
  if (predData && predData.status === 'succeeded' && predData.output) {
    options.push(Array.isArray(predData.output) ? predData.output[0] : predData.output);
  }
}

if (options.length === 0) {
  await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: Number(chatId),
    text: `⚠️ Échec de la génération pour ${room.roomLabel}. Relancez /go.`
  });
  delete staticData[sessionKey];
  return [];
}

// 5. Store options in session
room.options = options;
session.updatedAt = Date.now();

// 6. Send option photos individually
for (let i = 0; i < options.length; i++) {
  await post(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    chat_id: Number(chatId),
    photo: options[i],
    caption: `Option ${i + 1}/${options.length}`
  });
  await new Promise(r => setTimeout(r, 500));
}

// 7. Send inline keyboard
const keyboard = {
  inline_keyboard: [
    options.map((_, i) => ({ text: `${i + 1}`, callback_data: `sel_${chatId}_${roomIdx}_${i + 1}` })),
    [{ text: '🔄 Nouvelles options', callback_data: `sel_${chatId}_${roomIdx}_regen` }]
  ]
};

const kbResp = await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
  chat_id: Number(chatId),
  text: `🎨 *Pièce ${roomIdx + 1}/${session.totalRooms} : ${room.roomLabel}*\n\nChoisissez votre staging préféré :`,
  parse_mode: 'Markdown',
  reply_markup: keyboard
});

if (kbResp.data && kbResp.data.ok && kbResp.data.result) {
  room.galleryMessageId = kbResp.data.result.message_id;
}

return [{ json: { ok: true, chatId, roomIndex: roomIdx } }];
```

---

### 5.6 `n8n/nodes/HandleCallbackQuery.js`

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

function downloadBinary(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const opts = {
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method: 'GET'
    };
    const req = lib.request(opts, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('download timeout')); });
    req.end();
  });
}

function multipartUpload(botToken, chatId, videoBuffer, caption) {
  return new Promise((resolve, reject) => {
    const boundary = '----VimimoForm' + Date.now();
    const fields = [
      { name: 'chat_id', value: String(chatId) },
      { name: 'caption', value: caption },
      { name: 'parse_mode', value: 'Markdown' }
    ];
    let preFile = '';
    for (const f of fields) {
      preFile += '--' + boundary + '\r\n';
      preFile += 'Content-Disposition: form-data; name="' + f.name + '"\r\n\r\n';
      preFile += f.value + '\r\n';
    }
    preFile += '--' + boundary + '\r\n';
    preFile += 'Content-Disposition: form-data; name="video"; filename="vimimo.mp4"\r\n';
    preFile += 'Content-Type: video/mp4\r\n\r\n';
    const postFile = '\r\n--' + boundary + '--\r\n';
    const preBuffer = Buffer.from(preFile, 'utf-8');
    const postBuffer = Buffer.from(postFile, 'utf-8');
    const body = Buffer.concat([preBuffer, videoBuffer, postBuffer]);
    const options = {
      hostname: 'api.telegram.org',
      path: '/bot' + botToken + '/sendVideo',
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': body.length
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ ok: false, description: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('upload timeout')); });
    req.write(body);
    req.end();
  });
}

const staticData = $getWorkflowStaticData('global');
const cbq = $input.first().json.callback_query;
const callbackId = cbq.id;
const chatId = String(cbq.message.chat.id);
const cbData = cbq.data;

const botToken = '8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU';
const openaiKey = 'OPENAI_KEY_REDACTED';
const replicateToken = 'REPLICATE_TOKEN_REDACTED';
const repHeaders = { 'Authorization': `Bearer ${replicateToken}` };

// Answer callback query immediately
await post(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
  callback_query_id: callbackId
});

// Parse callback data: sel_{chatId}_{roomIndex}_{choice}
const parts = cbData.split('_');
if (parts[0] !== 'sel' || parts.length !== 4) {
  return [{ json: { error: 'invalid callback data', raw: cbData } }];
}

const sessionChatId = parts[1];
const roomIdx = parseInt(parts[2]);
const choice = parts[3];

const sessionKey = `session_${sessionChatId}`;
const session = staticData[sessionKey];

if (!session) {
  await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: Number(chatId),
    text: '⚠️ Session expirée. Envoyez de nouvelles photos + /go pour relancer.'
  });
  return [{ json: { error: 'no session' } }];
}

const room = session.rooms[roomIdx];

// === Helper: generate 5 staging options for a room ===
async function generateRoomOptions(roomData, rIdx) {
  await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: Number(chatId),
    text: `⏳ Génération de 5 options pour *${roomData.roomLabel}*...`,
    parse_mode: 'Markdown'
  });

  const promptResp = await post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4o', temperature: 0.5, max_tokens: 2000,
    messages: [
      { role: 'system', content: 'You are an expert at writing image EDITING prompts for Flux Kontext Pro.\n\nYou will receive a PHOTO of an empty room. Analyze it carefully: the exact wall colors, floor material, window positions, door locations, ceiling type, lighting conditions, and camera perspective.\n\nThen write 5 EDITING prompts that ONLY add furniture/decor to this exact photo.\n\nCRITICAL ANTI-DISTORTION RULES:\n1. CAMERA LOCK: NEVER describe the room itself (walls, floor, windows, ceiling). Flux Kontext Pro already sees the photo — describing structure CAUSES DISTORTION and warping.\n2. STRUCTURE FREEZE: Walls, floor, ceiling, windows, doors must remain PIXEL-PERFECT. Never push, move, resize, or modify any structural element.\n3. PROPORTIONS: Room dimensions, window sizes, door heights must keep IDENTICAL ratios. Furniture must be proportional to the room.\n4. Start every prompt with: "Edit this exact photo, keep camera angle, perspective, and room structure 100% identical. Add [specific furniture] to this room."\n5. End every prompt with: "Keep all walls, floor, windows, doors, ceiling unchanged. Photorealistic, exact room proportions, no distortion, camera locked."\n6. Reference spatial positions from the photo (e.g., "along the back wall", "in front of the window").\n7. Only mention furniture, rugs, artwork, plants, lamps, decorative objects. NO structural changes.\n8. Keep each prompt SHORT (2 sentences MAX between the start/end). Longer prompts = more distortion.\n9. Generate exactly 5 prompts with DIFFERENT approaches:\n   - Prompt 1: MAIN FURNITURE (sofa, bed, table, chairs)\n   - Prompt 2: DIFFERENT MAIN FURNITURE layout\n   - Prompt 3: DECORATION focus (art, plants, cushions, rugs, curtains)\n   - Prompt 4: COMPLETE but MINIMAL setup\n   - Prompt 5: LUXURIOUS/FULL setup\n   All 5 must keep the SAME design style but vary in density and focus.\n\nRespond in JSON: { "analysis": "Brief 1-line description of what you see", "prompts": ["prompt1", "prompt2", "prompt3", "prompt4", "prompt5"] }\nNo markdown, ONLY valid JSON.' },
      { role: 'user', content: [
        { type: 'text', text: `Room: ${roomData.roomType} (${roomData.roomLabel}). Style to apply: ${session.style} (${session.styleLabel}).\n\nSTRUCTURAL INVENTORY (from prior analysis — DO NOT modify these):\n${JSON.stringify(roomData.visionData, null, 2)}\n\nGenerate 5 editing prompts for this photo. Use the structural inventory to place furniture logically (avoid blocking windows/doors, respect room dimensions).` },
        { type: 'image_url', image_url: { url: roomData.photoUrl } }
      ] }
    ]
  }, { 'Authorization': `Bearer ${openaiKey}` });

  let promptsRaw = promptResp.data.choices[0].message.content.trim();
  if (promptsRaw.startsWith('```')) {
    promptsRaw = promptsRaw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  const promptsData = JSON.parse(promptsRaw);
  const prompts = promptsData.prompts;
  if (promptsData.analysis) {
    await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: Number(chatId),
      text: `🔍 Analyse : ${promptsData.analysis}`
    });
  }

  const predIds = [];
  for (let i = 0; i < 5; i++) {
    try {
      const resp = await post('https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions', {
        input: {
          prompt: prompts[i] + ' Photorealistic, exact room proportions, no distortion, camera locked.',
          input_image: roomData.photoUrl,
          aspect_ratio: 'match_input_image',
          output_format: 'jpg',
          safety_tolerance: 2,
          seed: Math.floor(Math.random() * 999999)
        }
      }, repHeaders);
      if (resp.data.id) predIds.push(resp.data.id);
    } catch (e) { /* skip */ }
    if (i < 4) await new Promise(r => setTimeout(r, 3000));
  }

  const options = [];
  for (const predId of predIds) {
    let predData;
    for (let attempt = 0; attempt < 60; attempt++) {
      await new Promise(r => setTimeout(r, 5000));
      const resp = await get(`https://api.replicate.com/v1/predictions/${predId}`, repHeaders);
      predData = resp.data;
      if (['succeeded', 'failed', 'canceled'].includes(predData.status)) break;
    }
    if (predData && predData.status === 'succeeded' && predData.output) {
      options.push(Array.isArray(predData.output) ? predData.output[0] : predData.output);
    }
  }

  if (options.length === 0) {
    await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: Number(chatId),
      text: `⚠️ Échec de la génération pour ${roomData.roomLabel}. Réessayez.`
    });
    return false;
  }

  roomData.options = options;

  for (let i = 0; i < options.length; i++) {
    await post(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      chat_id: Number(chatId),
      photo: options[i],
      caption: `Option ${i + 1}/${options.length}`
    });
    await new Promise(r => setTimeout(r, 500));
  }

  const keyboard = {
    inline_keyboard: [
      options.map((_, i) => ({ text: `${i + 1}`, callback_data: `sel_${chatId}_${rIdx}_${i + 1}` })),
      [{ text: '🔄 Nouvelles options', callback_data: `sel_${chatId}_${rIdx}_regen` }]
    ]
  };

  const kbResp = await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: Number(chatId),
    text: `🎨 *Pièce ${rIdx + 1}/${session.totalRooms} : ${roomData.roomLabel}*\n\nChoisissez votre staging préféré :`,
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });

  if (kbResp.data && kbResp.data.ok && kbResp.data.result) {
    roomData.galleryMessageId = kbResp.data.result.message_id;
  }

  session.updatedAt = Date.now();
  return true;
}

// === Helper: poll Replicate prediction ===
async function pollPrediction(predId) {
  let predData;
  for (let attempt = 0; attempt < 120; attempt++) {
    await new Promise(r => setTimeout(r, 10000));
    const resp = await get(`https://api.replicate.com/v1/predictions/${predId}`, repHeaders);
    predData = resp.data;
    if (['succeeded', 'failed', 'canceled'].includes(predData.status)) return predData;
  }
  return predData;
}

// ==========================================================
// MAIN LOGIC
// ==========================================================

if (choice === 'regen') {
  if (room.regenerationCount >= 3) {
    await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: Number(chatId),
      text: '⚠️ Maximum 3 régénérations par pièce atteint.\nVeuillez choisir parmi les options proposées.'
    });
    return [{ json: { ok: true, action: 'regen_limit' } }];
  }

  room.regenerationCount++;
  await generateRoomOptions(room, roomIdx);
  return [{ json: { ok: true, action: 'regen', roomIndex: roomIdx } }];

} else {
  const choiceIdx = parseInt(choice) - 1;
  if (choiceIdx < 0 || choiceIdx >= room.options.length) {
    return [{ json: { error: 'invalid choice index' } }];
  }

  room.selectedUrl = room.options[choiceIdx];
  session.updatedAt = Date.now();

  if (room.galleryMessageId) {
    try {
      await post(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        chat_id: Number(chatId),
        message_id: room.galleryMessageId,
        text: `✅ *${room.roomLabel}* — Option ${choice} sélectionnée !`,
        parse_mode: 'Markdown'
      });
    } catch (e) { /* ignore */ }
  }

  const allSelected = session.rooms.every(r => r.selectedUrl !== null);

  if (!allSelected) {
    const nextIdx = roomIdx + 1;
    session.currentRoomIndex = nextIdx;
    const nextRoom = session.rooms[nextIdx];

    await post(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      chat_id: Number(chatId),
      photo: nextRoom.photoUrl,
      caption: `📷 Pièce ${nextIdx + 1}/${session.totalRooms} : *${nextRoom.roomLabel}*`,
      parse_mode: 'Markdown'
    });

    await generateRoomOptions(nextRoom, nextIdx);
    return [{ json: { ok: true, action: 'next_room', roomIndex: nextIdx } }];

  } else {
    // === ALL ROOMS SELECTED — LAUNCH VIDEO PIPELINE ===
    session.phase = 'videos';

    await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: Number(chatId),
      text: `🎥 *Génération des vidéos individuelles en cours...*\n\nVidéo 1/${session.totalRooms} — ${session.rooms[0].roomLabel} ⏳`,
      parse_mode: 'Markdown'
    });

    const media = session.rooms.map((r, i) => ({
      type: 'photo',
      media: r.selectedUrl,
      caption: i === 0 ? `🎨 Virtual Staging ${session.styleLabel} — ${session.totalRooms} pièces` : r.roomLabel
    }));
    const chunks = [];
    for (let i = 0; i < media.length; i += 10) chunks.push(media.slice(i, i + 10));
    for (const chunk of chunks) {
      try {
        await post(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, { chat_id: Number(chatId), media: chunk });
      } catch (e) { /* ignore */ }
    }

    // === Kling v2.1 Pro + individual video upload ===
    const videoResults = [];
    for (let i = 0; i < session.rooms.length; i++) {
      const r = session.rooms[i];

      await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: Number(chatId),
        text: `🎬 Vidéo ${i + 1}/${session.totalRooms} — *${r.roomLabel}* ⏳`,
        parse_mode: 'Markdown'
      });

      let videoUrl = '';
      try {
        const vidResp = await post('https://api.replicate.com/v1/models/kwaivgi/kling-v2.1/predictions', {
          input: {
            prompt: `Morph from original empty room to furnished room. KEEP EXACT same room structure, walls, floor, windows, camera angle, perspective, and proportions throughout the entire video. Subtle dolly zoom only, no perspective change. ${session.style} ${r.roomType || room.roomType}, photorealistic professional real estate video, smooth furniture appearance, steady camera, natural lighting.`,
            start_image: r.photoUrl,
            end_image: r.selectedUrl,
            mode: 'pro',
            duration: 5,
            negative_prompt: 'blurry, distorted, low quality, warped walls, warped windows, changed proportions, furniture movement, structural changes, perspective shift, room deformation'
          }
        }, repHeaders);

        if (vidResp.data.id) {
          const vidData = await pollPrediction(vidResp.data.id);
          if (vidData && vidData.status === 'succeeded' && vidData.output) {
            videoUrl = Array.isArray(vidData.output) ? vidData.output[0] : vidData.output;
          }
        }
      } catch (e) { /* silent fallback */ }

      // === Send individual video to Telegram ===
      if (videoUrl) {
        try {
          const vidBuffer = await downloadBinary(videoUrl);
          const uploadResp = await multipartUpload(botToken, chatId, vidBuffer,
            `🎬 *Vidéo ${i + 1}/${session.totalRooms} — ${r.roomLabel}*\n\nAvant → Après`
          );
          if (uploadResp.ok) {
            await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              chat_id: Number(chatId),
              text: `✅ *Vidéo ${i + 1}/${session.totalRooms} — ${r.roomLabel}* envoyée !`,
              parse_mode: 'Markdown'
            });
          }
        } catch (e) {
          await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: Number(chatId),
            text: `🎬 Vidéo ${r.roomLabel}: ${videoUrl}`
          });
        }
      } else {
        await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          chat_id: Number(chatId),
          text: `⚠️ Vidéo ${i + 1}/${session.totalRooms} — ${r.roomLabel} : échec, image statique utilisée.`
        });
      }

      if (!videoUrl) videoUrl = r.selectedUrl;

      videoResults.push({
        beforePhotoUrl: r.beforePhotoUrl || r.photoUrl,
        originalPhotoUrl: r.photoUrl,
        stagedPhotoUrl: r.selectedUrl,
        videoUrl,
        roomType: r.roomType,
        roomLabel: r.roomLabel
      });

      if (i < session.rooms.length - 1) await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // === Remotion render ===
    session.phase = 'rendering';

    await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: Number(chatId),
      text: `✨ *Toutes les vidéos individuelles envoyées !*\n\nCompilation de la vidéo finale montée en cours... ⏳`,
      parse_mode: 'Markdown'
    });

    const durationPerRoom = 7;
    const totalDuration = Math.min(180, 5 + session.totalRooms * durationPerRoom + 5);

    const remotionPayload = {
      compositionId: 'PropertyShowcase',
      inputProps: {
        property: { title: 'Visite Virtuelle VIMIMO', style: session.style },
        totalDuration,
        transitionType: 'swipe',
        rooms: videoResults.map(r => ({
          beforePhotoUrl: r.beforePhotoUrl,
          originalPhotoUrl: r.originalPhotoUrl,
          stagedPhotoUrl: r.stagedPhotoUrl,
          videoUrl: r.videoUrl,
          roomType: r.roomType,
          roomLabel: r.roomLabel
        }))
      }
    };

    const renderResp = await post('http://172.18.0.1:8000/renders', remotionPayload);
    const renderId = renderResp.data.id;

    let renderStatus = 'rendering';
    let renderData;
    while (renderStatus !== 'done' && renderStatus !== 'error') {
      await new Promise(r => setTimeout(r, 15000));
      const pollResp = await get(`http://172.18.0.1:8000/renders/${renderId}`);
      renderData = pollResp.data;
      renderStatus = renderData.status || 'rendering';
    }

    if (renderStatus === 'error') {
      await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: Number(chatId),
        text: '⚠️ Erreur lors de la compilation vidéo finale. Les vidéos individuelles ont été envoyées.'
      });
      delete staticData[sessionKey];
      return [{ json: { error: 'render failed', videoCount: videoResults.length } }];
    }

    const internalVideoUrl = `http://172.18.0.1:8000/renders/${renderId}/download`;
    const videoBuffer = await downloadBinary(internalVideoUrl);

    if (videoBuffer.length < 1000) {
      await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: Number(chatId),
        text: '⚠️ Erreur: vidéo finale trop petite. Les vidéos individuelles ont été envoyées.'
      });
      delete staticData[sessionKey];
      return [{ json: { error: 'video too small' } }];
    }

    const finalCaption = `🎉 *VIDÉO FINALE MONTÉE* (~${totalDuration}s)\n\n✅ ${session.totalRooms} pièces traitées en ${session.styleLabel}\n\n🔄 Envoyez de nouvelles photos pour un autre rendu !\n💬 Tapez /styles pour changer de style.`;
    const uploadResult = await multipartUpload(botToken, chatId, videoBuffer, finalCaption);

    if (!uploadResult.ok) {
      await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: Number(chatId),
        text: '⚠️ Erreur lors de l\'envoi de la vidéo finale.'
      });
    }

    delete staticData[sessionKey];

    return [{ json: { ok: true, action: 'complete', renderId, totalDuration, videoCount: session.totalRooms } }];
  }
}
```

---

## 6. Code n8n — Build & Deploy

### 6.1 `n8n/build-deploy.js`

```javascript
#!/usr/bin/env node
/**
 * Convert workflow-v2.json (readable IDs) to workflow-v2-deploy.json (UUID IDs)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const inputPath = path.join(__dirname, 'workflow-v2.json');
const outputPath = path.join(__dirname, 'workflow-v2-deploy.json');

const workflow = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

// Generate deterministic UUIDs from node names
function nameToUUID(name) {
  const hash = crypto.createHash('md5').update('vimimo-v21-' + name).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16),
    (parseInt(hash[16], 16) & 0x3 | 0x8).toString(16) + hash.slice(17, 20),
    hash.slice(20, 32)
  ].join('-');
}

const idMap = {};
for (const node of workflow.nodes) {
  const uuid = nameToUUID(node.name);
  idMap[node.id] = uuid;
  node.id = uuid;
}

fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2), 'utf-8');
console.log(`Deploy workflow written to ${outputPath}`);
console.log('Node ID mapping:');
for (const [oldId, newId] of Object.entries(idMap)) {
  console.log(`  ${oldId} -> ${newId}`);
}
```

### 6.2 `n8n/deploy-v21.sh`

```bash
#!/bin/bash
# Deploy VIMIMO v2.1 workflow to n8n instance
set -e

N8N_URL="https://n8n.srv1129073.hstgr.cloud"
WORKFLOW_ID="ZlSOfh3wPav4DGPE"
API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0OWY5MzgzOC1kN2ZlLTQ1ZGUtOWQ4Mi1kYmRjMzdkNDAzNWIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcxNDI4ODkyfQ.jn8O6GoWSnkzCDnb_LtlbkcYzG7kY8FKIBdEhkrqShs"

echo "=== VIMIMO v2.1 Deployment ==="

# Build workflow files
echo "1. Building workflow JSON..."
cd "$(dirname "$0")"
node build-v21.js
node build-deploy.js

# Prepare body
echo "2. Preparing deploy body..."
node -e "
const w = JSON.parse(require('fs').readFileSync('workflow-v2-deploy.json','utf-8'));
delete w.staticData;
delete w.tags;
require('fs').writeFileSync('/tmp/vimimo-deploy-body.json', JSON.stringify(w));
console.log('  Body size:', Math.round(require('fs').statSync('/tmp/vimimo-deploy-body.json').size / 1024) + ' KB');
"

echo "3. Deactivating workflow..."
curl -s -X POST "${N8N_URL}/api/v1/workflows/${WORKFLOW_ID}/deactivate" \
  -H "X-N8N-API-KEY: ${API_KEY}" -o /tmp/vimimo-deactivate.json
node -e "const r=JSON.parse(require('fs').readFileSync('/tmp/vimimo-deactivate.json','utf-8'));console.log('  Active:', r.active)"

echo "4. Updating workflow via API PUT..."
curl -s -X PUT "${N8N_URL}/api/v1/workflows/${WORKFLOW_ID}" \
  -H "X-N8N-API-KEY: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d @/tmp/vimimo-deploy-body.json \
  -o /tmp/vimimo-update-result.json

node -e "
const r=JSON.parse(require('fs').readFileSync('/tmp/vimimo-update-result.json','utf-8'));
if(r.id){console.log('  Updated:', r.name, '- Nodes:', r.nodes?.length)}
else{console.log('  ERROR:', JSON.stringify(r).substring(0,500))}
"

echo "5. Activating workflow..."
curl -s -X POST "${N8N_URL}/api/v1/workflows/${WORKFLOW_ID}/activate" \
  -H "X-N8N-API-KEY: ${API_KEY}" -o /tmp/vimimo-activate.json
node -e "const r=JSON.parse(require('fs').readFileSync('/tmp/vimimo-activate.json','utf-8'));console.log('  Active:', r.active)"

echo "6. Setting Telegram webhook max_connections=1..."
BOT_TOKEN="8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU"
WEBHOOK_URL="${N8N_URL}/webhook/${WORKFLOW_ID}/telegrambot/webhook"
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  --data-urlencode "url=${WEBHOOK_URL}" \
  -d "max_connections=1" \
  --data-urlencode 'allowed_updates=["message","callback_query"]' \
  -o /tmp/vimimo-webhook.json
node -e "const r=JSON.parse(require('fs').readFileSync('/tmp/vimimo-webhook.json','utf-8'));console.log('  Webhook:', r.ok ? 'OK' : 'FAILED', r.description||'')"

echo ""
echo "=== Deployment complete ==="
echo "Workflow: ${N8N_URL}/workflow/${WORKFLOW_ID}"

rm -f /tmp/vimimo-deploy-body.json /tmp/vimimo-deactivate.json /tmp/vimimo-update-result.json /tmp/vimimo-activate.json /tmp/vimimo-webhook.json
```

### 6.3 Nodes inline dans `build-v21.js`

#### AccumulatePhoto V5

```javascript
// AccumulatePhoto V5 — race-condition safe + album ack inline
const https = require('https');

function postTelegram(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.telegram.org',
      path: '/bot8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU/sendMessage',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => { let b=''; res.on('data',c=>b+=c); res.on('end',()=>resolve(b)); });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const staticData = $getWorkflowStaticData('global');
const msg = $input.first().json.message;
const chatId = String(msg.chat.id);

const fileId = msg.photo
  ? msg.photo[msg.photo.length - 1].file_id
  : (msg.video ? msg.video.file_id : null);
const mediaType = msg.video ? 'video' : 'photo';

if (!fileId) return [];

// Store photo
const photoKey = `photo_${chatId}_${fileId}`;
staticData[photoKey] = { fileId, mediaType, chatId, timestamp: Date.now() };

if (msg.media_group_id) {
  // ALBUM: send ack+keyboard only ONCE per album
  const mgKey = `mg_${chatId}_${msg.media_group_id}`;
  if (!staticData[mgKey]) {
    staticData[mgKey] = Date.now();
    const styleKey = `style_${chatId}`;
    const style = staticData[styleKey] ? staticData[styleKey].label : null;
    const keyboard = { keyboard: [[{text:'\ud83d\uddbc\ufe0f Scandinave'},{text:'\ud83e\uddf1 Industriel'}],[{text:'\u2728 Moderne'},{text:'\ud83c\udfdb\ufe0f Classique'}],[{text:'\ud83c\udf3f Boh\u00e8me'}]], resize_keyboard: true, one_time_keyboard: false };
    await postTelegram({
      chat_id: Number(chatId),
      text: '\ud83d\udcf8 Album re\u00e7u ! Choisissez un style puis tapez /go.\n\n\ud83c\udfa8 Style actuel : ' + (style || 'Choisissez ci-dessous'),
      reply_markup: keyboard
    });
  }
  return [];
}

// SINGLE photos: trigger AckStyleKeyboard downstream
const prefix = `photo_${chatId}_`;
const count = Object.keys(staticData).filter(k => k.startsWith(prefix)).length;
const styleKey = `style_${chatId}`;
const style = staticData[styleKey] ? staticData[styleKey].label : null;

return [{ json: { chatId, count, fileId, mediaType, style, isAlbum: false } }];
```

#### SaveStyleChoice

```javascript
const staticData = $getWorkflowStaticData('global');
const msg = $input.first().json.message;
const chatId = String(msg.chat.id);
const text = msg.text || '';

const styleMap = {
  'Scandinave': 'scandinavian',
  'Industriel': 'industrial',
  'Moderne': 'modern_minimalist',
  'Classique': 'classic_french',
  'Boh\u00e8me': 'bohemian'
};

let chosenStyle = 'modern_minimalist';
let chosenLabel = 'Moderne';
for (const [label, value] of Object.entries(styleMap)) {
  if (text.includes(label)) { chosenStyle = value; chosenLabel = label; break; }
}

const styleKey = `style_${chatId}`;
staticData[styleKey] = { style: chosenStyle, label: chosenLabel };

const prefix = `photo_${chatId}_`;
const photoCount = Object.keys(staticData).filter(k => k.startsWith(prefix)).length;

return [{ json: { chatId, chosenStyle, chosenLabel, photoCount } }];
```

#### DownloadAllPhotos

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

function get(url, headers = {}) {
  return httpRequest(url, { headers, timeout: 300000 });
}

const data = $input.first().json;
const botToken = '8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU';
const photos = data.photos;
const photoUrls = [];

for (let i = 0; i < photos.length; i++) {
  const resp = await get(`https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(photos[i].fileId)}`);
  if (!resp.data.ok) throw new Error(`Failed to get file ${i+1}: ${JSON.stringify(resp.data)}`);
  const filePath = resp.data.result.file_path;
  const url = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
  photoUrls.push({ index: i + 1, url, mediaType: photos[i].mediaType });
}

return [{ json: { ...data, photoUrls } }];
```

#### BatchVisionAnalysis

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

const data = $input.first().json;
const photoUrls = data.photoUrls;
const style = data.style;

const content = [
  { type: 'text', text: `Analyse ces ${photoUrls.length} photos de pièces pour un virtual staging. Style : ${style}.` }
];
for (const p of photoUrls) {
  content.push({ type: 'text', text: `Photo ${p.index} :` });
  content.push({ type: 'image_url', image_url: { url: p.url } });
}

const resp = await post('https://api.openai.com/v1/chat/completions', {
  model: 'gpt-4o',
  temperature: 0.3,
  max_tokens: 4000,
  messages: [
    {
      role: 'system',
      content: 'Tu es un expert en analyse immobilière. Pour CHAQUE photo, analyse la pièce.\n\nRéponds en JSON valide :\n{\n  "propertyType": "apartment"|"house"|"commercial",\n  "rooms": [\n    {\n      "photoIndex": 1,\n      "roomType": "living_room"|"bedroom"|"kitchen"|"bathroom"|"dining_room"|"office"|"studio"|"hallway"|"balcony",\n      "roomLabel": "Salon principal",\n      "dimensions": { "estimatedArea": "25m²", "ceilingHeight": "2.5m", "shape": "rectangular" },\n      "existingMaterials": { "flooring": "parquet", "walls": "white painted", "ceiling": "flat white" },\n      "lighting": { "naturalLight": "good", "windowCount": 2, "lightDirection": "south" },\n      "cameraAngle": { "perspective": "corner wide", "height": "eye level", "orientation": "landscape" },\n      "stagingPriority": "high"|"medium"|"low",\n      "notes": "specific observations"\n    }\n  ],\n  "overallNotes": "general observations"\n}\n\nphotoIndex must match image order (1-based). One room per photo. Reply ONLY valid JSON, no markdown fences.'
    },
    { role: 'user', content: content }
  ]
}, { 'Authorization': `Bearer OPENAI_KEY_REDACTED` });

if (!resp.data.choices || !resp.data.choices[0]) {
  throw new Error('GPT-4o Vision failed: ' + JSON.stringify(resp.data).substring(0, 500));
}

return [{ json: { ...data, visionAnalysis: resp.data.choices[0].message.content } }];
```

---

## 7. Code Remotion — Schemas & Compositions

### 7.1 `remotion/src/index.ts`

```typescript
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
```

### 7.2 `remotion/src/schemas.ts`

```typescript
import { z } from "zod";

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
  style: z.string().default("modern"),
});

export const propertyShowcaseSchema = z.object({
  property: propertyConfigSchema.default({}),
  rooms: z.array(roomSchema).min(1).max(20),
});

export type Room = z.infer<typeof roomSchema>;
export type PropertyShowcaseProps = z.infer<typeof propertyShowcaseSchema>;
```

### 7.3 `remotion/src/Root.tsx`

```typescript
import React from "react";
import { Composition } from "remotion";
import { z } from "zod";
import { VirtualStaging } from "./Composition";
import { PropertyShowcase, calculateDuration } from "./PropertyShowcase";
import { propertyShowcaseSchema } from "./schemas";
import type { PropertyShowcaseProps } from "./schemas";

const keyframeSchema = z.object({
  url: z.string(),
  step: z.number().int().min(1).max(5),
  label: z.enum([
    "original_clean", "surface_renovation", "large_furniture",
    "full_furnishing", "final_decoration",
  ]),
});

const speedRampSchema = z.object({
  introSpeed: z.number().min(0.1).max(8).default(2.0),
  stagingSpeed: z.number().min(0.1).max(8).default(0.5),
  outroSpeed: z.number().min(0.1).max(8).default(2.0),
  introRatio: z.number().min(0.05).max(0.5).default(0.2),
  stagingRatio: z.number().min(0.2).max(0.8).default(0.6),
  outroRatio: z.number().min(0.05).max(0.5).default(0.2),
});

const transitionsSchema = z.object({
  durationInFrames: z.number().int().min(2).max(60).default(16),
  smoothCutBlur: z.number().min(0).max(12).default(4),
});

const upscalingSchema = z.object({
  enabled: z.boolean().default(true),
  contrast: z.number().min(1).max(1.5).default(1.1),
  saturation: z.number().min(1).max(1.3).default(1.05),
});

export const compositionSchema = z.object({
  originalVideoUrl: z.string(),
  aiVideoUrl: z.string(),
  images: z.array(keyframeSchema).length(5),
  speedRamp: speedRampSchema.default({}),
  transitions: transitionsSchema.default({}),
  upscaling: upscalingSchema.default({}),
});

export type CompositionProps = z.infer<typeof compositionSchema>;

const FPS = 30;
const DURATION_SECONDS = 10;

export const RemotionRoot: React.FC = () => {
  return (
    <>
    <Composition
      id="VirtualStaging"
      component={VirtualStaging}
      durationInFrames={FPS * DURATION_SECONDS}
      fps={FPS}
      width={1920}
      height={1080}
      schema={compositionSchema}
      defaultProps={{
        originalVideoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
        aiVideoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
        images: [
          { url: "https://placehold.co/1920x1080/1a1a2e/e0e0e0?text=1+Original", step: 1, label: "original_clean" as const },
          { url: "https://placehold.co/1920x1080/16213e/e0e0e0?text=2+Renovation", step: 2, label: "surface_renovation" as const },
          { url: "https://placehold.co/1920x1080/0f3460/e0e0e0?text=3+Furniture", step: 3, label: "large_furniture" as const },
          { url: "https://placehold.co/1920x1080/533483/e0e0e0?text=4+Full", step: 4, label: "full_furnishing" as const },
          { url: "https://placehold.co/1920x1080/2b6777/e0e0e0?text=5+Final", step: 5, label: "final_decoration" as const },
        ],
        speedRamp: { introSpeed: 2.0, stagingSpeed: 0.5, outroSpeed: 2.0, introRatio: 0.2, stagingRatio: 0.6, outroRatio: 0.2 },
        transitions: { durationInFrames: 16, smoothCutBlur: 4 },
        upscaling: { enabled: true, contrast: 1.1, saturation: 1.05 },
      }}
    />
    <Composition
      id="PropertyShowcase"
      component={PropertyShowcase}
      fps={FPS}
      width={1920}
      height={1080}
      durationInFrames={calculateDuration(3)}
      schema={propertyShowcaseSchema}
      calculateMetadata={({ props }) => ({
        durationInFrames: calculateDuration(props.rooms.length),
      })}
      defaultProps={{
        property: { title: "Visite Virtuelle", address: "12 Rue de la Paix, Paris", style: "modern" },
        rooms: [
          {
            beforePhotoUrl: "https://placehold.co/1920x1080/5a3a3a/ffffff?text=Salon+-+AVANT",
            originalPhotoUrl: "https://placehold.co/1920x1080/4a4a4a/ffffff?text=Salon+-+Photo+Vide",
            stagedPhotoUrl: "https://placehold.co/1920x1080/2d5a3d/ffffff?text=Salon+-+Stagé",
            videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
            roomType: "living_room", roomLabel: "Salon",
          },
          {
            beforePhotoUrl: "https://placehold.co/1920x1080/5a3a3a/ffffff?text=Chambre+-+AVANT",
            originalPhotoUrl: "https://placehold.co/1920x1080/4a4a4a/ffffff?text=Chambre+-+Photo+Vide",
            stagedPhotoUrl: "https://placehold.co/1920x1080/3d2d5a/ffffff?text=Chambre+-+Stagée",
            videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
            roomType: "bedroom", roomLabel: "Chambre 1",
          },
          {
            beforePhotoUrl: "https://placehold.co/1920x1080/5a3a3a/ffffff?text=Cuisine+-+AVANT",
            originalPhotoUrl: "https://placehold.co/1920x1080/4a4a4a/ffffff?text=Cuisine+-+Photo+Vide",
            stagedPhotoUrl: "https://placehold.co/1920x1080/5a3d2d/ffffff?text=Cuisine+-+Stagée",
            videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
            roomType: "kitchen", roomLabel: "Cuisine",
          },
        ],
      }}
    />
    </>
  );
};
```

### 7.4 `remotion/src/PropertyShowcase.tsx`

```typescript
import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { PropertyShowcaseProps } from "./schemas";
import { CinematicOverlay } from "./components/CinematicOverlay";
import { IntroCard } from "./components/IntroCard";
import { OutroCard } from "./components/OutroCard";
import { RoomSegment } from "./components/RoomSegment";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const INTRO_DUR = 90;
const ROOM_DUR = 210;
const CROSSFADE = 20;
const OUTRO_DUR = 90;

export const calculateDuration = (roomCount: number): number => {
  return INTRO_DUR + roomCount * ROOM_DUR - (roomCount - 1) * CROSSFADE + OUTRO_DUR;
};

export const PropertyShowcase: React.FC<PropertyShowcaseProps> = ({ property, rooms }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const globalScale = interpolate(frame, [0, durationInFrames], [1.0, 1.02], CLAMP);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${globalScale.toFixed(4)})`, transformOrigin: "center center" }}>
        <Sequence from={0} durationInFrames={INTRO_DUR} layout="none">
          <IntroCard title={property.title} address={property.address} />
        </Sequence>

        {rooms.map((room, i) => {
          const roomStart = INTRO_DUR + i * (ROOM_DUR - CROSSFADE);
          const fadeIn = i === 0 ? 1 : interpolate(frame, [roomStart, roomStart + CROSSFADE], [0, 1], CLAMP);
          const nextRoomStart = i < rooms.length - 1 ? INTRO_DUR + (i + 1) * (ROOM_DUR - CROSSFADE) : null;
          const fadeOut = nextRoomStart ? interpolate(frame, [nextRoomStart, nextRoomStart + CROSSFADE], [1, 0], CLAMP) : 1;
          const opacity = Math.min(fadeIn, fadeOut);

          return (
            <Sequence key={`room-${i}`} from={roomStart} durationInFrames={ROOM_DUR} layout="none">
              <AbsoluteFill style={{ opacity }}>
                <RoomSegment room={room} />
              </AbsoluteFill>
            </Sequence>
          );
        })}

        <Sequence from={INTRO_DUR + rooms.length * (ROOM_DUR - CROSSFADE)} durationInFrames={OUTRO_DUR} layout="none">
          <OutroCard />
        </Sequence>
      </AbsoluteFill>
      <CinematicOverlay />
    </AbsoluteFill>
  );
};
```

---

## 8. Code Remotion — Components

### 8.1 `remotion/src/components/RoomSegment.tsx`

```typescript
import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, useCurrentFrame } from "remotion";
import type { Room } from "../schemas";
import { RoomLabel } from "./RoomLabel";
import { SplitReveal } from "./SplitReveal";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const COVER: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" as const };

interface RoomSegmentProps { room: Room; }

// Total: 210 frames (7s at 30fps)
// [0-40]    Before photo (original with furniture) + "AVANT" badge + Ken Burns
// [40-70]   SplitReveal wipe (before → staged)
// [70-180]  OffthreadVideo (Kling morph)
// [180-210] Staged photo + "APRES" badge

const BadgeStyle: React.CSSProperties = {
  position: "absolute", top: 40, left: 48,
  display: "flex", alignItems: "center", gap: 0,
};

const BadgePill: React.CSSProperties = {
  fontSize: 22, fontFamily: "sans-serif", fontWeight: 700,
  padding: "8px 20px", borderRadius: 20,
  letterSpacing: 2, textTransform: "uppercase" as const,
};

export const RoomSegment: React.FC<RoomSegmentProps> = ({ room }) => {
  const frame = useCurrentFrame();
  const beforeUrl = room.beforePhotoUrl || room.originalPhotoUrl;

  const kenBurnsScale = interpolate(frame, [0, 40], [1.0, 1.04], CLAMP);
  const splitProgress = interpolate(frame, [40, 70], [0, 1], CLAMP);

  const opBefore = interpolate(frame, [37, 42], [1, 0], CLAMP);
  const opSplit = interpolate(frame, [37, 42], [0, 1], CLAMP);
  const opSplitOut = interpolate(frame, [67, 72], [1, 0], CLAMP);
  const opVideo = interpolate(frame, [67, 72], [0, 1], CLAMP);
  const opVideoOut = interpolate(frame, [177, 182], [1, 0], CLAMP);
  const opStaged = interpolate(frame, [177, 182], [0, 1], CLAMP);

  const avantOpacity = interpolate(frame, [5, 15], [0, 1], CLAMP);
  const apresOpacity = interpolate(frame, [185, 195], [0, 1], CLAMP);
  const labelFrame = Math.max(0, frame - 190);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Phase 1: Before photo + "AVANT" badge [0-42] */}
      <Sequence from={0} durationInFrames={43} layout="none">
        <AbsoluteFill style={{ opacity: opBefore }}>
          <Img src={beforeUrl} style={{
            ...COVER,
            transform: `scale(${kenBurnsScale.toFixed(4)})`,
            transformOrigin: "center center",
          }} />
          <div style={{ ...BadgeStyle, opacity: avantOpacity }}>
            <div style={{ ...BadgePill, backgroundColor: "rgba(0,0,0,0.7)", color: "#fff", backdropFilter: "blur(8px)" }}>
              AVANT
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Phase 2: SplitReveal wipe [37-72] */}
      <Sequence from={37} durationInFrames={36} layout="none">
        <AbsoluteFill style={{ opacity: Math.min(opSplit, opSplitOut) }}>
          <SplitReveal originalUrl={beforeUrl} stagedUrl={room.stagedPhotoUrl} progress={splitProgress} />
        </AbsoluteFill>
      </Sequence>

      {/* Phase 3: Video [67-182] */}
      <Sequence from={67} durationInFrames={116} layout="none">
        <AbsoluteFill style={{ opacity: Math.min(opVideo, opVideoOut) }}>
          <OffthreadVideo src={room.videoUrl} playbackRate={1.0} style={COVER} />
        </AbsoluteFill>
      </Sequence>

      {/* Phase 4: Staged photo + "APRES" badge [177-210] */}
      <Sequence from={177} durationInFrames={33} layout="none">
        <AbsoluteFill style={{ opacity: opStaged }}>
          <Img src={room.stagedPhotoUrl} style={COVER} />
          <div style={{ ...BadgeStyle, opacity: apresOpacity }}>
            <div style={{ ...BadgePill, backgroundColor: "rgba(255,255,255,0.9)", color: "#000", backdropFilter: "blur(8px)" }}>
              APRES
            </div>
          </div>
          <RoomLabel label={room.roomLabel} frame={labelFrame} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
```

### 8.2 `remotion/src/components/SplitReveal.tsx`

```typescript
import React from "react";
import { AbsoluteFill, Img } from "remotion";

const COVER: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" as const };

interface SplitRevealProps { originalUrl: string; stagedUrl: string; progress: number; }

export const SplitReveal: React.FC<SplitRevealProps> = ({ originalUrl, stagedUrl, progress }) => {
  const pct = Math.min(1, Math.max(0, progress)) * 100;
  return (
    <AbsoluteFill>
      <AbsoluteFill><Img src={stagedUrl} style={COVER} /></AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(0 ${pct}% 0 0)` }}>
        <Img src={originalUrl} style={COVER} />
      </AbsoluteFill>
      <div style={{
        position: "absolute", top: 0, bottom: 0, left: `${100 - pct}%`,
        width: 3, backgroundColor: "#fff", transform: "translateX(-50%)",
        boxShadow: "0 0 8px rgba(0,0,0,0.4)",
      }} />
    </AbsoluteFill>
  );
};
```

### 8.3 `remotion/src/components/IntroCard.tsx`

```typescript
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

interface IntroCardProps { title: string; address?: string; }

export const IntroCard: React.FC<IntroCardProps> = ({ title, address }) => {
  const frame = useCurrentFrame();
  const titleOpacity = interpolate(frame, [15, 45], [0, 1], CLAMP);
  const addressOpacity = interpolate(frame, [40, 70], [0, 1], CLAMP);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", justifyContent: "center", alignItems: "center", display: "flex", flexDirection: "column" }}>
      <div style={{ color: "#fff", fontSize: 72, fontFamily: "sans-serif", fontWeight: 600, opacity: titleOpacity, textAlign: "center", padding: "0 80px" }}>
        {title}
      </div>
      {address && (
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 36, fontFamily: "sans-serif", fontWeight: 400, opacity: addressOpacity, marginTop: 24, textAlign: "center", padding: "0 80px" }}>
          {address}
        </div>
      )}
    </AbsoluteFill>
  );
};
```

### 8.4 `remotion/src/components/OutroCard.tsx`

```typescript
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const OutroCard: React.FC = () => {
  const frame = useCurrentFrame();
  const brandOpacity = interpolate(frame, [10, 40], [0, 1], CLAMP);
  const subtitleOpacity = interpolate(frame, [30, 60], [0, 1], CLAMP);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", justifyContent: "center", alignItems: "center", display: "flex", flexDirection: "column" }}>
      <div style={{ color: "#fff", fontSize: 96, fontFamily: "sans-serif", fontWeight: 700, opacity: brandOpacity, letterSpacing: 12 }}>
        VIMIMO
      </div>
      <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 32, fontFamily: "sans-serif", fontWeight: 400, opacity: subtitleOpacity, marginTop: 20, letterSpacing: 4 }}>
        Virtual Staging IA
      </div>
    </AbsoluteFill>
  );
};
```

### 8.5 `remotion/src/components/CinematicOverlay.tsx`

```typescript
import React from "react";
import { AbsoluteFill } from "remotion";

export const CinematicOverlay: React.FC = () => {
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4.5%", background: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "4.5%", background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.3) 100%)" }} />
    </AbsoluteFill>
  );
};
```

### 8.6 `remotion/src/components/RoomLabel.tsx`

```typescript
import React from "react";
import { interpolate } from "remotion";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

interface RoomLabelProps { label: string; frame: number; }

export const RoomLabel: React.FC<RoomLabelProps> = ({ label, frame }) => {
  const opacity = interpolate(frame, [0, 20], [0, 1], CLAMP);
  const translateY = interpolate(frame, [0, 20], [12, 0], CLAMP);

  return (
    <div style={{ position: "absolute", bottom: 60, left: 48, opacity, transform: `translateY(${translateY}px)` }}>
      <div style={{ backgroundColor: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 28, fontFamily: "sans-serif", fontWeight: 500, padding: "10px 24px", borderRadius: 24, backdropFilter: "blur(8px)" }}>
        {label}
      </div>
    </div>
  );
};
```

---

## 9. Code Remotion — Server & Docker

### 9.1 `remotion/server/index.ts`

```typescript
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "10mb" }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

interface RenderJob {
  id: string;
  status: "bundling" | "rendering" | "done" | "error";
  progress: number;
  outputPath: string | null;
  error: string | null;
  createdAt: number;
}

const renders = new Map<string, RenderJob>();
let bundlePath: string | null = null;

async function initBundle() {
  console.log("Bundling Remotion project...");
  bundlePath = await bundle({
    entryPoint: path.resolve(__dirname, "../src/index.ts"),
    onProgress: (p) => process.stdout.write(`\rBundling: ${(p * 100).toFixed(0)}%`),
  });
  console.log("\nBundle ready:", bundlePath);
}

app.post("/renders", async (req, res) => {
  if (!bundlePath) return res.status(503).json({ error: "Server still bundling" });

  const id = uuidv4();
  const outputDir = path.resolve(__dirname, "../out");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${id}.mp4`);

  const job: RenderJob = { id, status: "rendering", progress: 0, outputPath: null, error: null, createdAt: Date.now() };
  renders.set(id, job);

  (async () => {
    try {
      const composition = await selectComposition({
        serveUrl: bundlePath!,
        id: req.body.compositionId || "PropertyShowcase",
        inputProps: req.body.inputProps || req.body,
      });
      await renderMedia({
        composition, serveUrl: bundlePath!, codec: "h264", outputLocation: outputPath,
        inputProps: req.body.inputProps || req.body,
        onProgress: ({ progress }) => { job.progress = Math.round(progress * 100); },
      });
      job.status = "done";
      job.outputPath = outputPath;
    } catch (err: any) {
      job.status = "error";
      job.error = err.message || String(err);
      console.error("Render error:", err);
    }
  })();

  res.json({ id, status: "rendering" });
});

app.get("/renders/:id", (req, res) => {
  const job = renders.get(req.params.id);
  if (!job) return res.status(404).json({ error: "Render not found" });
  res.json({ id: job.id, status: job.status, progress: job.progress, error: job.error });
});

app.get("/renders/:id/download", (req, res) => {
  const job = renders.get(req.params.id);
  if (!job) return res.status(404).json({ error: "Render not found" });
  if (job.status !== "done" || !job.outputPath) return res.status(400).json({ error: "Render not ready", status: job.status });
  res.download(job.outputPath, `vimimo-${job.id}.mp4`);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", bundled: !!bundlePath, activeRenders: renders.size });
});

const PORT = parseInt(process.env.PORT || "8000", 10);

initBundle().then(() => {
  app.listen(PORT, () => { console.log(`VIMIMO Render Server running on port ${PORT}`); });
}).catch((err) => { console.error("Failed to bundle:", err); process.exit(1); });
```

### 9.2 `remotion/Dockerfile`

```dockerfile
FROM node:22-slim

RUN apt-get update && apt-get install -y \
    chromium fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 \
    libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 xdg-utils \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .

ENV CHROMIUM_PATH=/usr/bin/chromium
ENV PORT=8000
EXPOSE 8000
CMD ["npx", "tsx", "server/index.ts"]
```

### 9.3 `remotion/package.json`

```json
{
  "name": "vimimo-remotion",
  "version": "1.0.0",
  "description": "VIMIMO - Virtual Staging Video Composition Engine",
  "private": true,
  "scripts": {
    "start": "remotion studio",
    "build": "remotion render VirtualStaging out/video.mp4",
    "render": "remotion render VirtualStaging out/video.mp4 --props='./props.json'",
    "server": "tsx server/index.ts",
    "upgrade": "remotion upgrade"
  },
  "dependencies": {
    "@remotion/cli": "4.0.242",
    "@remotion/player": "4.0.242",
    "@remotion/renderer": "4.0.242",
    "express": "^4.21.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "remotion": "4.0.242",
    "uuid": "^11.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@remotion/bundler": "4.0.242",
    "@types/express": "^5.0.0",
    "@types/react": "^18.3.12",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.3"
  }
}
```

---

## 10. Data Flow beforePhotoUrl (v2.2)

```
CleanPhotos.js
  └─ { url: cleanedUrl, originalUrl: photo.url }
       ↓
InitializeSession.js
  └─ rooms[i].beforePhotoUrl = photoUrls[i].originalUrl || photoUrls[i].url
  └─ rooms[i].photoUrl = photoUrls[i].url (nettoyee)
       ↓
HandleCallbackQuery.js
  └─ videoResults[i].beforePhotoUrl = r.beforePhotoUrl || r.photoUrl
       ↓
Remotion payload → inputProps.rooms[i].beforePhotoUrl
       ↓
schemas.ts → roomSchema.beforePhotoUrl (optional)
       ↓
RoomSegment.tsx → beforeUrl = room.beforePhotoUrl || room.originalPhotoUrl
  └─ Phase 1 [0-40] : Affiche beforeUrl + badge "AVANT"
  └─ Phase 2 [40-70] : SplitReveal wipe (beforeUrl → stagedPhotoUrl)
```

---

## 11. Contraintes techniques

| Contrainte | Detail |
|------------|--------|
| n8n sandbox | Seuls `require('https')`, `require('http')`, `require('url')` fonctionnent. Pas de fetch/axios. |
| Telegram trigger | typeVersion 1 obligatoire (v1.1 casse le webhook avec secret_token) |
| Webhook | max_connections=1 (anti race-condition albums), re-set apres chaque activation |
| sendVideo | Upload multipart obligatoire (Telegram ne telecharge pas depuis IP privee) |
| IF nodes | Bugues en v2 (false = truthy). Utiliser `return []` dans Code nodes. |
| Flux safety_tolerance | Max 2 avec input_image |
| Tokens | Hardcodes (pas de Variables en licence n8n) |
| staticData | En memoire, perdu au redemarrage n8n |

---

## 12. Bug fixes historiques

| Bug | Fix |
|-----|-----|
| Flux ignore photo source | `input_image` au lieu de `image_url` |
| safety_tolerance: 5 rejete | Change a 2 |
| /go bloque par session stale | Timeout 15min + auto-reset |
| Album photos perdues | max_connections=1 |
| Pas de clavier apres album | AccumulatePhoto V5 avec postTelegram inline |
| Deploy reset max_connections | Step 7 dans deploy-v21.sh |
| Distortion pieces stagees | Regles anti-distortion (ne jamais decrire la structure) |
| Meubles existants sur staging | CleanPhotos supprime avant staging |
| Pas d'avant/apres dans video | beforePhotoUrl + badges AVANT/APRES |
| Videos non envoyees individuellement | downloadBinary + multipartUpload par video |

---

## 13. Changelog

**v2.2** (20/02/2026) : beforePhotoUrl, CleanPhotos ameliore, AVANT/APRES badges, videos individuelles
**v2.1** (18/02/2026) : Selection interactive 5 options, regeneration, machine a etats, auto-start
**v2.0** (17/02/2026) : Multi-pieces, PropertyShowcase, CleanPhotos, BatchVision, render server
**v1.0** (16/02/2026) : Pipeline single-photo, speed ramp, VirtualStaging composition
