# VIMIMO v2.1 — Audit Complet du Workflow n8n

## Architecture
- Pipeline: Telegram Bot → n8n workflow → GPT-4o Vision → Flux Kontext Pro → Kling v2.1 Pro → Remotion → Telegram
- Machine à états dans staticData (sessions persistantes entre exécutions webhook)
- Flow: photos + style + /go → analyse batch → 5 options staging/pièce → sélection user → vidéo → render → envoi

## Fichiers sources

---

### 1. build-v21.js (structure workflow + nodes inline)

```javascript
#!/usr/bin/env node
/**
 * Build script for VIMIMO v2.1 workflow
 * Reads JS code from nodes/ directory and assembles workflow-v2.json
 */

const fs = require('fs');
const path = require('path');

function readNodeCode(filename) {
  return fs.readFileSync(path.join(__dirname, 'nodes', filename), 'utf-8');
}

// Read all node code files
const startProcessingCode = readNodeCode('StartProcessing.js');
const initializeSessionCode = readNodeCode('InitializeSession.js');
const generateRoomOptionsCode = readNodeCode('GenerateRoomOptions.js');
const handleCallbackQueryCode = readNodeCode('HandleCallbackQuery.js');

// Existing node code that stays unchanged
const accumulatePhotoCode = `// Accumulate photos using unique keys to avoid race conditions
const staticData = $getWorkflowStaticData('global');
const msg = $input.first().json.message;
const chatId = String(msg.chat.id);

const fileId = msg.video
  ? msg.video.file_id
  : msg.photo.slice(-1)[0].file_id;
const mediaType = msg.video ? 'video' : 'photo';

// Store each photo as a unique key
const photoKey = \`photo_\${chatId}_\${fileId}\`;
staticData[photoKey] = { fileId, mediaType, chatId, timestamp: Date.now() };

// Count all photos for this chat
const prefix = \`photo_\${chatId}_\`;
const count = Object.keys(staticData).filter(k => k.startsWith(prefix)).length;

// Read style if set
const styleKey = \`style_\${chatId}\`;
const style = staticData[styleKey] ? staticData[styleKey].label : null;

return [{ json: { chatId, count, fileId, mediaType, style } }];`;

const saveStyleCode = `// Save style choice using unique key pattern
const staticData = $getWorkflowStaticData('global');
const msg = $input.first().json.message;
const chatId = String(msg.chat.id);
const text = msg.text || '';

const styleMap = {
  'Scandinave': 'scandinavian',
  'Industriel': 'industrial',
  'Moderne': 'modern_minimalist',
  'Classique': 'classic_french',
  'Boh\\u00e8me': 'bohemian'
};

let chosenStyle = 'modern_minimalist';
let chosenLabel = 'Moderne';
for (const [label, value] of Object.entries(styleMap)) {
  if (text.includes(label)) { chosenStyle = value; chosenLabel = label; break; }
}

// Store style with unique key
const styleKey = \`style_\${chatId}\`;
staticData[styleKey] = { style: chosenStyle, label: chosenLabel };

// Count photos
const prefix = \`photo_\${chatId}_\`;
const photoCount = Object.keys(staticData).filter(k => k.startsWith(prefix)).length;

return [{ json: { chatId, chosenStyle, chosenLabel, photoCount } }];`;

const downloadAllPhotosCode = `const https = require('https');
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
  const resp = await get(\`https://api.telegram.org/bot\${botToken}/getFile?file_id=\${encodeURIComponent(photos[i].fileId)}\`);
  if (!resp.data.ok) throw new Error(\`Failed to get file \${i+1}: \${JSON.stringify(resp.data)}\`);
  const filePath = resp.data.result.file_path;
  const url = \`https://api.telegram.org/file/bot\${botToken}/\${filePath}\`;
  photoUrls.push({ index: i + 1, url, mediaType: photos[i].mediaType });
}

return [{ json: { ...data, photoUrls } }];`;

