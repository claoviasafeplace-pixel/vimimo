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

const staticData = $getWorkflowStaticData('global');
const cbq = $input.first().json.callback_query;
const callbackId = cbq.id;
const chatId = String(cbq.message.chat.id);
const cbData = cbq.data;

const botToken = process.env.TELEGRAM_BOT_TOKEN || '8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU';
const openaiKey = process.env.OPENAI_API_KEY || 'OPENAI_KEY_REDACTED';
const replicateToken = process.env.REPLICATE_API_TOKEN || 'REPLICATE_TOKEN_REDACTED';
const repHeaders = { 'Authorization': `Bearer ${replicateToken}` };

// Answer callback query immediately (Telegram requirement)
await post(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
  callback_query_id: callbackId
});

// === PROPERTY TYPE SELECTION: user clicked prop_apartment/house/commercial ===
if (cbData.startsWith('prop_')) {
  const propType = cbData.replace('prop_', '');
  staticData[`prop_${chatId}`] = propType;

  const propLabels = { apartment: '\ud83c\udfe2 Appartement', house: '\ud83c\udfe1 Maison', commercial: '\ud83c\udfea Commercial' };
  const propLabel = propLabels[propType] || propType;

  const messageId = cbq.message && cbq.message.message_id;
  if (messageId) {
    try {
      await post(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        chat_id: Number(chatId),
        message_id: messageId,
        text: `\u2705 Type : ${propLabel}\n\n\ud83c\udfa8 Choisissez votre style :\n\n\ud83d\uddbc\ufe0f Scandinave\nBois clair, lignes \u00e9pur\u00e9es, tons neutres\n\n\ud83e\uddf1 Industriel\nM\u00e9tal brut, briques, mobilier vintage\n\n\u2728 Moderne\nDesign \u00e9pur\u00e9, touches de couleur vibrantes\n\n\ud83c\udfdb\ufe0f Classique\n\u00c9l\u00e9gance intemporelle, moulures, dorures\n\n\ud83c\udf3f Boh\u00e8me\nTextures naturelles, plantes, atmosph\u00e8re zen`,
        reply_markup: { inline_keyboard: [
          [{ text: '\ud83d\uddbc\ufe0f Scandinave', callback_data: `style_${chatId}_scandinavian` }, { text: '\ud83e\uddf1 Industriel', callback_data: `style_${chatId}_industrial` }],
          [{ text: '\u2728 Moderne', callback_data: `style_${chatId}_modern_minimalist` }, { text: '\ud83c\udfdb\ufe0f Classique', callback_data: `style_${chatId}_classic_french` }],
          [{ text: '\ud83c\udf3f Boh\u00e8me', callback_data: `style_${chatId}_bohemian` }]
        ] }
      });
    } catch (e) { /* ignore edit errors */ }
  }

  return [];
}

// === STYLE SELECTION VIA INLINE KEYBOARD ===
if (cbData.startsWith('style_')) {
  const styleParts = cbData.split('_');
  const styleChatId = styleParts[1];
  // styleId can contain underscores (e.g., modern_minimalist, classic_french)
  const styleId = styleParts.slice(2).join('_');

  const styleLabels = {
    scandinavian: 'Scandinave',
    industrial: 'Industriel',
    modern_minimalist: 'Moderne',
    classic_french: 'Classique',
    bohemian: 'Boh\u00e8me'
  };
  const styleLabel = styleLabels[styleId] || styleId;

  staticData[`style_${styleChatId}`] = { style: styleId, label: styleLabel };

  const messageId = cbq.message && cbq.message.message_id;
  if (messageId) {
    try {
      await post(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        chat_id: Number(styleChatId),
        message_id: messageId,
        text: `\u2705 Style *${styleLabel}* s\u00e9lectionn\u00e9 !`,
        parse_mode: 'Markdown'
      });
    } catch (e) { /* ignore */ }
  }

  // Ask for optional property info (price, city, neighborhood)
  await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: Number(styleChatId),
    text: '\ud83c\udfe0 *Voulez-vous personnaliser la vid\u00e9o finale ?*\n\nAjoutez le prix, la ville et le quartier pour un rendu professionnel.',
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[
      { text: '\u270d\ufe0f Oui, ajouter les infos', callback_data: 'ask_property_info' },
      { text: '\u27a1\ufe0f Passer', callback_data: 'skip_property_info' }
    ]] }
  });

  return [];
}

