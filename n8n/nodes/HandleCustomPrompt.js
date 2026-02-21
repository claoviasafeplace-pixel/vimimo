// HandleCustomPrompt — Retouche Magique
// Free text during selecting phase → custom Flux Kontext Pro option
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

const staticData = $getWorkflowStaticData('global');
const msg = $input.first().json.message;
const chatId = String(msg.chat.id);
const text = (msg.text || '').trim();

const botToken = process.env.TELEGRAM_BOT_TOKEN || '8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU';
const replicateToken = process.env.REPLICATE_API_TOKEN || 'REPLICATE_TOKEN_REDACTED';
const repHeaders = { 'Authorization': `Bearer ${replicateToken}` };

// === PROPERTY INFO CAPTURE: user is typing price/city/neighborhood ===
const awaitingKey = `awaiting_info_${chatId}`;
if (staticData[awaitingKey]) {
  delete staticData[awaitingKey];
  staticData[`propertyInfo_${chatId}`] = text;

  await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: Number(chatId),
    text: `\u2705 *Informations enregistr\u00e9es :*\n\n\ud83d\udccd ${text}`,
    parse_mode: 'Markdown'
  });

  // Auto-start check: if album + style + photos + no session → launch pipeline
  const mgPrefix = `mg_${chatId}_`;
  const hasAlbum = Object.keys(staticData).some(k => k.startsWith(mgPrefix));

  if (hasAlbum) {
    const photoPrefix = `photo_${chatId}_`;
    const photoKeys = Object.keys(staticData).filter(k => k.startsWith(photoPrefix));
    const photos = photoKeys.map(k => staticData[k]).sort((a, b) => a.timestamp - b.timestamp);
    const styleData = staticData[`style_${chatId}`];
    const sessKey = `session_${chatId}`;

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
        propertyInfo: text,
        totalPhotos: photos.length,
        fromAlbum: true
      } }];
    }
  }

  // No auto-start — prompt for photos
  await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: Number(chatId),
    text: '\ud83d\udcf7 Envoyez vos photos puis tapez /go pour lancer le staging.'
  });

  return [];
}

// Check for active session in selecting phase
const sessionKey = `session_${chatId}`;
const session = staticData[sessionKey];

if (!session || session.phase !== 'selecting') {
  // No active session — send default help message
  await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: Number(chatId),
    text: '\ud83d\udc4b Je n\'ai pas compris votre message.\n\nVoici ce que je peux faire :\n\ud83d\udcf8 Envoyez-moi *plusieurs photos* de pi\u00e8ces vides.\n\ud83c\udfa8 Choisissez un style de d\u00e9coration.\n/go \u2014 Lancer le staging\n/start \u2014 Relancer l\'assistant\n/styles \u2014 Voir les styles disponibles\n/aide \u2014 Conseils pour photographier',
    parse_mode: 'Markdown'
  });
  return [];
}

// Active session in selecting phase — Retouche Magique
const room = session.rooms[session.currentRoomIndex];

if (!room || room.options.length === 0) {
  await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: Number(chatId),
    text: '\u23f3 Les options ne sont pas encore g\u00e9n\u00e9r\u00e9es. Patientez...'
  });
  return [];
}

if (room.options.length >= 8) {
  await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: Number(chatId),
    text: '\u26a0\ufe0f Maximum 8 options par pi\u00e8ce atteint.\nChoisissez parmi les options existantes.'
  });
  return [];
}

// Build Flux prompt: session style + user text + anti-distortion
const prompt = `Edit this exact photo, keep camera angle, perspective, and room structure 100% identical. ${text}. Style: ${session.styleLabel}. Keep all walls, floor, windows, doors, ceiling unchanged. Photorealistic, exact room proportions, no distortion, camera locked.`;

await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
  chat_id: Number(chatId),
  text: `\u2728 *Retouche Magique en cours...*\n\n"${text}"`,
  parse_mode: 'Markdown'
});

try {
  const url = await runPrediction(
    'https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions',
    {
      prompt,
      input_image: room.photoUrl,
      aspect_ratio: 'match_input_image',
      output_format: 'jpg',
      safety_tolerance: 2,
      seed: Math.floor(Math.random() * 999999)
    },
    repHeaders,
    { maxRetries: 1, pollInterval: 5000, maxPolls: 60 }
  );

  if (!url) {
    await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: Number(chatId),
      text: '\u26a0\ufe0f \u00c9chec de la retouche. Essayez une autre description.'
    });
    return [];
  }

  // Add to room options
  room.options.push(url);
  const optionNum = room.options.length;
  session.updatedAt = Date.now();

  // Send the new photo
  await post(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    chat_id: Number(chatId),
    photo: url,
    caption: `\u2728 Retouche Custom \u2014 Option ${optionNum}/${room.options.length}`
  });

  // Send updated keyboard with ALL options
  const rIdx = session.currentRoomIndex;
  const keyboard = {
    inline_keyboard: [
      room.options.map((_, i) => ({ text: `${i + 1}`, callback_data: `sel_${chatId}_${rIdx}_${i + 1}` })),
      [{ text: '\ud83d\udd04 Nouvelles options', callback_data: `sel_${chatId}_${rIdx}_regen` }]
    ]
  };

  const kbResp = await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: Number(chatId),
    text: `\ud83c\udfa8 *Pi\u00e8ce ${rIdx + 1}/${session.totalRooms} : ${room.roomLabel}*\n\nChoisissez votre staging pr\u00e9f\u00e9r\u00e9 :\n\n\ud83d\udcac _Envoyez un texte pour une retouche personnalis\u00e9e._`,
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });

  if (kbResp.data && kbResp.data.ok && kbResp.data.result) {
    room.galleryMessageId = kbResp.data.result.message_id;
  }

} catch (e) {
  await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: Number(chatId),
    text: '\u26a0\ufe0f Erreur lors de la retouche. R\u00e9essayez.'
  });
}

return [];
