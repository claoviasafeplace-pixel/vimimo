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

echo "6. Setting Telegram webhook max_connections=1..."
BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-8120972729:AAFlDrC7dfgnTAqAjlc4pUsadqxjhc5IYOU}"
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

# Cleanup
rm -f /tmp/vimimo-deploy-body.json /tmp/vimimo-deactivate.json /tmp/vimimo-update-result.json /tmp/vimimo-activate.json /tmp/vimimo-webhook.json
