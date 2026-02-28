#!/usr/bin/env node
/**
 * VIMIMO Quality Audit Script
 *
 * Tests the full staging pipeline on real photos and measures quality.
 *
 * Usage:
 *   node scripts/quality-audit.mjs <photo_url_1> [photo_url_2] ... [--style scandinavian|industrial|modern_minimalist|classic_french|bohemian]
 *
 * Or with a local file:
 *   node scripts/quality-audit.mjs ./test-photos/salon.jpg ./test-photos/chambre.jpg --style modern_minimalist
 *
 * What it does:
 *   1. Sends each photo to Flux Kontext Pro for furniture removal (cleaning)
 *   2. Sends cleaned photo to GPT-4o Vision for room analysis
 *   3. Generates N staging prompts via GPT-4o
 *   4. Sends each prompt to Flux Kontext Pro for staging
 *   5. Saves all results to ./audit-results/<timestamp>/
 *   6. Prints a quality report with costs
 *
 * Requires env vars: REPLICATE_API_TOKEN, OPENAI_API_KEY
 */

import { readFileSync } from "fs";
import Replicate from "replicate";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

// Load .env.local manually (no dotenv dependency)
try {
  const envFile = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of envFile.split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
} catch { /* .env.local not found, rely on existing env */ }

// ── Config ──
const STYLE = process.argv.find((a) => a.startsWith("--style="))?.split("=")[1]
  || (process.argv.includes("--style") ? process.argv[process.argv.indexOf("--style") + 1] : null)
  || "modern_minimalist";

const VARIANTS = parseInt(process.argv.find((a) => a.startsWith("--variants="))?.split("=")[1]
  || (process.argv.includes("--variants") ? process.argv[process.argv.indexOf("--variants") + 1] : null)
  || "3", 10);

// Filter out flags and their values from photo args
const flagsWithValues = new Set(["--style", "--variants"]);
const photoArgs = [];
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--")) {
    if (flagsWithValues.has(args[i]) && i + 1 < args.length) i++; // skip value
    continue;
  }
  photoArgs.push(args[i]);
}

