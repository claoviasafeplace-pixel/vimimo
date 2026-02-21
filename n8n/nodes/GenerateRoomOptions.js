const https = require('https');
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

// === RETRY WITH EXPONENTIAL BACKOFF ===
async function withRetry(fn, maxRetries, baseDelay) {
  maxRetries = maxRetries || 3;
  baseDelay = baseDelay || 2000;
  var lastErr;
  for (var i = 0; i <= maxRetries; i++) {
    try { return await fn(i); }
    catch (e) {
      lastErr = e;
      if (i < maxRetries) await new Promise(function(r) { setTimeout(r, baseDelay * Math.pow(2, i)); });
    }
  }
  throw lastErr;
}

// === REPLICATE PREDICTION WITH FULL RETRY ===
async function runPrediction(modelUrl, input, headers, opts) {
  var maxRetries = (opts && opts.maxRetries !== undefined) ? opts.maxRetries : 2;
  var pollInterval = (opts && opts.pollInterval) || 5000;
  var maxPolls = (opts && opts.maxPolls) || 60;

  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    var predId = null;
    try {
      var resp = await withRetry(function() {
        return post(modelUrl, { input: input }, headers).then(function(r) {
          if (!r.data || !r.data.id) {
            if ([429, 500, 502, 503, 504].includes(r.status)) throw new Error('HTTP ' + r.status);
            return r;
          }
          return r;
        });
      }, 2, 3000);
      predId = resp.data && resp.data.id;
      if (!predId) return null;
    } catch (e) {
      if (attempt < maxRetries) continue;
      throw e;
    }

    var predData = null;
    var pollErrors = 0;
    for (var p = 0; p < maxPolls; p++) {
      await new Promise(function(r) { setTimeout(r, pollInterval); });
      try {
        var pr = await get('https://api.replicate.com/v1/predictions/' + predId, headers);
        predData = pr.data;
        pollErrors = 0;
        if (['succeeded', 'failed', 'canceled'].includes(predData.status)) break;
      } catch (e) {
        pollErrors++;
        if (pollErrors >= 3) throw e;
      }
    }

    if (predData && predData.status === 'succeeded' && predData.output) {
      return Array.isArray(predData.output) ? predData.output[0] : predData.output;
    }
    if (attempt < maxRetries) continue;
  }
  return null;
}

const staticData = $getWorkflowStaticData('global');
const data = $input.first().json;
const chatId = data.chatId;
const sessionKey = `session_${chatId}`;
const session = staticData[sessionKey];

if (!session) throw new Error('No session found for chatId ' + chatId);

const roomIdx = session.currentRoomIndex;
const room = session.rooms[roomIdx];

const botToken = process.env.TELEGRAM_BOT_TOKEN || '8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU';
const openaiKey = process.env.OPENAI_API_KEY || 'OPENAI_KEY_REDACTED';
const replicateToken = process.env.REPLICATE_API_TOKEN || 'REPLICATE_TOKEN_REDACTED';
const repHeaders = { 'Authorization': `Bearer ${replicateToken}` };

// === ALL ROOMS: 5 options + keyboard (user selects, then HandleCallbackQuery launches video) ===

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
// Log analysis for debugging
if (promptsData.analysis) {
  await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: Number(chatId),
    text: `🔍 Analyse : ${promptsData.analysis}`
  });
}

// 3. Generate 5 Flux options with retry (1 retry per option on failure)
const options = [];
for (let i = 0; i < 5; i++) {
  try {
    const url = await runPrediction(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions',
      {
        prompt: prompts[i] + ' Photorealistic, exact room proportions, no distortion, camera locked.',
        input_image: room.photoUrl,
        aspect_ratio: 'match_input_image',
        output_format: 'jpg',
        safety_tolerance: 2,
        seed: Math.floor(Math.random() * 999999)
      },
      repHeaders,
      { maxRetries: 1, pollInterval: 5000, maxPolls: 60 }
    );
    if (url) options.push(url);
  } catch (e) { /* skip this option */ }
  if (i < 4) await new Promise(r => setTimeout(r, 2000));
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
