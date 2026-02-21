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

// === RETRY WITH EXPONENTIAL BACKOFF ===
// Retries on network errors, timeouts, HTTP 429/5xx
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
// Creates prediction, polls until done, retries the whole cycle on failure
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

    // Poll with resilience to individual poll failures
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
        if (pollErrors >= 3) throw e; // 3 consecutive poll failures = abort
      }
    }

    if (predData && predData.status === 'succeeded' && predData.output) {
      return Array.isArray(predData.output) ? predData.output[0] : predData.output;
    }

    // Prediction failed/canceled — retry if attempts remain
    if (attempt < maxRetries) continue;
  }
  return null;
}

const data = $input.first().json;
const botToken = process.env.TELEGRAM_BOT_TOKEN || '8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU';
const replicateToken = process.env.REPLICATE_API_TOKEN || 'REPLICATE_TOKEN_REDACTED';
const repHeaders = { 'Authorization': `Bearer ${replicateToken}` };
const chatId = data.chatId;

const CLEAN_PROMPT = 'Edit this exact photo, keep camera angle, perspective, and structure 100% identical: Remove ALL movable furniture, beds, sofas, tables, chairs, boxes, clothes, clutter, and decorations. Keep ONLY the bare room structure: walls, floor texture and material unchanged, ceiling, windows, doors, radiators, electrical outlets, light switches, ceiling lights, built-in closets, and all fixed architectural elements. The room must appear completely empty but structurally identical. Photorealistic, exact room proportions, exact floor material, no distortion, camera locked.';

const cleanedUrls = [];

for (var idx = 0; idx < data.photoUrls.length; idx++) {
  const photo = data.photoUrls[idx];

  try {
    const cleanUrl = await runPrediction(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions',
      {
        prompt: CLEAN_PROMPT,
        input_image: photo.url,
        aspect_ratio: 'match_input_image',
        output_format: 'jpg',
        safety_tolerance: 2
      },
      repHeaders,
      { maxRetries: 2, pollInterval: 5000, maxPolls: 60 }
    );

    if (cleanUrl) {
      cleanedUrls.push({ ...photo, url: cleanUrl, originalUrl: photo.url });
      continue;
    }
  } catch (e) { /* final fallback to original */ }

  // Fallback: keep original + notify user
  cleanedUrls.push(photo);
  if (botToken && chatId) {
    try {
      await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: Number(chatId),
        text: `\u26a0\ufe0f Nettoyage photo ${idx + 1}/${data.photoUrls.length} \u00e9chou\u00e9 apr\u00e8s 3 tentatives \u2014 utilisation de l'original.`
      });
    } catch (_) {}
  }
}

return [{ json: { ...data, photoUrls: cleanedUrls } }];