if (photoArgs.length === 0) {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  VIMIMO Quality Audit                                        ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Usage:                                                      ║
║    node scripts/quality-audit.mjs <url_or_path> [...]       ║
║                                                              ║
║  Options:                                                    ║
║    --style <name>      Staging style (default: modern_mini)  ║
║    --variants <N>      Number of staging variants (default: 3)║
║                                                              ║
║  Examples:                                                   ║
║    node scripts/quality-audit.mjs \\                         ║
║      https://example.com/salon.jpg \\                        ║
║      https://example.com/chambre.jpg \\                      ║
║      --style scandinavian --variants 3                       ║
║                                                              ║
║  Requires: REPLICATE_API_TOKEN, OPENAI_API_KEY               ║
╚══════════════════════════════════════════════════════════════╝
`);
  process.exit(0);
}

// ── Clients ──
const replicate = new Replicate();
const openai = new OpenAI();

// ── Output directory ──
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = path.resolve(`audit-results/${timestamp}`);
fs.mkdirSync(outDir, { recursive: true });

// ── Cost tracking ──
const costs = {
  "flux-kontext-pro": { count: 0, unitCost: 0.05 },
  "gpt-4o-vision": { count: 0, unitCost: 0.03 },
  "gpt-4o-text": { count: 0, unitCost: 0.01 },
};

function trackCost(service) {
  if (costs[service]) costs[service].count++;
}

function totalCost() {
  return Object.values(costs).reduce((sum, s) => sum + s.count * s.unitCost, 0);
}

// ── Helpers ──
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);
    proto.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(dest); });
    }).on("error", reject);
  });
}

async function waitForPrediction(predId, label, maxWait = 300) {
  const start = Date.now();
  process.stdout.write(`  ⏳ ${label} [${predId.slice(0, 8)}]...`);
  while (true) {
    const pred = await replicate.predictions.get(predId);
    if (pred.status === "succeeded") {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      const output = Array.isArray(pred.output) ? pred.output[0] : pred.output;
      process.stdout.write(` ✅ (${elapsed}s)\n`);
      return output;
    }
    if (pred.status === "failed" || pred.status === "canceled") {
      process.stdout.write(` ❌ ${pred.status}: ${pred.error || "unknown"}\n`);
      return null;
    }
    const elapsed = (Date.now() - start) / 1000;
    if (elapsed > maxWait) {
      process.stdout.write(` ⏰ timeout after ${maxWait}s\n`);
      return null;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

function parseJson(raw) {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return JSON.parse(cleaned);
}

// ── Pipeline functions ──

async function cleanPhoto(photoUrl) {
  trackCost("flux-kontext-pro");
  const prediction = await replicate.predictions.create({
    model: "black-forest-labs/flux-kontext-pro",
    input: {
      prompt: "Empty room, architectural photography. Completely remove ALL movable furniture, objects, clutter, vehicles, bicycles, boxes, clothes, tools, toys, and decorations. Reconstruct the empty walls and floors perfectly where objects were removed — inpaint clean wall texture and floor material seamlessly. Keep ONLY the fixed architectural elements: doors, windows, built-in kitchen cabinets, kitchen islands, countertops, sinks, built-in appliances, structural pillars, radiators, electrical outlets, light switches, ceiling lights, and built-in closets. The result must be a clean, bare, and spacious interior with zero movable objects remaining. Photorealistic, exact room proportions, no distortion, camera locked. Ultra-photorealistic, shot on Canon EOS R5, exact room geometry preserved, all architectural elements pixel-perfect, consistent lighting and shadows, 8K resolution, no artifacts.",
      input_image: photoUrl,
      aspect_ratio: "match_input_image",
      output_format: "jpg",
      safety_tolerance: 2,
    },
  });
  return prediction.id;
}

async function analyzeRoom(photoUrl, style) {
  trackCost("gpt-4o-vision");
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    max_tokens: 2000,
    messages: [
      {
        role: "system",
        content: `Tu es un expert en analyse immobilière. Analyse cette photo de pièce.

RÈGLE CRITIQUE D'IDENTIFICATION :
- Si tu vois un LIT, SOMMIER, MATELAS, DRAPS → c'est une CHAMBRE (bedroom), JAMAIS un salon
- Si tu vois un CANAPÉ, FAUTEUIL, TABLE BASSE, TV → c'est un SALON (living_room)
- Si tu vois un ÉVIER, FOUR, PLAQUES, FRIGO → c'est une CUISINE (kitchen)
- Si tu vois DOUCHE, BAIGNOIRE, LAVABO → c'est une SALLE DE BAIN (bathroom)
- Si tu vois un BUREAU, ORDINATEUR → c'est un BUREAU (office)
- En cas de doute : une petite pièce ~10-15m² avec 1 fenêtre = probablement chambre. Un grand espace ouvert 25m²+ = salon.

Réponds en JSON valide :
{
  "roomType": "living_room"|"bedroom"|"kitchen"|"bathroom"|"dining_room"|"office"|"studio"|"hallway"|"balcony",
  "roomLabel": "Salon principal",
  "dimensions": { "estimatedArea": "25m²", "ceilingHeight": "2.5m", "shape": "rectangular" },
  "existingMaterials": { "flooring": "parquet", "walls": "white painted", "ceiling": "flat white" },
  "lighting": { "naturalLight": "good", "windowCount": 2, "lightDirection": "south" },
  "cameraAngle": { "perspective": "corner wide", "height": "eye level", "orientation": "landscape" },
  "notes": "specific observations — mention ANY remaining furniture clues (bed frame, sofa, appliances)",
  "glazing": ["list ALL large glass surfaces: sliding glass doors, bay windows, French doors, floor-to-ceiling windows, glass walls — with their POSITION in the frame (left wall, back wall, right side)"]
}
Reply ONLY valid JSON.`,
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Analyse cette pièce. Style cible : ${style}.` },
          { type: "image_url", image_url: { url: photoUrl } },
        ],
      },
    ],
  });
  const raw = response.choices[0].message.content?.trim() || "";
  return parseJson(raw);
}