// === PROPERTY INFO: user wants to add price/city/neighborhood ===
if (cbData === 'ask_property_info') {
  staticData[`awaiting_info_${chatId}`] = true;

  const messageId = cbq.message && cbq.message.message_id;
  if (messageId) {
    try {
      await post(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        chat_id: Number(chatId),
        message_id: messageId,
        text: '\u270d\ufe0f *Tapez les informations du bien :*\n\nExemple : `350 000\u20ac, Lyon, Croix-Rousse`\n\n_(Prix, Ville, Quartier \u2014 s\u00e9par\u00e9s par des virgules)_',
        parse_mode: 'Markdown'
      });
    } catch (e) { /* ignore */ }
  }

  return [];
}

// === PROPERTY INFO: user skipped → continue pipeline ===
if (cbData === 'skip_property_info') {
  const messageId = cbq.message && cbq.message.message_id;
  if (messageId) {
    try {
      await post(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        chat_id: Number(chatId),
        message_id: messageId,
        text: '\u27a1\ufe0f Informations ignor\u00e9es.'
      });
    } catch (e) { /* ignore */ }
  }

  // Auto-start check (album + style + photos + no session)
  const mgPrefix = `mg_${chatId}_`;
  const hasAlbum = Object.keys(staticData).some(k => k.startsWith(mgPrefix));

  if (hasAlbum) {
    const photoPrefix = `photo_${chatId}_`;
    const photoKeys = Object.keys(staticData).filter(k => k.startsWith(photoPrefix));
    const photos = photoKeys.map(k => staticData[k]).sort((a, b) => a.timestamp - b.timestamp);

    const sessKey = `session_${chatId}`;
    const styleData = staticData[`style_${chatId}`];

    if (photos.length > 0 && !staticData[sessKey] && styleData) {
      const propKey = `prop_${chatId}`;
      const propertyType = staticData[propKey] || 'apartment';

      await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: Number(chatId),
        text: `\ud83d\ude80 *Lancement automatique du staging ${styleData.label}...*`,
        parse_mode: 'Markdown'
      });

      return [{ json: {
        chatId,
        photos,
        style: styleData.style,
        styleLabel: styleData.label,
        propertyType,
        propertyInfo: staticData[`propertyInfo_${chatId}`] || null,
        totalPhotos: photos.length,
        fromAlbum: true
      } }];
    }
  }

  await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: Number(chatId),
    text: '\ud83d\udcf7 Envoyez vos photos puis tapez /go pour lancer le staging.'
  });

  return [];
}

// === ALBUM GO BUTTON: user clicked "Lancer le staging" ===
if (cbData === 'album_go') {
  const styleKey = `style_${chatId}`;
  const styleData = staticData[styleKey];

  // Check style is set
  if (!styleData || !styleData.style) {
    await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: Number(chatId),
      text: '\u26a0\ufe0f Choisissez d\u0027abord un style avant de lancer !\n\n\ud83c\udfa8 Utilisez le clavier ci-dessous.'
    });
    return [];
  }

  // Gather photos
  const photoPrefix = `photo_${chatId}_`;
  const photoKeys = Object.keys(staticData).filter(k => k.startsWith(photoPrefix));
  const photos = photoKeys.map(k => staticData[k]).sort((a, b) => a.timestamp - b.timestamp);

  if (photos.length === 0) {
    await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: Number(chatId),
      text: '\u26a0\ufe0f Aucune photo en m\u00e9moire. Renvoyez vos photos.'
    });
    return [];
  }

  // Check no active session
  const sessKey = `session_${chatId}`;
  if (staticData[sessKey] && staticData[sessKey].phase === 'selecting') {
    const age = Date.now() - (staticData[sessKey].updatedAt || 0);
    if (age < 15 * 60 * 1000) {
      await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: Number(chatId),
        text: '\u26a0\ufe0f Staging d\u00e9j\u00e0 en cours ! Terminez vos s\u00e9lections.'
      });
      return [];
    }
    delete staticData[sessKey];
  }

  // Edit button message to show confirmation
  const messageId = cbq.message && cbq.message.message_id;
  if (messageId) {
    try {
      await post(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        chat_id: Number(chatId),
        message_id: messageId,
        text: `\u2705 *Album valid\u00e9 !* (${photos.length} photos)\n\n\ud83d\ude80 Lancement de l'analyse IA...`,
        parse_mode: 'Markdown'
      });
    } catch (e) { /* ignore edit errors */ }
  }

  // Return data for DownloadAllPhotos (same format as StartProcessing)
  const propKey = `prop_${chatId}`;
  const propertyType = staticData[propKey] || 'apartment';

  return [{ json: {
    chatId,
    photos,
    style: styleData.style,
    styleLabel: styleData.label || 'Moderne',
    totalPhotos: photos.length,
    propertyType,
    propertyInfo: staticData[`propertyInfo_${chatId}`] || null,
    fromAlbumButton: true
  } }];
}

