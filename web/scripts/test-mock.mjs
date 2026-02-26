#!/usr/bin/env node
/**
 * Mock production test — creates a project with mock prediction IDs
 * and triggers the Inngest pipeline. No Replicate API calls.
 * Requires USE_MOCK_AI=true on Vercel.
 * Usage: node scripts/test-mock.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.prod");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?$/);
  if (match) process.env[match[1]] = match[2];
}

// ── Config ──
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const INNGEST_EVENT_KEY = process.env.INNGEST_EVENT_KEY;
const ADMIN_USER_ID = "ngZ5Zj4C1yo5";

if (!INNGEST_EVENT_KEY) {
  console.error("ERROR: INNGEST_EVENT_KEY is empty. Check .env.prod");
  process.exit(1);
}

const PHOTO_BASE = `${SB_URL}/storage/v1/object/public/photos/test`;
const PHOTOS = [
  { id: `photo-${randomBytes(4).toString("hex")}`, originalUrl: `${PHOTO_BASE}/original-1.jpg` },
  { id: `photo-${randomBytes(4).toString("hex")}`, originalUrl: `${PHOTO_BASE}/original-2.jpg` },
];

const PROJECT_ID = `mock-${randomBytes(4).toString("hex")}`;

console.log(`\n  VIMIMO Mock Test (no Replicate costs)`);
console.log(`   Project ID: ${PROJECT_ID}`);
console.log(`   Photos: ${PHOTOS.length}`);
console.log(`   Mode: video_visite`);
console.log(`   Style: scandinavian\n`);

const db = createClient(SB_URL, SB_KEY);

// ── Step 1: Create mock prediction IDs (no Replicate call) ──
console.log("1/4  Creating mock prediction IDs...");
const ts = Date.now();
const photosWithPredictions = PHOTOS.map((photo, i) => {
  const predId = `mock-clean-${ts}-${i}`;
  console.log(`   OK ${photo.id} -> mock prediction ${predId}`);
  return { ...photo, cleanPredictionId: predId };
});

// ── Step 2: Save prediction map ──
console.log("\n2/4  Saving prediction map...");
for (const photo of photosWithPredictions) {
  const { error } = await db.from("prediction_map").upsert({
    prediction_id: photo.cleanPredictionId,
    project_id: PROJECT_ID,
    prediction_type: "clean",
  });
  if (error) console.error(`   FAIL map: ${error.message}`);
  else console.log(`   OK ${photo.cleanPredictionId} -> ${PROJECT_ID}`);
}

// ── Step 3: Save project ──
console.log("\n3/4  Saving project...");
const projectData = {
  id: PROJECT_ID,
  phase: "cleaning",
  createdAt: Date.now(),
  style: "scandinavian",
  styleLabel: "Scandinave",
  photos: photosWithPredictions,
  rooms: [],
  userId: ADMIN_USER_ID,
  creditsUsed: 1,
  creditsRefunded: false,
  mode: "video_visite",
  propertyInfo: {
    title: "Appartement Test Mock",
    city: "Paris",
    neighborhood: "Marais",
    surface: "75m2",
    rooms: "3",
    price: "650 000 EUR",
    highlights: ["Parquet ancien", "Moulures", "Lumineux"],
  },
  montageConfig: {
    propertyInfo: {
      title: "Appartement Test Mock",
      city: "Paris",
      neighborhood: "Marais",
      surface: "75m2",
      rooms: "3",
      price: "650 000 EUR",
      highlights: ["Parquet ancien", "Moulures", "Lumineux"],
    },
    music: "elegant",
  },
};

const { error: saveErr } = await db.from("projects").upsert({
  id: PROJECT_ID,
  user_id: ADMIN_USER_ID,
  data: projectData,
  created_at: new Date().toISOString(),
});
if (saveErr) {
  console.error(`   FAIL project save: ${saveErr.message}`);
  process.exit(1);
}
console.log(`   OK Project saved: ${PROJECT_ID}`);

// ── Step 4: Send Inngest event ──
console.log("\n4/4  Triggering Inngest pipeline (project/created)...");
const inngestResp = await fetch("https://inn.gs/e/" + INNGEST_EVENT_KEY, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "project/created",
    data: { projectId: PROJECT_ID },
  }),
});

if (inngestResp.ok) {
  console.log("   OK Inngest event sent: project/created");
} else {
  const text = await inngestResp.text();
  console.error(`   FAIL Inngest (${inngestResp.status}): ${text}`);
  process.exit(1);
}

console.log(`\n  Test lancé ! Pipeline en cours.`);
console.log(`   Suivre: python3 /tmp/check-project.py ${PROJECT_ID}`);
console.log(`   Inngest: https://app.inngest.com\n`);
