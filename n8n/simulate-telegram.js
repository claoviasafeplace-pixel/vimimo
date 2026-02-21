#!/usr/bin/env node
/**
 * Simulate Telegram webhook payloads for TDD testing
 * Usage: node simulate-telegram.js [command]
 * Commands: photo, style, go, callback_prop, callback_style
 */

const https = require('https');
const { URL } = require('url');

const WEBHOOK_URL = 'https://n8n.srv1129073.hstgr.cloud/webhook/ZlSOfh3wPav4DGPE/telegrambot/webhook';
const CHAT_ID = 559474177;
const BOT_ID = 8120972729;

function sendWebhook(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const u = new URL(WEBHOOK_URL);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const command = process.argv[2] || 'go';
let updateId = Math.floor(Math.random() * 100000000);

const payloads = {
  // Simulate /go command
  go: {
    update_id: updateId,
    message: {
      message_id: 1000 + Math.floor(Math.random() * 1000),
      from: { id: CHAT_ID, is_bot: false, first_name: "VVS", username: "madein4501", language_code: "fr" },
      chat: { id: CHAT_ID, first_name: "VVS", username: "madein4501", type: "private" },
      date: Math.floor(Date.now() / 1000),
      text: "/go",
      entities: [{ offset: 0, length: 3, type: "bot_command" }]
    }
  },
  // Simulate a photo (album)
  photo: {
    update_id: updateId,
    message: {
      message_id: 2000 + Math.floor(Math.random() * 1000),
      from: { id: CHAT_ID, is_bot: false, first_name: "VVS" },
      chat: { id: CHAT_ID, first_name: "VVS", type: "private" },
      date: Math.floor(Date.now() / 1000),
      photo: [
        { file_id: "small_fake_id_" + Date.now(), file_unique_id: "u1", file_size: 1000, width: 90, height: 90 },
        { file_id: "medium_fake_id_" + Date.now(), file_unique_id: "u2", file_size: 5000, width: 320, height: 320 },
        { file_id: "large_fake_id_" + Date.now(), file_unique_id: "u3", file_size: 50000, width: 800, height: 800 }
      ],
      media_group_id: "test_album_" + Date.now()
    }
  },
  // Simulate callback: prop_apartment
  callback_prop: {
    update_id: updateId,
    callback_query: {
      id: "cb_prop_" + Date.now(),
      from: { id: CHAT_ID, is_bot: false, first_name: "VVS" },
      message: {
        message_id: 900,
        from: { id: BOT_ID, is_bot: true, first_name: "VIMIMO" },
        chat: { id: CHAT_ID, first_name: "VVS", type: "private" },
        date: Math.floor(Date.now() / 1000),
        text: "Album détecté !"
      },
      chat_instance: "1234567890",
      data: "prop_apartment"
    }
  },
  // Simulate callback: style_559474177_modern_minimalist
  callback_style: {
    update_id: updateId,
    callback_query: {
      id: "cb_style_" + Date.now(),
      from: { id: CHAT_ID, is_bot: false, first_name: "VVS" },
      message: {
        message_id: 901,
        from: { id: BOT_ID, is_bot: true, first_name: "VIMIMO" },
        chat: { id: CHAT_ID, first_name: "VVS", type: "private" },
        date: Math.floor(Date.now() / 1000),
        text: "Choisissez votre style"
      },
      chat_instance: "1234567890",
      data: `style_${CHAT_ID}_modern_minimalist`
    }
  }
};

if (!payloads[command]) {
  console.error(`Unknown command: ${command}. Use: ${Object.keys(payloads).join(', ')}`);
  process.exit(1);
}

(async () => {
  console.log(`\n🚀 Sending: ${command}`);
  console.log(`   Payload: ${JSON.stringify(payloads[command]).substring(0, 200)}...`);
  const result = await sendWebhook(payloads[command]);
  console.log(`   Response: ${result.status} ${result.body}`);
})();