// Parse callback data: sel_{chatId}_{roomIndex}_{choice}
const parts = cbData.split('_');
if (parts[0] !== 'sel' || parts.length !== 4) {
  return [];
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
  return [];
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

  // Generate 5 Flux options with retry (1 retry per option on failure)
  const options = [];
  for (let i = 0; i < 5; i++) {
    try {
      const url = await runPrediction(
        'https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions',
        {
          prompt: prompts[i] + ' Photorealistic, exact room proportions, no distortion, camera locked.',
          input_image: roomData.photoUrl,
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
    return [];
  }

  room.regenerationCount++;
  await generateRoomOptions(room, roomIdx);
  return [];

} else {
  // === SELECTION (choice = "1"-"5") ===
  const choiceIdx = parseInt(choice) - 1;
  if (choiceIdx < 0 || choiceIdx >= room.options.length) {
    return [];
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
    return [];

  } else {
    // ============================================================
    // ALL ROOMS SELECTED — LAUNCH VIDEO PIPELINE
    // ============================================================
    session.phase = 'videos';

    await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: Number(chatId),
      text: `🎥 *Génération des vidéos individuelles en cours...*\n\nVidéo 1/${session.totalRooms} — ${session.rooms[0].roomLabel} ⏳`,
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

    // === Kling v2.1 Pro + individual video upload for each room ===
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
        videoUrl = await runPrediction(
          'https://api.replicate.com/v1/models/kwaivgi/kling-v2.1/predictions',
          {
            prompt: `Morph from original empty room to furnished room. KEEP EXACT same room structure, walls, floor, windows, camera angle, perspective, and proportions throughout the entire video. Subtle dolly zoom only, no perspective change. ${session.style} ${r.roomType || room.roomType}, photorealistic professional real estate video, smooth furniture appearance, steady camera, natural lighting.`,
            start_image: r.photoUrl,
            end_image: r.selectedUrl,
            mode: 'pro',
            duration: 5,
            negative_prompt: 'blurry, distorted, low quality, warped walls, warped windows, changed proportions, furniture movement, structural changes, perspective shift, room deformation'
          },
          repHeaders,
          { maxRetries: 1, pollInterval: 10000, maxPolls: 120 }
        ) || '';
      } catch (e) { videoUrl = ''; }

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
          // Fallback: send video URL directly
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

      if (!videoUrl) videoUrl = r.selectedUrl; // fallback to static image

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

    // === Remotion render: VIDÉO FINALE MONTÉE ===
    session.phase = 'rendering';

    await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: Number(chatId),
      text: `✨ *Toutes les vidéos individuelles envoyées !*\n\nCompilation de la vidéo finale montée en cours... ⏳`,
      parse_mode: 'Markdown'
    });

    const durationPerRoom = 7;  // 1s orig + 1s swipe + 4s Kling + 1s fixe
    const totalDuration = Math.min(180, 5 + session.totalRooms * durationPerRoom + 5);

    // === Build property title/address/price from user-provided info ===
    let propTitle = 'Visite Virtuelle';
    let propAddress = undefined;
    let propPrice = undefined;

    if (session.propertyInfo) {
      const infoParts = session.propertyInfo.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
      var pricePart = '', cityPart = '', neighborhoodPart = '';
      for (var pi = 0; pi < infoParts.length; pi++) {
        var part = infoParts[pi];
        if (/\d/.test(part) && (/[\u20ac$\u00a3]/.test(part) || /\d{3}/.test(part.replace(/\s/g, '')))) {
          pricePart = part;
        } else if (!cityPart) {
          cityPart = part;
        } else {
          neighborhoodPart = part;
        }
      }
      var propLabelsMap = { apartment: 'Appartement', house: 'Maison', commercial: 'Local commercial' };
      var propLabel = propLabelsMap[session.propertyType] || 'Bien';
      propTitle = cityPart ? (propLabel + ' \u00e0 ' + cityPart) : (propLabel + ' \u2014 Visite Virtuelle');
      var addrParts = [];
      if (neighborhoodPart) addrParts.push(neighborhoodPart);
      if (pricePart) addrParts.push(pricePart);
      propAddress = addrParts.length > 0 ? addrParts.join(' \u2022 ') : undefined;
      propPrice = pricePart || undefined;
    }

    const remotionPayload = {
      compositionId: 'PropertyShowcase',
      inputProps: {
        property: { title: propTitle, address: propAddress, price: propPrice, style: session.style },
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

    // Poll render status (server uses 'done'/'error')
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

    // Download via /renders/:id/download endpoint and upload to Telegram
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

    // Clean up session
    delete staticData[sessionKey];

    return [{ json: { ok: true, action: 'complete', renderId, totalDuration, videoCount: session.totalRooms } }];
  }
}