const batchVisionCode = `const https = require('https');
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
  { type: 'text', text: \`Analyse ces \${photoUrls.length} photos de pi\\u00e8ces pour un virtual staging. Style : \${style}.\` }
];
for (const p of photoUrls) {
  content.push({ type: 'text', text: \`Photo \${p.index} :\` });
  content.push({ type: 'image_url', image_url: { url: p.url } });
}

const resp = await post('https://api.openai.com/v1/chat/completions', {
  model: 'gpt-4o',
  temperature: 0.3,
  max_tokens: 4000,
  messages: [
    {
      role: 'system',
      content: 'Tu es un expert en analyse immobili\\u00e8re. Pour CHAQUE photo, analyse la pi\\u00e8ce.\\n\\nR\\u00e9ponds en JSON valide :\\n{\\n  "propertyType": "apartment"|"house"|"commercial",\\n  "rooms": [\\n    {\\n      "photoIndex": 1,\\n      "roomType": "living_room"|"bedroom"|"kitchen"|"bathroom"|"dining_room"|"office"|"studio"|"hallway"|"balcony",\\n      "roomLabel": "Salon principal",\\n      "dimensions": { "estimatedArea": "25m\\u00b2", "ceilingHeight": "2.5m", "shape": "rectangular" },\\n      "existingMaterials": { "flooring": "parquet", "walls": "white painted", "ceiling": "flat white" },\\n      "lighting": { "naturalLight": "good", "windowCount": 2, "lightDirection": "south" },\\n      "cameraAngle": { "perspective": "corner wide", "height": "eye level", "orientation": "landscape" },\\n      "stagingPriority": "high"|"medium"|"low",\\n      "notes": "specific observations"\\n    }\\n  ],\\n  "overallNotes": "general observations"\\n}\\n\\nphotoIndex must match image order (1-based). One room per photo. Reply ONLY valid JSON, no markdown fences.'
    },
    { role: 'user', content: content }
  ]
}, { 'Authorization': \`Bearer OPENAI_KEY_REDACTED\` });

if (!resp.data.choices || !resp.data.choices[0]) {
  throw new Error('GPT-4o Vision failed: ' + JSON.stringify(resp.data).substring(0, 500));
}

return [{ json: { ...data, visionAnalysis: resp.data.choices[0].message.content } }];`;

