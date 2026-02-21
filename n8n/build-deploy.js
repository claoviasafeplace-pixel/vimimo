#!/usr/bin/env node
/**
 * Convert workflow-v2.json (readable IDs) to workflow-v2-deploy.json (UUID IDs)
 * for n8n API deployment.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const inputPath = path.join(__dirname, 'workflow-v2.json');
const outputPath = path.join(__dirname, 'workflow-v2-deploy.json');

const workflow = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

// Generate deterministic UUIDs from node names (so they're stable across builds)
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

// Build name -> UUID mapping
const idMap = {};
for (const node of workflow.nodes) {
  const uuid = nameToUUID(node.name);
  idMap[node.id] = uuid;
  node.id = uuid;
}

// Update connections (connection references use node names, not IDs, so they're fine)
// n8n connections reference by node name, not by ID

// Write deploy version
fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2), 'utf-8');
console.log(`Deploy workflow written to ${outputPath}`);
console.log('Node ID mapping:');
for (const [oldId, newId] of Object.entries(idMap)) {
  console.log(`  ${oldId} -> ${newId}`);
}