async function generatePrompts(photoUrl, roomData, style) {
  trackCost("gpt-4o-vision");

  const STYLE_LABELS = {
    scandinavian: "Scandinave",
    industrial: "Industriel",
    modern_minimalist: "Moderne Minimaliste",
    classic_french: "Classique Français",
    bohemian: "Bohème",
  };

  const isBedroomType = ["bedroom", "studio"].includes(roomData.roomType);
  const estimatedArea = roomData.dimensions?.estimatedArea || "unknown";

  const isLargeRoom = parseInt(estimatedArea) > 25;

  const largeRoomExample = `EXAMPLE for LARGE ROOM (background items FIRST — 180-250 words):
"Edit this exact photo, keep camera angle, perspective, and room structure 100% identical. In the far back of the room against the distant wall, place a round reclaimed oak dining table with four mismatched vintage wooden chairs, styled with a linen runner, a ceramic vase holding dried wildflowers, a brass candlestick with a cream taper candle, and a small terracotta bowl of lemons. Hang a woven seagrass pendant light above the dining table. Add a tall walnut bookshelf filled with books and decorative objects beside the dining area, with a trailing pothos on the top shelf. Place a large fiddle leaf fig in a woven basket next to the bookshelf. In the foreground, add a deep-seated olive velvet L-shaped sectional along the left wall with five cushions in mixed patterns of rust, cream, and indigo. Place a round black marble coffee table with brass legs in front of the sofa, styled with three stacked art books, a brass tray with candles, and a small ceramic planter. Add a rattan armchair with a cream cushion to the right, angled inward. Lay a large 300x400cm vintage Persian rug in faded rose and navy anchoring the front seating area. Place a sculptural brass arc floor lamp behind the sofa. Drape a chunky terracotta knit throw over one arm of the sectional, and add sheer white linen curtains pulled open to the sides of the windows. All windows, sliding glass doors, and glass surfaces remain completely visible and unobstructed. Keep all walls, floor, windows, doors, ceiling, radiators, outlets, and light switches exactly unchanged. Photorealistic interior photography, exact room proportions, no distortion, no lens warping, camera locked."`;

  const fewShot = isLargeRoom
    ? largeRoomExample
    : isBedroomType
    ? `EXAMPLE (match this density — 120-180 words between start/end):
"Edit this exact photo, keep camera angle, perspective, and room structure 100% identical. Add a king-size bed with an upholstered oatmeal Belgian linen headboard centered on the back wall, layered with a white stonewashed linen duvet, a folded camel cashmere throw at the foot, and four textured cushions — two in ivory boucle and two in burnt sienna velvet. Place matching solid oak nightstands on each side, each with a ceramic table lamp with a warm linen drum shade, a small potted succulent in a ribbed terracotta pot, a hardcover book, and a ceramic trinket dish. Hang a large 100x80cm abstract warm-toned oil painting in a thin black metal frame above the headboard. Lay a plush 200x300cm cream wool rug under the bed extending past the nightstands. Place a woven rattan bench at the foot of the bed with a folded herringbone wool blanket. Add a tall fiddle leaf fig in a woven seagrass basket in the corner by the window, and sheer ivory linen curtains framing the window, softly pooling on the floor. Keep all walls, floor, windows, doors, ceiling, radiators, outlets, and light switches exactly unchanged. Photorealistic interior photography, exact room proportions, no distortion, no lens warping, camera locked."`
    : `EXAMPLE (match this density — 120-180 words between start/end):
"Edit this exact photo, keep camera angle, perspective, and room structure 100% identical. Add a deep-seated emerald velvet three-seater sofa with brushed brass legs along the back wall, with four cushions — two in ivory linen and two in mustard velvet. Place a round white Carrara marble coffee table with a matte brass base in front of the sofa, styled with three stacked Assouline coffee-table books, a brass candle holder with a cream pillar candle, and a small ceramic vase with dried pampas grass. Add a cream boucle accent armchair with walnut legs to the right of the sofa, angled inward. Lay a large 250x350cm hand-knotted vintage Persian rug in faded rose and indigo anchoring the entire seating area. Place a sculptural brass arc floor lamp with a white linen drum shade behind the left side of the sofa, and a ceramic table lamp with a fluted base on a slim walnut side table next to the armchair. Hang a gallery wall of three framed black-and-white photography prints in thin oak frames above the sofa. Add a large fiddle leaf fig in a woven seagrass basket in the corner by the window, and a trailing pothos on a floating shelf if wall space allows. Drape a chunky cream knit throw over one arm of the sofa, and hang sage green linen curtains softly pooling on the floor by the windows. Keep all walls, floor, windows, doors, ceiling, radiators, outlets, and light switches exactly unchanged. Photorealistic interior photography, exact room proportions, no distortion, no lens warping, camera locked."`;

  const wordRange = isLargeRoom ? "180-250" : "120-180";
  const itemCount = isLargeRoom ? "15+" : "10+";

  const depthRule = isLargeRoom
    ? `2. Room is ~${estimatedArea} — LARGE ROOM. Create 2 ZONES at DIFFERENT DEPTHS:\n   - ZONE B (BACK): dining/reading/console area placed "in the far back", "against the distant wall", "behind the pillars". LIST THESE FIRST.\n   - ZONE A (FRONT): sofa group in foreground. LIST AFTER Zone B.\n   - Each zone needs its OWN rug, light source, and plant.`
    : `2. Room is ~${estimatedArea} — fill 60% of visible floor`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.5,
    max_tokens: 4000,
    messages: [
      {
        role: "system",
        content: `You write image-editing prompts for Flux Kontext Pro to stage empty rooms. Each prompt must be a SINGLE DENSE PARAGRAPH listing ONLY objects to add. Word count: 120-180 words for small/medium rooms, 180-250 words for large rooms (25m²+).

FORMAT: "Edit this exact photo, keep camera angle, perspective, and room structure 100% identical. [items]. Keep all walls, floor, windows, doors, ceiling, radiators, outlets, and light switches exactly unchanged. Photorealistic interior photography, exact room proportions, no distortion, no lens warping, camera locked."

MANDATORY: every prompt must list ${itemCount} items. Every item = material + color + texture + position. Every surface must have 3-4 objects ON it.

LARGE ROOM DEPTH RULE (25m²+ ONLY):
The #1 failure is putting ALL furniture in the foreground. For large rooms:
1. LIST BACKGROUND ITEMS FIRST — Flux gives more weight to items early in the prompt
2. Use depth anchors: "in the far back of the room", "against the distant wall", "behind the structural pillars"
3. Each zone needs its OWN rug, light, and plant

WHAT DESTROYS IMAGES — NEVER do this:
- Describing walls, floor, ceiling, windows → CAUSES DISTORTION
- Vague items ("a lamp", "a rug") → AI generates blobs
- Too few items → room stays empty

GLASS SURFACES PROTECTION (CRITICAL):
- Sliding glass doors, bay windows MUST remain 100% VISIBLE
- NEVER place furniture IN FRONT of glass doors/large windows
- Curtains pulled OPEN to SIDES only

Respond in JSON: { "prompts": ["prompt1", "prompt2", ...] }
ONLY valid JSON.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Room: ${roomData.roomType} (${roomData.roomLabel}). Style: ${style} (${STYLE_LABELS[style] || style}). Size: ${estimatedArea}.

STRUCTURAL INVENTORY:
${JSON.stringify(roomData, null, 2)}

${fewShot}

Generate ${VARIANTS} prompts. HARD RULES:
1. Each prompt: ${wordRange} words, ${itemCount} items with material+color+texture
${depthRule}
3. Every table/nightstand has 3-4 objects ON it (books, candle, vase, tray)
4. Include: 2 light sources + 2 plants + rug + art + curtains (pulled OPEN to sides) + throw + cushions
5. GLASS PROTECTION: ${roomData.glazing?.length ? `This room has: ${roomData.glazing.join(", ")}. They MUST remain 100% visible and unblocked.` : "If the room has glass doors or large windows, they MUST stay fully visible. Curtains open to sides only."}`,
          },
          { type: "image_url", image_url: { url: photoUrl } },
        ],
      },
    ],
  });

  const raw = response.choices[0].message.content?.trim() || "";
  return parseJson(raw);
}