// Build the workflow
const workflow = {
  name: "VIMIMO v2.1",
  nodes: [
    // 1. TelegramBot trigger — now listens to both message AND callback_query
    {
      parameters: {
        updates: ["message", "callback_query"],
        additionalFields: {}
      },
      id: "telegram-trigger",
      name: "TelegramBot",
      type: "n8n-nodes-base.telegramTrigger",
      typeVersion: 1,
      position: [0, 800],
      credentials: {
        telegramApi: {
          id: "r3or1rCFrz8TM9ri",
          name: "VIMIMO Telegram Bot"
        }
      }
    },

    // 2. CommandRouter — Switch with 8 rules + fallback
    {
      parameters: {
        rules: {
          values: [
            // 0: /start
            {
              conditions: {
                options: { caseSensitive: false },
                conditions: [{
                  id: "is-start",
                  leftValue: "={{ $json.message.text || '' }}",
                  rightValue: "/start",
                  operator: { type: "string", operation: "startsWith" }
                }],
                combinator: "and"
              },
              renameOutput: true,
              outputKey: "start"
            },
            // 1: /styles
            {
              conditions: {
                options: { caseSensitive: false },
                conditions: [{
                  id: "is-styles",
                  leftValue: "={{ $json.message.text || '' }}",
                  rightValue: "/styles",
                  operator: { type: "string", operation: "startsWith" }
                }],
                combinator: "and"
              },
              renameOutput: true,
              outputKey: "styles"
            },
            // 2: /exemples
            {
              conditions: {
                options: { caseSensitive: false },
                conditions: [{
                  id: "is-exemples",
                  leftValue: "={{ $json.message.text || '' }}",
                  rightValue: "/exemples",
                  operator: { type: "string", operation: "startsWith" }
                }],
                combinator: "and"
              },
              renameOutput: true,
              outputKey: "exemples"
            },
            // 3: /aide
            {
              conditions: {
                options: { caseSensitive: false },
                conditions: [{
                  id: "is-aide",
                  leftValue: "={{ $json.message.text || '' }}",
                  rightValue: "/aide",
                  operator: { type: "string", operation: "startsWith" }
                }],
                combinator: "and"
              },
              renameOutput: true,
              outputKey: "aide"
            },
            // 4: /go
            {
              conditions: {
                options: { caseSensitive: false },
                conditions: [{
                  id: "is-go",
                  leftValue: "={{ $json.message.text || '' }}",
                  rightValue: "/go",
                  operator: { type: "string", operation: "startsWith" }
                }],
                combinator: "and"
              },
              renameOutput: true,
              outputKey: "go"
            },
            // 5: media (photo/video)
            {
              conditions: {
                options: { caseSensitive: false },
                conditions: [{
                  id: "has-media",
                  leftValue: "={{ $json.message.photo || $json.message.video ? 'yes' : 'no' }}",
                  rightValue: "yes",
                  operator: { type: "string", operation: "equals" }
                }],
                combinator: "and"
              },
              renameOutput: true,
              outputKey: "media"
            },
            // 6: style choice
            {
              conditions: {
                options: { caseSensitive: false },
                conditions: [
                  { id: "style-scandinave", leftValue: "={{ $json.message.text || '' }}", rightValue: "Scandinave", operator: { type: "string", operation: "contains" } },
                  { id: "style-industriel", leftValue: "={{ $json.message.text || '' }}", rightValue: "Industriel", operator: { type: "string", operation: "contains" } },
                  { id: "style-moderne", leftValue: "={{ $json.message.text || '' }}", rightValue: "Moderne", operator: { type: "string", operation: "contains" } },
                  { id: "style-classique", leftValue: "={{ $json.message.text || '' }}", rightValue: "Classique", operator: { type: "string", operation: "contains" } },
                  { id: "style-boheme", leftValue: "={{ $json.message.text || '' }}", rightValue: "Boh", operator: { type: "string", operation: "contains" } }
                ],
                combinator: "or"
              },
              renameOutput: true,
              outputKey: "style_choice"
            },
            // 7: callback_query (NEW in v2.1)
            {
              conditions: {
                options: { caseSensitive: false },
                conditions: [{
                  id: "is-callback",
                  leftValue: "={{ $json.callback_query ? 'yes' : 'no' }}",
                  rightValue: "yes",
                  operator: { type: "string", operation: "equals" }
                }],
                combinator: "and"
              },
              renameOutput: true,
              outputKey: "callback_query"
            }
          ]
        },
        options: {
          fallbackOutput: "extra"
        }
      },
      id: "command-router",
      name: "CommandRouter",
      type: "n8n-nodes-base.switch",
      typeVersion: 3,
      position: [300, 800],
      notes: "Routes: /start, /styles, /exemples, /aide, /go, photo/video, style choice, callback_query, fallback"
    },

    // 3. SendWelcome (unchanged)
    {
      parameters: {
        chatId: "={{ $json.message.chat.id }}",
        text: "\ud83c\udfe0 *Bienvenue chez VIMIMO v2.1 \u2014 Virtual Staging Interactif*\n\nTransformez vos espaces vides en int\u00e9rieurs de magazine.\n\n\ud83d\ude80 *COMMENT D\u00c9MARRER ?*\n\n1\ufe0f\u20e3 Envoyez-moi *plusieurs photos* de pi\u00e8ces vides.\n2\ufe0f\u20e3 Choisissez un style (Scandinave, Industriel, Moderne...).\n3\ufe0f\u20e3 Tapez */go* pour lancer le staging.\n\n\ud83c\udfa8 *Nouveau :* Vous pourrez choisir parmi 5 options de staging pour chaque pi\u00e8ce !\n\n\ud83d\udc47 *Pr\u00eat ? Envoyez votre premi\u00e8re photo !*",
        additionalFields: { parse_mode: "Markdown" }
      },
      id: "send-welcome",
      name: "SendWelcome",
      type: "n8n-nodes-base.telegram",
      typeVersion: 1.2,
      position: [650, 0],
      credentials: {
        telegramApi: { id: "r3or1rCFrz8TM9ri", name: "VIMIMO Telegram Bot" }
      }
    },

    // 4. SendStylesCatalog (unchanged)
    {
      parameters: {
        method: "POST",
        url: "=https://api.telegram.org/bot8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU/sendMessage",
        sendBody: true,
        specifyBody: "json",
        jsonBody: `={{ JSON.stringify({ chat_id: $json.message.chat.id, text: '\ud83c\udfa8 *Catalogue des Styles VIMIMO*\\n\\n\ud83d\uddbc\ufe0f *Scandinave* \u2014 Bois clair, lignes \u00e9pur\u00e9es, tons neutres et chaleureux.\\n\ud83e\uddf1 *Industriel* \u2014 M\u00e9tal brut, briques, mobilier vintage.\\n\u2728 *Moderne* \u2014 Minimaliste, design \u00e9pur\u00e9, touches de couleur.\\n\ud83c\udfdb\ufe0f *Classique* \u2014 \u00c9l\u00e9gance intemporelle, moulures, dorures subtiles.\\n\ud83c\udf3f *Boh\u00e8me* \u2014 Textures naturelles, plantes, atmosph\u00e8re d\u00e9contract\u00e9e.\\n\\n\ud83d\udc47 Choisissez votre style !', parse_mode: 'Markdown', reply_markup: { keyboard: [[{text:'\ud83d\uddbc\ufe0f Scandinave'},{text:'\ud83e\uddf1 Industriel'}],[{text:'\u2728 Moderne'},{text:'\ud83c\udfdb\ufe0f Classique'}],[{text:'\ud83c\udf3f Boh\u00e8me'}]], resize_keyboard: true, one_time_keyboard: true } }) }}`,
        options: {}
      },
      id: "send-styles",
      name: "SendStylesCatalog",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [650, 200]
    },

    // 5. SendExamples (unchanged)
    {
      parameters: {
        chatId: "={{ $json.message.chat.id }}",
        text: "\ud83c\udfac *Nos Meilleures R\u00e9alisations*\n\nVoici quelques exemples de transformations r\u00e9alis\u00e9es par VIMIMO :\n\n\ud83d\udd17 _Les exemples vid\u00e9o seront ajout\u00e9s ici une fois vos premi\u00e8res r\u00e9alisations termin\u00e9es._\n\n\ud83d\udca1 Envoyez-moi votre premi\u00e8re photo pour cr\u00e9er votre propre avant/apr\u00e8s !",
        additionalFields: { parse_mode: "Markdown" }
      },
      id: "send-examples",
      name: "SendExamples",
      type: "n8n-nodes-base.telegram",
      typeVersion: 1.2,
      position: [650, 400],
      credentials: {
        telegramApi: { id: "r3or1rCFrz8TM9ri", name: "VIMIMO Telegram Bot" }
      }
    },

    // 6. SendTips (unchanged)
    {
      parameters: {
        chatId: "={{ $json.message.chat.id }}",
        text: "\ud83d\udcf8 *Conseils pour un Rendu Parfait*\n\n*Pour une photo :*\n\u2022 Placez-vous dans un coin de la pi\u00e8ce.\n\u2022 Cadrez le plus large possible.\n\u2022 Assurez un bon \u00e9clairage (ouvrez les volets !).\n\n*\u00c9vitez :*\n\u274c Les pi\u00e8ces encombr\u00e9es (videz au maximum).\n\u274c Les contre-jours forts.\n\n\ud83d\udc47 Pr\u00eat ? Envoyez vos photos !",
        additionalFields: { parse_mode: "Markdown" }
      },
      id: "send-tips",
      name: "SendTips",
      type: "n8n-nodes-base.telegram",
      typeVersion: 1.2,
      position: [650, 600],
      credentials: {
        telegramApi: { id: "r3or1rCFrz8TM9ri", name: "VIMIMO Telegram Bot" }
      }
    },

    // 7. AccumulatePhoto (unchanged)
    {
      parameters: { jsCode: accumulatePhotoCode },
      id: "accumulate-photo",
      name: "AccumulatePhoto",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [650, 850]
    },

    // 8. AckStyleKeyboard (unchanged)
    {
      parameters: {
        method: "POST",
        url: "=https://api.telegram.org/bot8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU/sendMessage",
        sendBody: true,
        specifyBody: "json",
        jsonBody: `={{ JSON.stringify({ chat_id: Number($json.chatId), text: '\\ud83d\\udcf7 Photo ' + $json.count + ' re\\u00e7ue !\\n\\nEnvoyez d\\'autres photos ou tapez /go pour lancer le staging.\\n\\n\\ud83c\\udfa8 Style actuel : ' + ($json.style || 'Choisissez ci-dessous'), reply_markup: { keyboard: [[{text:'\\ud83d\\uddbc\\ufe0f Scandinave'},{text:'\\ud83e\\uddf1 Industriel'}],[{text:'\\u2728 Moderne'},{text:'\\ud83c\\udfdb\\ufe0f Classique'}],[{text:'\\ud83c\\udf3f Boh\\u00e8me'}]], resize_keyboard: true, one_time_keyboard: false } }) }}`,
        options: {}
      },
      id: "send-ack-keyboard",
      name: "AckStyleKeyboard",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [950, 850]
    },

    // 9. SaveStyleChoice (unchanged)
    {
      parameters: { jsCode: saveStyleCode },
      id: "save-style",
      name: "SaveStyleChoice",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [650, 1100]
    },

    // 10. SendStyleConfirmation (unchanged)
    {
      parameters: {
        method: "POST",
        url: "=https://api.telegram.org/bot8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU/sendMessage",
        sendBody: true,
        specifyBody: "json",
        jsonBody: `={{ JSON.stringify({ chat_id: Number($json.chatId), text: '\\u2705 Style *' + $json.chosenLabel + '* s\\u00e9lectionn\\u00e9 !\\n\\nVous avez ' + $json.photoCount + ' photo(s).\\nEnvoyez d\\'autres photos ou tapez /go pour lancer.', parse_mode: 'Markdown', reply_markup: { keyboard: [[{text:'\\ud83d\\uddbc\\ufe0f Scandinave'},{text:'\\ud83e\\uddf1 Industriel'}],[{text:'\\u2728 Moderne'},{text:'\\ud83c\\udfdb\\ufe0f Classique'}],[{text:'\\ud83c\\udf3f Boh\\u00e8me'}]], resize_keyboard: true, one_time_keyboard: false } }) }}`,
        options: {}
      },
      id: "send-style-confirm",
      name: "SendStyleConfirmation",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [950, 1100]
    },

    // 11. StartProcessing (MODIFIED — no cleanup, session check)
    {
      parameters: { jsCode: startProcessingCode },
      id: "start-processing",
      name: "StartProcessing",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [650, 1400]
    },

    // 12. DownloadAllPhotos (unchanged)
    {
      parameters: { jsCode: downloadAllPhotosCode },
      id: "download-all-photos",
      name: "DownloadAllPhotos",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1250, 1300]
    },

    // 13. SendProcessingMessage (MODIFIED — updated text, uses $json directly)
    {
      parameters: {
        method: "POST",
        url: "=https://api.telegram.org/bot8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU/sendMessage",
        sendBody: true,
        specifyBody: "json",
        jsonBody: `={{ JSON.stringify({ chat_id: Number($json.chatId), text: '\\ud83d\\udd0d *Analyse en cours de vos ' + $json.totalPhotos + ' photos en style ' + $json.styleLabel + '...*\\n\\nVous pourrez ensuite choisir votre staging pr\\u00e9f\\u00e9r\\u00e9 pour chaque pi\\u00e8ce.\\n\\n\\u23f3 Quelques instants...', parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }) }}`,
        options: {}
      },
      id: "send-processing-msg",
      name: "SendProcessingMessage",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1250, 1500]
    },

    // 14. BatchVisionAnalysis (unchanged)
    {
      parameters: { jsCode: batchVisionCode },
      id: "batch-vision",
      name: "BatchVisionAnalysis",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1550, 1300]
    },

    // 15. InitializeSession (NEW in v2.1)
    {
      parameters: { jsCode: initializeSessionCode },
      id: "initialize-session",
      name: "InitializeSession",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1850, 1300]
    },

    // 16. GenerateRoomOptions (NEW in v2.1)
    {
      parameters: { jsCode: generateRoomOptionsCode },
      id: "generate-room-options",
      name: "GenerateRoomOptions",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [2150, 1300]
    },

    // 17. HandleCallbackQuery (NEW in v2.1 — central state machine)
    {
      parameters: { jsCode: handleCallbackQueryCode },
      id: "handle-callback",
      name: "HandleCallbackQuery",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [650, 1700]
    },

    // 18. SendDefault (unchanged, now on output 8)
    {
      parameters: {
        chatId: "={{ $json.message.chat.id }}",
        text: "\ud83d\udc4b Je n'ai pas compris votre message.\n\nVoici ce que je peux faire :\n\ud83d\udcf8 Envoyez-moi *plusieurs photos* de pi\u00e8ces vides.\n\ud83c\udfa8 Choisissez un style de d\u00e9coration.\n/go \u2014 Lancer le staging\n/start \u2014 Relancer l'assistant\n/styles \u2014 Voir les styles disponibles\n/aide \u2014 Conseils pour photographier",
        additionalFields: { parse_mode: "Markdown" }
      },
      id: "send-default",
      name: "SendDefault",
      type: "n8n-nodes-base.telegram",
      typeVersion: 1.2,
      position: [650, 1950],
      credentials: {
        telegramApi: { id: "r3or1rCFrz8TM9ri", name: "VIMIMO Telegram Bot" }
      }
    }
  ],

  connections: {
    TelegramBot: {
      main: [[{ node: "CommandRouter", type: "main", index: 0 }]]
    },
    CommandRouter: {
      main: [
        // 0: /start
        [{ node: "SendWelcome", type: "main", index: 0 }],
        // 1: /styles
        [{ node: "SendStylesCatalog", type: "main", index: 0 }],
        // 2: /exemples
        [{ node: "SendExamples", type: "main", index: 0 }],
        // 3: /aide
        [{ node: "SendTips", type: "main", index: 0 }],
        // 4: /go
        [{ node: "StartProcessing", type: "main", index: 0 }],
        // 5: media
        [{ node: "AccumulatePhoto", type: "main", index: 0 }],
        // 6: style_choice
        [{ node: "SaveStyleChoice", type: "main", index: 0 }],
        // 7: callback_query (NEW)
        [{ node: "HandleCallbackQuery", type: "main", index: 0 }],
        // 8: fallback
        [{ node: "SendDefault", type: "main", index: 0 }]
      ]
    },
    AccumulatePhoto: {
      main: [[{ node: "AckStyleKeyboard", type: "main", index: 0 }]]
    },
    SaveStyleChoice: {
      main: [[{ node: "SendStyleConfirmation", type: "main", index: 0 }]]
    },
    StartProcessing: {
      main: [[
        { node: "DownloadAllPhotos", type: "main", index: 0 },
        { node: "SendProcessingMessage", type: "main", index: 0 }
      ]]
    },
    DownloadAllPhotos: {
      main: [[{ node: "BatchVisionAnalysis", type: "main", index: 0 }]]
    },
    BatchVisionAnalysis: {
      main: [[{ node: "InitializeSession", type: "main", index: 0 }]]
    },
    InitializeSession: {
      main: [[{ node: "GenerateRoomOptions", type: "main", index: 0 }]]
    }
    // GenerateRoomOptions and HandleCallbackQuery are terminal nodes
  },

  settings: {
    executionOrder: "v1",
    callerPolicy: "workflowsFromSameOwner",
    availableInMCP: false
  },

  staticData: {
    global: {}
  }
};

