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

const staticData = $getWorkflowStaticData('global');
const msg = $input.first().json.message;
const chatId = String(msg.chat.id);

const botToken = process.env.TELEGRAM_BOT_TOKEN || '8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU';

async function sendTelegramError(text) {
  await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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

// Clean ANY existing session for this user (/go = explicit restart intent)
// Covers ghost sessions stuck in 'videos', 'rendering', or stale 'selecting'
const sessionKey = `session_${chatId}`;
if (staticData[sessionKey]) {
  const phase = staticData[sessionKey].phase;
  const sessionAge = now - (staticData[sessionKey].updatedAt || staticData[sessionKey].createdAt || 0);
  if (phase === 'selecting' && sessionAge < fifteenMin) {
    // Only block if actively selecting AND recent — user may have clicked /go by mistake
    await sendTelegramError('⚠️ Vous avez déjà un staging en cours !\n\nTerminez vos sélections ou attendez quelques minutes avant de relancer /go.');
    return [];
  }
  // Any other phase (videos, rendering) or stale selecting → force cleanup
  delete staticData[sessionKey];
  if (sessionAge < fifteenMin) {
    await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId, text: '🔄 Session précédente nettoyée, relancement...', parse_mode: 'Markdown'
    });
  }
}

// Clear transient keys (autoStart flags, album ack dedup markers)
delete staticData[`autoStart_${chatId}`];
Object.keys(staticData).filter(k => k.startsWith(`mg_${chatId}_`)).forEach(k => delete staticData[k]);

const photoPrefix = `photo_${chatId}_`;
const photoKeys = Object.keys(staticData).filter(k => k.startsWith(photoPrefix));
// Filter out old photos (>30min) whose file_ids may have expired
const thirtyMin = 30 * 60 * 1000;
const allPhotos = photoKeys.map(k => staticData[k]);
const photos = allPhotos.filter(p => (now - p.timestamp) < thirtyMin).sort((a, b) => a.timestamp - b.timestamp);
// Clean up expired photo keys
allPhotos.filter(p => (now - p.timestamp) >= thirtyMin).forEach(p => {
  const k = `photo_${chatId}_${p.fileId}`;
  delete staticData[k];
});

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

const propKey = `prop_${chatId}`;
const propertyType = staticData[propKey] || 'apartment';
const propertyInfo = staticData[`propertyInfo_${chatId}`] || null;

const result = {
  chatId, photos,
  style: styleData.style,
  styleLabel: styleData.label || 'Moderne',
  totalPhotos: photos.length,
  propertyType,
  propertyInfo
};

// Don't clean up keys here — InitializeSession will do it
return [{ json: result }];
