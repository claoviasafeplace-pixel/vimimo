#!/usr/bin/env node
/**
 * Build script for VIMIMO v2.2 workflow
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
const cleanPhotosCode = readNodeCode('CleanPhotos.js');
const autoStartCheckCode = readNodeCode('AutoStartCheck.js');
const handleCustomPromptCode = readNodeCode('HandleCustomPrompt.js');

// AccumulatePhoto V6 — inline wizard (property type selection)
const accumulatePhotoCode = `// AccumulatePhoto V6 — inline wizard (property type selection)
const https = require('https');
const process = require('process');
const _botToken = process.env.TELEGRAM_BOT_TOKEN || '8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU';

function postTelegram(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.telegram.org',
      path: '/bot' + _botToken + '/sendMessage',
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

// Edge case: clear awaiting_info flag if user sends photos instead of typing info
if (staticData[\`awaiting_info_\${chatId}\`]) {
  delete staticData[\`awaiting_info_\${chatId}\`];
}

// Store photo — uniform key for singles AND album photos
const photoKey = \`photo_\${chatId}_\${fileId}\`;
staticData[photoKey] = { fileId, mediaType, chatId, timestamp: Date.now() };

const propKeyboard = { inline_keyboard: [
  [{ text: '\\ud83c\\udfe2 Appartement', callback_data: 'prop_apartment' }, { text: '\\ud83c\\udfe1 Maison', callback_data: 'prop_house' }],
  [{ text: '\\ud83c\\udfea Commercial', callback_data: 'prop_commercial' }]
] };

if (msg.media_group_id) {
  // ALBUM photo: send property type wizard only ONCE per album (first photo)
  const mgKey = \`mg_\${chatId}_\${msg.media_group_id}\`;
  if (!staticData[mgKey]) {
    staticData[mgKey] = Date.now();
    await postTelegram({
      chat_id: Number(chatId),
      text: '\\ud83d\\udcf8 *Album d\\u00e9tect\\u00e9 !* Je t\\u00e9l\\u00e9charge vos photos...\\n\\n\\ud83c\\udfe0 Quel type de bien souhaitez-vous meubler ?',
      parse_mode: 'Markdown',
      reply_markup: propKeyboard
    });
  }
  return [];
}

// SINGLE photo: send property type wizard
const prefix = \`photo_\${chatId}_\`;
const count = Object.keys(staticData).filter(k => k.startsWith(prefix)).length;
await postTelegram({
  chat_id: Number(chatId),
  text: '\\ud83d\\udcf7 Photo ' + count + ' re\\u00e7ue !\\n\\n\\ud83c\\udfe0 Quel type de bien souhaitez-vous meubler ?',
  reply_markup: propKeyboard
});
return [];`;

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
const process = require('process');

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
const botToken = process.env.TELEGRAM_BOT_TOKEN || '8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU';
const photos = data.photos;
const photoUrls = [];
const debugErrors = [];

for (let i = 0; i < photos.length; i++) {
  try {
  const fileUrl = \`https://api.telegram.org/bot\${botToken}/getFile?file_id=\${encodeURIComponent(photos[i].fileId)}\`;
  const resp = await get(fileUrl);
  if (!resp.data || !resp.data.ok) {
    debugErrors.push(\`Photo \${i}: status=\${resp.status} ok=\${resp.data && resp.data.ok} desc=\${resp.data && resp.data.description || 'none'}\`);
    continue;
  }
  const filePath = resp.data.result.file_path;
  const url = \`https://api.telegram.org/file/bot\${botToken}/\${filePath}\`;
  photoUrls.push({ index: photoUrls.length + 1, url, mediaType: photos[i].mediaType });
  } catch (e) {
    debugErrors.push(\`Photo \${i}: EXCEPTION \${e.message || e}\`);
    continue;
  }
}

if (photoUrls.length === 0) {
  const debugMsg = debugErrors.slice(0, 3).join('\\n');
  const tokenPreview = botToken ? (botToken.substring(0, 10) + '...') : 'UNDEFINED';
  await httpRequest(\`https://api.telegram.org/bot\${botToken}/sendMessage\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: Number(data.chatId), text: '\\u26a0\\ufe0f Aucune photo valide (token=' + tokenPreview + ')\\n\\n' + debugMsg + '\\n\\nRenvoyez vos photos et relancez /go.' }),
    timeout: 10000
  });
  return [];
}
return [{ json: { ...data, photoUrls, totalPhotos: photoUrls.length } }];`;

const batchVisionCode = `const https = require('https');
const http = require('http');
const { URL } = require('url');
const process = require('process');

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
const propertyType = data.propertyType || 'apartment';

const content = [
  { type: 'text', text: \`Analyse ces \${photoUrls.length} photos de pi\\u00e8ces pour un virtual staging. Style : \${style}. Type de bien : \${propertyType}.\` }
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
}, { 'Authorization': \`Bearer \${process.env.OPENAI_API_KEY || 'OPENAI_KEY_REDACTED'}\` });

if (!resp.data.choices || !resp.data.choices[0]) {
  throw new Error('GPT-4o Vision failed: ' + JSON.stringify(resp.data).substring(0, 500));
}

return [{ json: { ...data, visionAnalysis: resp.data.choices[0].message.content } }];`;

// Build the workflow
const workflow = {
  name: "VIMIMO v2.2",
  nodes: [
    // 1. TelegramBot trigger — listens to both message AND callback_query
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

    // 2. CommandRouter — Switch with 9 rules + fallback
    {
      parameters: {
        rules: {
          values: [
            // 0: callback_query (MUST be first — $json.message is undefined for callbacks)
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
            },
            // 1: /start
            {
              conditions: {
                options: { caseSensitive: false },
                conditions: [{
                  id: "is-start",
                  leftValue: "={{ ($json.message && $json.message.text) || '' }}",
                  rightValue: "/start",
                  operator: { type: "string", operation: "startsWith" }
                }],
                combinator: "and"
              },
              renameOutput: true,
              outputKey: "start"
            },
            // 2: /styles
            {
              conditions: {
                options: { caseSensitive: false },
                conditions: [{
                  id: "is-styles",
                  leftValue: "={{ ($json.message && $json.message.text) || '' }}",
                  rightValue: "/styles",
                  operator: { type: "string", operation: "startsWith" }
                }],
                combinator: "and"
              },
              renameOutput: true,
              outputKey: "styles"
            },
            // 3: /exemples
            {
              conditions: {
                options: { caseSensitive: false },
                conditions: [{
                  id: "is-exemples",
                  leftValue: "={{ ($json.message && $json.message.text) || '' }}",
                  rightValue: "/exemples",
                  operator: { type: "string", operation: "startsWith" }
                }],
                combinator: "and"
              },
              renameOutput: true,
              outputKey: "exemples"
            },
            // 4: /aide
            {
              conditions: {
                options: { caseSensitive: false },
                conditions: [{
                  id: "is-aide",
                  leftValue: "={{ ($json.message && $json.message.text) || '' }}",
                  rightValue: "/aide",
                  operator: { type: "string", operation: "startsWith" }
                }],
                combinator: "and"
              },
              renameOutput: true,
              outputKey: "aide"
            },
            // 5: /go
            {
              conditions: {
                options: { caseSensitive: false },
                conditions: [{
                  id: "is-go",
                  leftValue: "={{ ($json.message && $json.message.text) || '' }}",
                  rightValue: "/go",
                  operator: { type: "string", operation: "startsWith" }
                }],
                combinator: "and"
              },
              renameOutput: true,
              outputKey: "go"
            },
            // 6: media (photo/video)
            {
              conditions: {
                conditions: [{
                  id: "has-media",
                  leftValue: "={{ ($json.message && ($json.message.photo || $json.message.video)) ? 'yes' : 'no' }}",
                  rightValue: "yes",
                  operator: { type: "string", operation: "equals" }
                }],
                combinator: "and"
              },
              renameOutput: true,
              outputKey: "media"
            },
            // 7: style choice (backward compat — text with style name)
            {
              conditions: {
                options: { caseSensitive: false },
                conditions: [
                  { id: "style-scandinave", leftValue: "={{ ($json.message && $json.message.text) || '' }}", rightValue: "Scandinave", operator: { type: "string", operation: "contains" } },
                  { id: "style-industriel", leftValue: "={{ ($json.message && $json.message.text) || '' }}", rightValue: "Industriel", operator: { type: "string", operation: "contains" } },
                  { id: "style-moderne", leftValue: "={{ ($json.message && $json.message.text) || '' }}", rightValue: "Moderne", operator: { type: "string", operation: "contains" } },
                  { id: "style-classique", leftValue: "={{ ($json.message && $json.message.text) || '' }}", rightValue: "Classique", operator: { type: "string", operation: "contains" } },
                  { id: "style-boheme", leftValue: "={{ ($json.message && $json.message.text) || '' }}", rightValue: "Boh", operator: { type: "string", operation: "contains" } }
                ],
                combinator: "or"
              },
              renameOutput: true,
              outputKey: "style_choice"
            },
            // 8: free text (any text not caught by rules 1-7) — Retouche Magique or default
            {
              conditions: {
                options: { caseSensitive: false },
                conditions: [{
                  id: "is-freetext",
                  leftValue: "={{ ($json.message && $json.message.text) ? 'yes' : 'no' }}",
                  rightValue: "yes",
                  operator: { type: "string", operation: "equals" }
                }],
                combinator: "and"
              },
              renameOutput: true,
              outputKey: "free_text"
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
      notes: "Routes: /start, /styles, /exemples, /aide, /go, media, style_choice, free_text, callback_query, fallback"
    },

    // 3. SendWelcome
    {
      parameters: {
        chatId: "={{ $json.message.chat.id }}",
        text: "\ud83c\udfe0 *Bienvenue chez VIMIMO v2.2 \u2014 Virtual Staging Interactif*\n\nTransformez vos espaces vides en int\u00e9rieurs de magazine.\n\n\ud83d\ude80 *COMMENT D\u00c9MARRER ?*\n\n1\ufe0f\u20e3 Envoyez-moi *plusieurs photos* de pi\u00e8ces vides.\n2\ufe0f\u20e3 Choisissez le type de bien et un style.\n3\ufe0f\u20e3 Tapez */go* pour lancer le staging.\n\n\ud83c\udfa8 *Nouveau :* Retouche Magique \u2014 envoyez un texte pendant la s\u00e9lection pour g\u00e9n\u00e9rer une option custom !\n\n\ud83d\udc47 *Pr\u00eat ? Envoyez votre premi\u00e8re photo !*",
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

    // 4. SendStylesCatalog
    {
      parameters: {
        method: "POST",
        url: "https://api.telegram.org/bot8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU/sendMessage",
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

    // 5. SendExamples
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

    // 6. SendTips
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

    // 7. AccumulatePhoto (V6 — inline wizard, terminal node)
    {
      parameters: { jsCode: accumulatePhotoCode },
      id: "accumulate-photo",
      name: "AccumulatePhoto",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [650, 850]
    },

    // 8. AckStyleKeyboard (legacy — no longer connected, kept for reference)
    {
      parameters: {
        method: "POST",
        url: "https://api.telegram.org/bot8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU/sendMessage",
        sendBody: true,
        specifyBody: "json",
        jsonBody: `={{ JSON.stringify({ chat_id: Number($json.chatId), text: ($json.isAlbum ? '\\ud83d\\udcf8 Album re\\u00e7u ! Choisissez un style puis tapez /go.' : '\\ud83d\\udcf7 Photo ' + $json.count + ' re\\u00e7ue ! Envoyez d\\u0027autres photos ou tapez /go.') + '\\n\\n\\ud83c\\udfa8 Style actuel : ' + ($json.style || 'Choisissez ci-dessous'), reply_markup: { keyboard: [[{text:'\\ud83d\\uddbc\\ufe0f Scandinave'},{text:'\\ud83e\\uddf1 Industriel'}],[{text:'\\u2728 Moderne'},{text:'\\ud83c\\udfdb\\ufe0f Classique'}],[{text:'\\ud83c\\udf3f Boh\\u00e8me'}]], resize_keyboard: true, one_time_keyboard: false } }) }}`,
        options: {}
      },
      id: "send-ack-keyboard",
      name: "AckStyleKeyboard",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [950, 850]
    },

    // 9. SaveStyleChoice (backward compat — text style selection)
    {
      parameters: { jsCode: saveStyleCode },
      id: "save-style",
      name: "SaveStyleChoice",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [650, 1100]
    },

    // 10. SendStyleConfirmation
    {
      parameters: {
        method: "POST",
        url: "https://api.telegram.org/bot8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU/sendMessage",
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

    // 11. StartProcessing
    {
      parameters: { jsCode: startProcessingCode },
      id: "start-processing",
      name: "StartProcessing",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [650, 1400]
    },

    // 12. DownloadAllPhotos
    {
      parameters: { jsCode: downloadAllPhotosCode },
      id: "download-all-photos",
      name: "DownloadAllPhotos",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1250, 1300]
    },

    // 13. SendProcessingMessage
    {
      parameters: {
        method: "POST",
        url: "https://api.telegram.org/bot8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU/sendMessage",
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

    // 14. CleanPhotos
    {
      parameters: { jsCode: cleanPhotosCode },
      id: "clean-photos",
      name: "CleanPhotos",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1400, 1300]
    },

    // 15. BatchVisionAnalysis (passes propertyType)
    {
      parameters: { jsCode: batchVisionCode },
      id: "batch-vision",
      name: "BatchVisionAnalysis",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1700, 1300]
    },

    // 16. InitializeSession
    {
      parameters: { jsCode: initializeSessionCode },
      id: "initialize-session",
      name: "InitializeSession",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1850, 1300]
    },

    // 17. GenerateRoomOptions
    {
      parameters: { jsCode: generateRoomOptionsCode },
      id: "generate-room-options",
      name: "GenerateRoomOptions",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [2150, 1300]
    },

    // 18. AutoStartCheck
    {
      parameters: { jsCode: autoStartCheckCode },
      id: "auto-start-check",
      name: "AutoStartCheck",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1250, 1100]
    },

    // 19. HandleCallbackQuery (central state machine — prop_*, style_*, sel_*, album_go)
    {
      parameters: { jsCode: handleCallbackQueryCode },
      id: "handle-callback",
      name: "HandleCallbackQuery",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [650, 1700]
    },

    // 20. HandleCustomPrompt (Retouche Magique — free text during selecting phase)
    {
      parameters: { jsCode: handleCustomPromptCode },
      id: "handle-custom-prompt",
      name: "HandleCustomPrompt",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [650, 1800]
    },

    // 21. SendDefault (fallback — output 9)
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
      position: [650, 2100],
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
        // 0: callback_query (first — avoids $json.message errors)
        [{ node: "HandleCallbackQuery", type: "main", index: 0 }],
        // 1: /start
        [{ node: "SendWelcome", type: "main", index: 0 }],
        // 2: /styles
        [{ node: "SendStylesCatalog", type: "main", index: 0 }],
        // 3: /exemples
        [{ node: "SendExamples", type: "main", index: 0 }],
        // 4: /aide
        [{ node: "SendTips", type: "main", index: 0 }],
        // 5: /go
        [{ node: "StartProcessing", type: "main", index: 0 }],
        // 6: media
        [{ node: "AccumulatePhoto", type: "main", index: 0 }],
        // 7: style_choice (backward compat)
        [{ node: "SaveStyleChoice", type: "main", index: 0 }],
        // 8: free_text → HandleCustomPrompt (Retouche Magique or default)
        [{ node: "HandleCustomPrompt", type: "main", index: 0 }],
        // 9: fallback
        [{ node: "SendDefault", type: "main", index: 0 }]
      ]
    },
    // AccumulatePhoto is now terminal (returns [] always) — no connection to AckStyleKeyboard
    SaveStyleChoice: {
      main: [[
        { node: "SendStyleConfirmation", type: "main", index: 0 },
        { node: "AutoStartCheck", type: "main", index: 0 }
      ]]
    },
    AutoStartCheck: {
      main: [[
        { node: "DownloadAllPhotos", type: "main", index: 0 },
        { node: "SendProcessingMessage", type: "main", index: 0 }
      ]]
    },
    StartProcessing: {
      main: [[
        { node: "DownloadAllPhotos", type: "main", index: 0 },
        { node: "SendProcessingMessage", type: "main", index: 0 }
      ]]
    },
    DownloadAllPhotos: {
      main: [[{ node: "CleanPhotos", type: "main", index: 0 }]]
    },
    CleanPhotos: {
      main: [[{ node: "BatchVisionAnalysis", type: "main", index: 0 }]]
    },
    BatchVisionAnalysis: {
      main: [[{ node: "InitializeSession", type: "main", index: 0 }]]
    },
    InitializeSession: {
      main: [[{ node: "GenerateRoomOptions", type: "main", index: 0 }]]
    },
    // HandleCallbackQuery feeds into DownloadAllPhotos (album_go + style auto-start)
    HandleCallbackQuery: {
      main: [[
        { node: "DownloadAllPhotos", type: "main", index: 0 },
        { node: "SendProcessingMessage", type: "main", index: 0 }
      ]]
    },
    // HandleCustomPrompt feeds into DownloadAllPhotos (property info auto-start)
    // Returns [] for retouche magique/default (terminal), returns data for auto-start
    HandleCustomPrompt: {
      main: [[
        { node: "DownloadAllPhotos", type: "main", index: 0 },
        { node: "SendProcessingMessage", type: "main", index: 0 }
      ]]
    }
    // GenerateRoomOptions is a terminal node
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