// Write the workflow JSON
const outputPath = path.join(__dirname, 'workflow-v2.json');
fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2), 'utf-8');
console.log(`Workflow written to ${outputPath}`);
console.log(`Nodes: ${workflow.nodes.length}`);
console.log(`Connections: ${Object.keys(workflow.connections).length} sources`);
```

---

### 2. StartProcessing.js

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
  // Session is stale, force-reset it
  delete staticData[sessionKey];
  await post('https://api.telegram.org/bot8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU/sendMessage', {
    chat_id: chatId, text: '🔄 Session précédente expirée, relancement...', parse_mode: 'Markdown'
  });
}

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

// Don't clean up keys here — InitializeSession will do it
return [{ json: result }];
```

---

### 3. InitializeSession.js

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
    visionData: room,
    options: [],
    galleryMessageId: null,
    selectedUrl: null,
    regenerationCount: 0
  }))
};

// Clean up accumulated photo/style keys
const photoPrefix = `photo_${chatId}_`;
Object.keys(staticData).filter(k => k.startsWith(photoPrefix)).forEach(k => delete staticData[k]);
delete staticData[`style_${chatId}`];

return [{ json: { chatId, session: staticData[sessionKey] } }];
```

---

### 4. GenerateRoomOptions.js

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
    { role: 'system', content: 'You are an expert at writing image EDITING prompts for Flux Kontext Pro.\n\nYou will receive a PHOTO of an empty room. Analyze it carefully: the exact wall colors, floor material, window positions, door locations, ceiling type, lighting conditions, and camera perspective.\n\nThen write 5 EDITING prompts that ONLY add furniture/decor to this exact photo.\n\nCRITICAL RULES:\n1. NEVER describe the room itself in the prompt. Flux Kontext Pro already sees the photo — describing walls/floor/windows CAUSES DISTORTION.\n2. Start every prompt with: "Add [specific furniture] to this room."\n3. End every prompt with: "Keep the exact same room structure, walls, floor, windows, ceiling, perspective, camera angle and lighting unchanged."\n4. Reference spatial positions you see in the photo (e.g., "along the back wall", "in front of the window", "in the center of the room") so furniture is placed logically.\n5. Only mention furniture, rugs, artwork, plants, lamps, and decorative objects. NO structural changes.\n6. Keep each prompt SHORT (2-3 sentences). Longer prompts = more distortion.\n7. Each of the 5 prompts should propose a DIFFERENT furniture arrangement but the SAME design style.\n8. Furniture must be proportional to the room size you see in the photo.\n\nRespond in JSON: { "analysis": "Brief 1-line description of what you see", "prompts": ["prompt1", "prompt2", "prompt3", "prompt4", "prompt5"] }\nNo markdown, ONLY valid JSON.' },
    { role: 'user', content: [
      { type: 'text', text: `Room: ${room.roomType} (${room.roomLabel}). Style to apply: ${session.style} (${session.styleLabel}). Generate 5 editing prompts for this photo:` },
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
// Log analysis for debugging
if (promptsData.analysis) {
  await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: Number(chatId),
    text: `🔍 Analyse : ${promptsData.analysis}`
  });
}

// 3. Start 5 Flux Kontext Pro predictions (fire-and-poll)
const predIds = [];
for (let i = 0; i < 5; i++) {
  try {
    const resp = await post('https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions', {
      input: {
        prompt: prompts[i],
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

### 5. HandleCallbackQuery.js (machine à états centrale)

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

// Answer callback query immediately (Telegram requirement)
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
const choice = parts[3]; // "1"-"5" or "regen"

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

  // GPT-4o VISION: analyze photo + generate 5 EDITING prompts
  const promptResp = await post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4o', temperature: 0.5, max_tokens: 2000,
    messages: [
      { role: 'system', content: 'You are an expert at writing image EDITING prompts for Flux Kontext Pro.\n\nYou will receive a PHOTO of an empty room. Analyze it carefully: the exact wall colors, floor material, window positions, door locations, ceiling type, lighting conditions, and camera perspective.\n\nThen write 5 EDITING prompts that ONLY add furniture/decor to this exact photo.\n\nCRITICAL RULES:\n1. NEVER describe the room itself in the prompt. Flux Kontext Pro already sees the photo — describing walls/floor/windows CAUSES DISTORTION.\n2. Start every prompt with: "Add [specific furniture] to this room."\n3. End every prompt with: "Keep the exact same room structure, walls, floor, windows, ceiling, perspective, camera angle and lighting unchanged."\n4. Reference spatial positions you see in the photo (e.g., "along the back wall", "in front of the window", "in the center of the room") so furniture is placed logically.\n5. Only mention furniture, rugs, artwork, plants, lamps, and decorative objects. NO structural changes.\n6. Keep each prompt SHORT (2-3 sentences). Longer prompts = more distortion.\n7. Each of the 5 prompts should propose a DIFFERENT furniture arrangement but the SAME design style.\n8. Furniture must be proportional to the room size you see in the photo.\n\nRespond in JSON: { "analysis": "Brief 1-line description of what you see", "prompts": ["prompt1", "prompt2", "prompt3", "prompt4", "prompt5"] }\nNo markdown, ONLY valid JSON.' },
      { role: 'user', content: [
        { type: 'text', text: `Room: ${roomData.roomType} (${roomData.roomLabel}). Style to apply: ${session.style} (${session.styleLabel}). Generate 5 editing prompts for this photo:` },
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

  // Start 5 Flux predictions
  const predIds = [];
  for (let i = 0; i < 5; i++) {
    try {
      const resp = await post('https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions', {
        input: {
          prompt: prompts[i],
          input_image: roomData.photoUrl,
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

  // Poll all predictions
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

  // Store options
  roomData.options = options;

  // Send photos
  for (let i = 0; i < options.length; i++) {
    await post(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      chat_id: Number(chatId),
      photo: options[i],
      caption: `Option ${i + 1}/${options.length}`
    });
    await new Promise(r => setTimeout(r, 500));
  }

  // Send inline keyboard
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
  // === REGENERATION ===
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
  // === SELECTION (choice = "1"-"5") ===
  const choiceIdx = parseInt(choice) - 1;
  if (choiceIdx < 0 || choiceIdx >= room.options.length) {
    return [{ json: { error: 'invalid choice index' } }];
  }

  room.selectedUrl = room.options[choiceIdx];
  session.updatedAt = Date.now();

  // Edit keyboard message to show confirmation
  if (room.galleryMessageId) {
    try {
      await post(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        chat_id: Number(chatId),
        message_id: room.galleryMessageId,
        text: `✅ *${room.roomLabel}* — Option ${choice} sélectionnée !`,
        parse_mode: 'Markdown'
      });
    } catch (e) { /* ignore edit errors */ }
  }

  // Check if all rooms have been selected
  const allSelected = session.rooms.every(r => r.selectedUrl !== null);

  if (!allSelected) {
    // === NEXT ROOM ===
    const nextIdx = roomIdx + 1;
    session.currentRoomIndex = nextIdx;
    const nextRoom = session.rooms[nextIdx];

    // Send original photo of next room
    await post(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      chat_id: Number(chatId),
      photo: nextRoom.photoUrl,
      caption: `📷 Pièce ${nextIdx + 1}/${session.totalRooms} : *${nextRoom.roomLabel}*`,
      parse_mode: 'Markdown'
    });

    await generateRoomOptions(nextRoom, nextIdx);
    return [{ json: { ok: true, action: 'next_room', roomIndex: nextIdx } }];

  } else {
    // ============================================================
    // ALL ROOMS SELECTED — LAUNCH VIDEO PIPELINE
    // ============================================================
    session.phase = 'videos';

    await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: Number(chatId),
      text: '🎬 *Toutes les pièces sélectionnées !*\n\n⏳ Génération des vidéos en cours...\nTemps estimé : ~' + (session.totalRooms * 2) + ' minutes',
      parse_mode: 'Markdown'
    });

    // Send gallery of staged photos
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
      } catch (e) { /* ignore gallery errors */ }
    }

    // === Kling v2.1 Pro for each room ===
    const videoResults = [];
    for (let i = 0; i < session.rooms.length; i++) {
      const r = session.rooms[i];

      await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: Number(chatId),
        text: `🎬 Vidéo ${i + 1}/${session.totalRooms} : ${r.roomLabel}...`
      });

      let videoUrl = '';
      try {
        const vidResp = await post('https://api.replicate.com/v1/models/kwaivgi/kling-v2.1/predictions', {
          input: {
            prompt: `Each piece of ${session.style} furniture pops up and falls into place one by one in this ${r.roomType}. The furnishings materialize naturally, proportional to the room. Smooth cinematic animation, photorealistic interior.`,
            start_image: r.photoUrl,
            end_image: r.selectedUrl,
            mode: 'pro',
            duration: 5,
            negative_prompt: 'blurry, distorted, low quality, warped walls, changed room structure, flickering'
          }
        }, repHeaders);

        if (vidResp.data.id) {
          const vidData = await pollPrediction(vidResp.data.id);
          if (vidData && vidData.status === 'succeeded' && vidData.output) {
            videoUrl = Array.isArray(vidData.output) ? vidData.output[0] : vidData.output;
          }
        }
      } catch (e) { /* silent fallback */ }

      if (!videoUrl) videoUrl = r.selectedUrl; // fallback to static image

      videoResults.push({
        index: i + 1,
        roomType: r.roomType,
        roomLabel: r.roomLabel,
        originalPhotoUrl: r.photoUrl,
        stagedPhotoUrl: r.selectedUrl,
        videoUrl
      });

      if (i < session.rooms.length - 1) await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // === Remotion render ===
    session.phase = 'rendering';

    await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: Number(chatId),
      text: '🎥 Compilation vidéo finale en cours...'
    });

    const remotionPayload = {
      compositionId: 'PropertyShowcase',
      inputProps: {
        property: { title: 'Visite Virtuelle', style: session.style },
        rooms: videoResults.map(r => ({
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

    // Poll render status
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
        text: '⚠️ Erreur lors de la compilation vidéo. Veuillez réessayer.'
      });
      delete staticData[sessionKey];
      return [{ json: { error: 'render failed' } }];
    }

    // Download and upload video to Telegram
    const internalVideoUrl = `http://172.18.0.1:8000/renders/${renderId}/download`;
    const videoBuffer = await downloadBinary(internalVideoUrl);

    if (videoBuffer.length < 1000) {
      await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: Number(chatId),
        text: '⚠️ Erreur: vidéo trop petite. Veuillez réessayer.'
      });
      delete staticData[sessionKey];
      return [{ json: { error: 'video too small' } }];
    }

    const caption = '🎬 Votre Virtual Staging est prêt !\n\nToutes vos pièces transformées en une vidéo cinématique.\n\n🔄 Envoyez de nouvelles photos pour un autre rendu !\n💬 Tapez /styles pour changer de style.';
    const uploadResult = await multipartUpload(botToken, chatId, videoBuffer, caption);

    if (!uploadResult.ok) {
      await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: Number(chatId),
        text: '⚠️ Erreur lors de l\'envoi de la vidéo.'
      });
    }

    // Clean up session
    delete staticData[sessionKey];

    return [{ json: { ok: true, action: 'complete', renderId } }];
  }
}
```

---

### 6. deploy-v21.sh

```bash
#!/bin/bash
# Deploy VIMIMO v2.1 workflow to n8n instance
# Usage: ./deploy-v21.sh

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

# Prepare body: remove staticData and tags, write to temp file
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

echo ""
echo "=== Deployment complete ==="
echo "Workflow: ${N8N_URL}/workflow/${WORKFLOW_ID}"

# Cleanup
rm -f /tmp/vimimo-deploy-body.json /tmp/vimimo-deactivate.json /tmp/vimimo-update-result.json /tmp/vimimo-activate.json
```