async function generateStaging(photoUrl, prompt) {
  trackCost("flux-kontext-pro");
  const fullPrompt = `${prompt} Ultra-photorealistic interior photography, shot on Canon EOS R5 with 16-35mm f/2.8 lens, natural window light mixed with warm interior lighting, 8K resolution, architectural magazine quality, exact room geometry preserved, walls plumb, floor plane undistorted, all doors, windows, sliding glass doors, bay windows, radiators, outlets, light switches, and fixed elements pixel-perfect unchanged, all glass surfaces fully visible and unobstructed, correct perspective, no lens warping, no floating objects, physically plausible furniture placement, consistent shadows matching existing light direction, subtle ambient occlusion under furniture.`;

  const prediction = await replicate.predictions.create({
    model: "black-forest-labs/flux-kontext-pro",
    input: {
      prompt: fullPrompt,
      input_image: photoUrl,
      aspect_ratio: "match_input_image",
      output_format: "jpg",
      safety_tolerance: 2,
    },
  });
  return prediction.id;
}

// ── Main ──

async function main() {
  console.log(`\n🔍 VIMIMO Quality Audit`);
  console.log(`   Style: ${STYLE}`);
  console.log(`   Variants per room: ${VARIANTS}`);
  console.log(`   Photos: ${photoArgs.length}`);
  console.log(`   Output: ${outDir}\n`);

  const report = {
    timestamp,
    style: STYLE,
    variants: VARIANTS,
    photos: [],
    totalCost: 0,
    summary: {},
  };

  for (let pi = 0; pi < photoArgs.length; pi++) {
    const photoInput = photoArgs[pi];
    console.log(`\n━━━ Photo ${pi + 1}/${photoArgs.length}: ${path.basename(photoInput)} ━━━`);

    const photoDir = path.join(outDir, `photo-${pi + 1}`);
    fs.mkdirSync(photoDir, { recursive: true });

    // Determine URL
    let photoUrl = photoInput;
    if (!photoInput.startsWith("http")) {
      // Local file — we can't send local files to Replicate, they need a URL
      console.log(`  ⚠️  Local file detected. Uploading to Replicate...`);
      const fileBuffer = fs.readFileSync(photoInput);
      const blob = new Blob([fileBuffer], { type: "image/jpeg" });
      const file = new File([blob], path.basename(photoInput), { type: "image/jpeg" });
      const fileUrl = await replicate.files.create(file);
      photoUrl = fileUrl.urls.get;
      console.log(`  📤 Uploaded: ${photoUrl}`);
    }

    // Save original
    await downloadFile(photoUrl, path.join(photoDir, "00-original.jpg"));

    const photoReport = {
      input: photoInput,
      url: photoUrl,
      cleaning: { success: false, url: null, time: 0 },
      analysis: null,
      prompts: [],
      stagings: [],
    };

    // ── Step 1: Clean ──
    console.log(`\n  📸 Step 1: Furniture Removal (Flux Kontext Pro)`);
    const cleanStart = Date.now();
    const cleanPredId = await cleanPhoto(photoUrl);
    const cleanedUrl = await waitForPrediction(cleanPredId, "Cleaning");
    photoReport.cleaning.time = ((Date.now() - cleanStart) / 1000).toFixed(1);

    if (cleanedUrl) {
      photoReport.cleaning.success = true;
      photoReport.cleaning.url = cleanedUrl;
      await downloadFile(cleanedUrl, path.join(photoDir, "01-cleaned.jpg"));
    } else {
      console.log(`  ⚠️  Cleaning failed, using original for staging`);
    }

    const workingUrl = cleanedUrl || photoUrl;

    // Rate limit pause after cleaning
    await new Promise((r) => setTimeout(r, 5000));

    // ── Step 2: Analyze ──
    console.log(`\n  🧠 Step 2: Room Analysis (GPT-4o Vision)`);
    try {
      photoReport.analysis = await analyzeRoom(workingUrl, STYLE);
      console.log(`  ✅ ${photoReport.analysis.roomLabel} (${photoReport.analysis.roomType})`);
      console.log(`     Materials: ${JSON.stringify(photoReport.analysis.existingMaterials)}`);
      console.log(`     Lighting: ${JSON.stringify(photoReport.analysis.lighting)}`);
      fs.writeFileSync(
        path.join(photoDir, "02-analysis.json"),
        JSON.stringify(photoReport.analysis, null, 2),
      );
    } catch (e) {
      console.log(`  ❌ Analysis failed: ${e.message}`);
    }

    // ── Step 3: Generate prompts ──
    console.log(`\n  ✍️  Step 3: Generate ${VARIANTS} staging prompts (GPT-4o)`);
    try {
      const result = await generatePrompts(workingUrl, photoReport.analysis, STYLE);
      photoReport.prompts = result.prompts || [];
      console.log(`  ✅ Got ${photoReport.prompts.length} prompts`);
      fs.writeFileSync(
        path.join(photoDir, "03-prompts.json"),
        JSON.stringify(photoReport.prompts, null, 2),
      );
      // Log first prompt (truncated) for review
      if (photoReport.prompts[0]) {
        console.log(`  📝 Prompt 1 preview: ${photoReport.prompts[0].substring(0, 150)}...`);
      }
    } catch (e) {
      console.log(`  ❌ Prompt generation failed: ${e.message}`);
    }

    // ── Step 4: Generate stagings ──
    console.log(`\n  🎨 Step 4: Generate staging images (Flux Kontext Pro × ${photoReport.prompts.length})`);
    const stagingPredIds = [];
    for (let si = 0; si < photoReport.prompts.length; si++) {
      try {
        // Rate limit: wait 12s between submissions when on low-credit Replicate account
        if (si > 0) {
          process.stdout.write(`  ⏳ Rate limit pause (12s)...\n`);
          await new Promise((r) => setTimeout(r, 12000));
        }
        const predId = await generateStaging(workingUrl, photoReport.prompts[si]);
        stagingPredIds.push({ index: si, predId });
      } catch (e) {
        console.log(`  ❌ Staging ${si + 1} submit failed: ${e.message}`);
      }
    }

    // Wait for all staging results (sequential to respect rate limit)
    for (const { index, predId } of stagingPredIds) {
      const url = await waitForPrediction(predId, `Staging ${index + 1}`);
      const result = { index, url, success: !!url, predictionId: predId };
      photoReport.stagings.push(result);
      if (url) {
        await downloadFile(url, path.join(photoDir, `04-staging-${index + 1}.jpg`));
      }
    }

    report.photos.push(photoReport);
  }

  // ── Report ──
  report.totalCost = totalCost();
  report.summary = {
    totalPhotos: report.photos.length,
    cleaningSuccess: report.photos.filter((p) => p.cleaning.success).length,
    analysisSuccess: report.photos.filter((p) => p.analysis).length,
    totalStagings: report.photos.reduce((s, p) => s + p.stagings.length, 0),
    stagingSuccess: report.photos.reduce((s, p) => s + p.stagings.filter((st) => st.success).length, 0),
    costBreakdown: Object.fromEntries(
      Object.entries(costs).map(([k, v]) => [k, { calls: v.count, cost: `$${(v.count * v.unitCost).toFixed(2)}` }]),
    ),
  };

  fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));

  // ── Print Summary ──
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  QUALITY AUDIT REPORT`);
  console.log(`${"═".repeat(60)}`);
  console.log(`  Photos tested:      ${report.summary.totalPhotos}`);
  console.log(`  Cleaning success:   ${report.summary.cleaningSuccess}/${report.summary.totalPhotos}`);
  console.log(`  Analysis success:   ${report.summary.analysisSuccess}/${report.summary.totalPhotos}`);
  console.log(`  Staging generated:  ${report.summary.stagingSuccess}/${report.summary.totalStagings}`);
  console.log(`  Total API cost:     $${report.totalCost.toFixed(2)}`);
  console.log();
  for (const [service, data] of Object.entries(report.summary.costBreakdown)) {
    console.log(`    ${service}: ${data.calls} calls = ${data.cost}`);
  }
  console.log(`\n  📂 Results saved to: ${outDir}`);
  console.log(`\n  👉 Ouvre le dossier et compare visuellement:`);
  console.log(`     - 00-original.jpg  → La photo d'origine`);
  console.log(`     - 01-cleaned.jpg   → Meubles retirés`);
  console.log(`     - 04-staging-*.jpg → Les variantes de staging`);
  console.log(`\n  ❓ Pour chaque staging, note sur 5:`);
  console.log(`     5 = Publiable tel quel sur SeLoger/LeBonCoin`);
  console.log(`     4 = Bon, retouche mineure possible`);
  console.log(`     3 = Moyen, distorsions visibles mais corrigeables`);
  console.log(`     2 = Mauvais, artefacts évidents`);
  console.log(`     1 = Inutilisable, déformation majeure`);
  console.log(`${"═".repeat(60)}\n`);
}

main().catch((e) => {
  console.error(`\n❌ Fatal error: ${e.message}`);
  process.exit(1);
});
