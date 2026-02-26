export const CLEAN_PHOTO_PROMPT =
  "Edit this exact photo, keep camera angle, perspective, and structure 100% identical: Remove ALL movable furniture, beds, sofas, tables, chairs, boxes, clothes, clutter, and decorations. Keep ONLY the bare room structure: walls, floor texture and material unchanged, ceiling, windows, doors, radiators, electrical outlets, light switches, ceiling lights, built-in closets, and all fixed architectural elements. The room must appear completely empty but structurally identical. Photorealistic, exact room proportions, exact floor material, no distortion, camera locked.";

export const BATCH_VISION_SYSTEM_PROMPT = `Tu es un expert en analyse immobilière. Pour CHAQUE photo, analyse la pièce.

Réponds en JSON valide :
{
  "propertyType": "apartment"|"house"|"commercial",
  "rooms": [
    {
      "photoIndex": 1,
      "roomType": "living_room"|"bedroom"|"kitchen"|"bathroom"|"dining_room"|"office"|"studio"|"hallway"|"balcony",
      "roomLabel": "Salon principal",
      "dimensions": { "estimatedArea": "25m²", "ceilingHeight": "2.5m", "shape": "rectangular" },
      "existingMaterials": { "flooring": "parquet", "walls": "white painted", "ceiling": "flat white" },
      "lighting": { "naturalLight": "good", "windowCount": 2, "lightDirection": "south" },
      "cameraAngle": { "perspective": "corner wide", "height": "eye level", "orientation": "landscape" },
      "stagingPriority": "high"|"medium"|"low",
      "notes": "specific observations"
    }
  ],
  "overallNotes": "general observations"
}

photoIndex must match image order (1-based). One room per photo. Reply ONLY valid JSON, no markdown fences.`;

export const STAGING_PROMPT_SYSTEM = `You are a WORLD-CLASS INTERIOR DESIGNER writing image editing prompts for Flux Kontext Pro. You stage empty rooms to look like they belong in Architectural Digest — the kind of staging that makes buyers emotionally fall in love with a property.

You will receive a PHOTO of an empty room. Analyze it carefully: the exact wall colors, floor material, window positions, door locations, ceiling type, lighting conditions, and camera perspective.

Then write 5 EDITING prompts that add PREMIUM furniture and FULL decorator-level styling.

CRITICAL — WHAT MAKES A GOOD vs BAD PROMPT:

BAD (too generic, no design):
"Edit this exact photo... Add a bed along the back wall with nightstands and a lamp. Add a rug on the floor. Keep all walls..."

BAD (just furniture, no decoration):
"Edit this exact photo... Add a gray sofa facing the window, a coffee table, and an armchair. Keep all walls..."

GOOD (specific design, rich decoration, layered):
"Edit this exact photo... Add a deep emerald velvet sofa with gold legs along the back wall, a round white marble coffee table with stacked Assouline books and a brass candle holder, a cream boucle armchair to the right, a large ivory hand-knotted wool rug anchoring the seating area, a tall brass arc floor lamp behind the sofa, a gallery wall of three framed black-and-white photography prints above the sofa, a fiddle leaf fig in a woven seagrass basket in the corner by the window, and sage green linen curtains softly pooling on the floor. Keep all walls..."

GOOD (bedroom example):
"Edit this exact photo... Add a king-size bed with an upholstered sand linen headboard centered on the back wall, layered bedding with white linen duvet, camel cashmere throw folded at the foot, and four textured cushions in ivory and terracotta, matching oak nightstands on each side with ceramic table lamps with linen drum shades, a large abstract warm-toned oil painting above the headboard, a plush cream wool rug under the bed, a small olive tree in a ribbed ceramic pot by the window, and a rattan bench at the foot of the bed with a folded herringbone blanket. Keep all walls..."

YOUR RULES:
- EVERY prompt must be as detailed as the GOOD examples above — list EVERY item with its material, color, and texture
- NEVER just say "a sofa" — say "a deep-seated cognac distressed leather sofa with brass rivets"
- NEVER just say "a lamp" — say "a sculptural brass arc floor lamp with a white linen drum shade"
- NEVER just say "a rug" — say "a large hand-knotted vintage Persian rug in faded rose and indigo"
- ALWAYS include ALL of these in every prompt: main furniture + rug + lighting (2 sources) + art on walls + plants + decorative objects on surfaces + textiles (throws, cushions, curtains)
- Describe surfaces: coffee tables must have objects ON them (books, candle, vase with flowers, decorative tray)
- Nightstands must have objects ON them (lamp, small plant, book, ceramic dish)
- Shelves must be STYLED (books, ceramics, small art, plant)

ANTI-DISTORTION RULES (HIGHEST PRIORITY — violating these ruins the image):
1. NEVER describe the room itself (walls, floor, windows, ceiling). Describing structure CAUSES DISTORTION.
2. Walls, floor, ceiling, windows, doors must remain PIXEL-PERFECT — zero modifications.
3. Start every prompt with: "Edit this exact photo, keep camera angle, perspective, and room structure 100% identical."
4. End every prompt with: "Keep all walls, floor, windows, doors, ceiling, radiators, outlets, and light switches exactly unchanged. Photorealistic interior photography, exact room proportions, no distortion, no lens warping, camera locked."
5. Reference spatial positions from the photo (e.g., "along the back wall", "in the corner by the window").
6. Only mention furniture, rugs, artwork, plants, lamps, curtains, decorative objects. NO structural changes.
7. ALL furniture must obey gravity — feet flat on the floor, no floating objects, no clipping through walls.
8. Shadows and reflections must be CONSISTENT with existing light sources in the photo.
9. Each prompt: 3-5 sentences between start/end. Pack maximum design detail. Specificity = quality.
10. Generate exactly 5 prompts:
   - Prompt 1: SIGNATURE — The hero "cover shot" staging with complete decoration
   - Prompt 2: ALTERNATIVE — Different furniture layout, same richness of decoration
   - Prompt 3: EDITORIAL — Maximum decor density: styled surfaces everywhere, gallery wall, abundant plants, curated objects
   - Prompt 4: WARM & LIVABLE — Cozy premium with plush textiles, warm lighting, personal touches
   - Prompt 5: SHOWROOM LUXE — Ultra-premium: statement art, sculptural furniture, marble/brass/velvet, dramatic lighting

Respond in JSON: { "analysis": "Brief 1-line description of what you see", "prompts": ["prompt1", "prompt2", "prompt3", "prompt4", "prompt5"] }
No markdown, ONLY valid JSON.`;

const STYLE_GUIDES: Record<string, string> = {
  scandinavian: `SCANDINAVIAN DESIGN GUIDE:
- Furniture: Light oak or birch wood frames, clean lines, tapered legs. Hay, Muuto, &Tradition aesthetics.
- Sofa: Light gray or off-white linen, low-profile with wooden legs.
- Textiles: Sheepskin throws, chunky knit blankets, linen cushions in ivory/sage/dusty rose.
- Rug: Flatweave wool in cream or light gray geometric pattern.
- Lighting: Sculptural pendant (PH style), minimalist floor lamp with linen shade.
- Decor: Ceramic vases with dried pampas, wooden trays, white candles, stacked design books.
- Plants: Monstera in woven basket, small eucalyptus in ceramic pot.
- Art: Abstract minimalist prints in thin oak frames, nature photography.
- Palette: Warm whites, pale wood, soft gray, sage green, muted blush accents.`,

  industrial: `INDUSTRIAL DESIGN GUIDE:
- Furniture: Raw steel frames, reclaimed wood surfaces, aged leather. Restoration Hardware, BDDW aesthetics.
- Sofa: Cognac or dark brown distressed leather, deep-seated, with metal legs or wooden base.
- Textiles: Dark charcoal wool throws, leather cushions, raw linen in earth tones.
- Rug: Vintage-style Persian or dark jute rug with patina feel.
- Lighting: Edison bulb pendant on black cord, adjustable brass floor lamp, matte black table lamp.
- Decor: Stacked vintage books, iron candelabra, architectural models, whiskey decanter on metal tray.
- Plants: Large fiddle leaf fig in matte black pot, trailing pothos on shelf, snake plant.
- Art: Large-format black-and-white photography, abstract charcoal sketch, metal wall sculpture.
- Palette: Charcoal, cognac leather, aged brass, raw wood, matte black, warm concrete tones.`,

  modern_minimalist: `MODERN MINIMALIST DESIGN GUIDE:
- Furniture: Sculptural silhouettes, premium materials, invisible hardware. B&B Italia, Minotti aesthetics.
- Sofa: Boucle or performance fabric in warm white/sand, low and geometric, no visible legs or slim metal.
- Textiles: Cashmere throw in camel, silk cushions in tonal neutrals, subtle texture contrast.
- Rug: Large solid wool in off-white or soft taupe, thick pile.
- Lighting: Sculptural Flos-style arc lamp, recessed-look spots, minimal pendant in white/brass.
- Decor: Single sculptural object on coffee table, one curated art book, small ceramic bowl.
- Plants: Architectural olive tree in ribbed cement pot, single orchid in stone vessel.
- Art: ONE large-scale abstract painting (cream/beige/charcoal), gallery-hung with intentional negative space.
- Palette: Warm white, sand, taupe, charcoal accent, brushed brass touches. Less is more but every piece is premium.`,

  classic_french: `CLASSIC FRENCH DESIGN GUIDE:
- Furniture: Curved lines, cabriole legs, mix of antique and contemporary. Parisian apartment feel. Pierre Frey fabrics.
- Sofa: Velvet in deep green, navy, or dusty pink. Curved back, turned wood legs, bolster cushions.
- Textiles: Silk curtains, embroidered cushions, herringbone wool throw, toile accents.
- Rug: Aubusson-style or vintage Oushak in faded rose/blue/gold tones.
- Lighting: Crystal or brass chandelier effect, marble-base table lamp with silk shade, gilded wall sconces.
- Decor: Marble bust, ornate mirror, fresh peonies in crystal vase, porcelain dishes, vintage gilt clock.
- Plants: White hydrangeas in silver urn, small boxwood topiary, lavender in aged terracotta.
- Art: Classical oil painting in ornate gold frame, antique botanical prints, large gilt mirror.
- Palette: Cream, dusty rose, sage, navy, gold accents, marble white, warm wood tones.`,

  bohemian: `BOHEMIAN DESIGN GUIDE:
- Furniture: Mix of vintage and handcrafted, rattan, carved wood, low seating. Anthropologie, Justina Blakeney aesthetics.
- Sofa: Deep linen in terracotta or mustard, oversized with mixed-pattern cushions, floor cushions nearby.
- Textiles: Moroccan kilim cushions, macramé wall hanging, hand-woven throw in warm tones, layered patterns.
- Rug: Layered rugs — vintage Turkish over jute, rich colors (rust, indigo, saffron).
- Lighting: Woven rattan pendant, brass Moroccan lantern, warm-glow fairy lights, carved wood table lamp.
- Decor: Stacked travel books, ceramic collection, incense holder, woven baskets, brass candle holders, crystals.
- Plants: ABUNDANT — hanging trailing pothos, large bird of paradise, collection of small succulents, dried flower arrangement.
- Art: Gallery wall mixing photography, textile art, small paintings, woven pieces in mismatched frames.
- Palette: Terracotta, mustard, indigo, sage, burnt orange, warm cream, natural wood, brass.`,
};

export function stagingPromptUser(
  roomType: string,
  roomLabel: string,
  style: string,
  styleLabel: string,
  visionData: Record<string, unknown>
): string {
  const styleGuide = STYLE_GUIDES[style] || "";

  return `Room: ${roomType} (${roomLabel}). Style to apply: ${style} (${styleLabel}).

${styleGuide}

STRUCTURAL INVENTORY (from prior analysis — DO NOT modify these):
${JSON.stringify(visionData, null, 2)}

Generate 5 editing prompts for this ${roomLabel}.

MANDATORY CHECKLIST — every prompt MUST include ALL of these:
✅ Main furniture with exact material/color/texture description
✅ Rug with material, color, and pattern
✅ 2 lighting sources (floor lamp + table lamp, or pendant + sconce, etc.) with material description
✅ Art on walls (painting, prints, or mirror) with frame and subject description
✅ At least 1 plant with exact species and pot description
✅ Decorative objects on every surface (books, candles, vases with flowers, trays, ceramics)
✅ Textiles: throw blanket + cushions with fabric/color + curtains if windows are visible
✅ Every item must have: material + color + texture (never just "a lamp" or "a sofa")

Use the style guide above for the exact aesthetic. Place furniture logically (avoid blocking windows/doors).`;
}

// ─── Video generation constants (Kling v2.1 Pro) ───

/**
 * Camera direction tokens — forces slow, professional real estate camera work.
 * Kling interprets these as motion instructions; explicit "no" tokens
 * reduce hallucinated fast pans and whip movements.
 */
export const VIDEO_CAMERA_PROMPT = [
  "Ultra slow smooth cinematic dolly-in,",
  "locked tripod-mounted camera with imperceptible forward glide,",
  "professional real estate walkthrough cinematography,",
  "no handheld shake, no fast pan, no whip movement, no rotation,",
  "camera height fixed at eye level throughout entire sequence.",
].join(" ");

/**
 * Quality suffix appended to every video prompt — enforces temporal coherence.
 * "Strict temporal consistency" and "frame-to-frame coherence" are the
 * strongest anti-morphing tokens for diffusion-based video models.
 */
export const VIDEO_QUALITY_SUFFIX = [
  "8K photorealistic professional real estate video,",
  "strict temporal consistency, frame-to-frame coherence,",
  "no morphing, no melting, no warping, no object flickering,",
  "all furniture physically stable and stationary throughout,",
  "walls, floor, windows, doors structurally rigid in every frame,",
  "natural indoor lighting with consistent shadows, no light flickering,",
  "Architectural Digest cinematic quality, 24fps smooth motion.",
].join(" ");

export function klingVideoPrompt(style: string, roomType: string): string {
  return [
    VIDEO_CAMERA_PROMPT,
    `Seamless transition from empty ${roomType} to beautifully furnished ${style} ${roomType}.`,
    "Room structure, walls, floor, ceiling, windows, and doors remain PERFECTLY IDENTICAL in every frame.",
    "Furniture appears gradually and naturally, already in final position — no sliding, no floating.",
    VIDEO_QUALITY_SUFFIX,
  ].join(" ");
}

export const KLING_NEGATIVE_PROMPT = [
  "blurry, out of focus, low quality, low resolution, grainy,",
  "warped walls, warped floor, warped windows, bent doorframes, curved ceiling,",
  "changed room proportions, room shape shift, structural deformation,",
  "furniture sliding, furniture floating, furniture morphing, objects melting,",
  "fast camera movement, shaky camera, handheld, whip pan, rotation,",
  "perspective shift, fisheye distortion, lens flare,",
  "flickering lights, inconsistent shadows, temporal artifacts,",
  "text, watermark, logo, signature.",
].join(" ");

// ─── Social Reel video prompts (Ultra-Wide Architectural Camera) ───

/**
 * 3 camera movement styles drawn from top-tier real estate video creators.
 * Each simulates a different pro lens + motion combo that Kling v2.1 interprets well.
 *
 * Key insight: specifying the exact lens (14mm, 13mm, 0.5x) + motion type
 * produces dramatically more cinematic results than generic "dolly" instructions.
 */
export const SOCIAL_CAMERA_MOVEMENTS = [
  // Style A — 45° diagonal sweep (the viral TikTok favourite)
  {
    id: "diagonal_sweep",
    camera: [
      "Shot on Canon EOS R5 at 14mm f/2.8 ultra-wide lens,",
      "45-degree diagonal spatial movement sweeping from low-left corner to upper-right,",
      "smooth accelerating dolly with subtle parallax between foreground furniture and back wall,",
      "immersive first-person real estate walkthrough,",
      "dramatic depth reveal showing full room volume,",
      "camera starts at knee height and rises to eye level during movement.",
    ].join(" "),
  },
  // Style B — 90° straight-on architectural push-in (magazine cover shot)
  {
    id: "frontal_push",
    camera: [
      "Shot on iPhone 15 Pro at 0.5x ultra-wide lens, 13mm equivalent,",
      "90-degree straight-on architectural perspective push-in,",
      "perfectly centered symmetrical composition,",
      "slow controlled forward glide from doorway threshold into the center of the room,",
      "seamless spatial motion revealing layered depth planes,",
      "camera locked at chest height, zero vertical tilt, zero rotation.",
    ].join(" "),
  },
  // Style C — lateral tracking shot (cinematic real estate B-roll)
  {
    id: "lateral_track",
    camera: [
      "Shot on Canon EOS R5 at 14mm f/2.8 ultra-wide lens,",
      "smooth lateral tracking shot from left wall to right wall,",
      "stabilized gimbal movement parallel to the back wall,",
      "foreground objects create cinematic parallax depth separation,",
      "gentle 15-degree inward arc revealing room volume,",
      "camera at eye level, constant height, fluid horizontal motion.",
    ].join(" "),
  },
] as const;

/**
 * Quality suffix for social_reel — enforces architectural lens look + coherence.
 */
export const SOCIAL_QUALITY_SUFFIX = [
  "4K cinematic vertical video, viral real estate content,",
  "ultra-wide 14mm rectilinear lens rendering, zero barrel distortion,",
  "strict temporal consistency, frame-to-frame coherence,",
  "no morphing, no melting, no warping, no object flickering,",
  "all furniture physically stable and stationary throughout,",
  "walls, floor, windows, doors structurally rigid in every frame,",
  "natural indoor lighting with consistent shadows,",
  "photorealistic architectural interior cinematography, smooth 24fps motion.",
].join(" ");

/**
 * Negative prompt for social_reel — does NOT block fast camera movement.
 */
export const SOCIAL_NEGATIVE_PROMPT = [
  "blurry, out of focus, low quality, low resolution, grainy,",
  "warped walls, warped floor, warped windows, bent doorframes, curved ceiling,",
  "changed room proportions, room shape shift, structural deformation,",
  "furniture sliding, furniture floating, furniture morphing, objects melting,",
  "fisheye distortion, barrel distortion, extreme lens flare,",
  "flickering lights, inconsistent shadows, temporal artifacts,",
  "shaky camera, handheld shake, rolling shutter,",
  "text, watermark, logo, signature.",
].join(" ");

/**
 * Build the social video prompt with a randomly selected camera movement style.
 * Each room in a project gets a different movement for visual variety.
 * The selected style ID is logged for debugging.
 */
export function klingSocialVideoPrompt(style: string, roomType: string): string {
  const movement = SOCIAL_CAMERA_MOVEMENTS[
    Math.floor(Math.random() * SOCIAL_CAMERA_MOVEMENTS.length)
  ];
  console.log(`[PROMPT] Social camera style: ${movement.id} for ${roomType}`);

  return [
    movement.camera,
    `Dramatic reveal from empty ${roomType} to stunning ${style} ${roomType}.`,
    "Room structure, walls, floor, ceiling, windows, and doors remain PERFECTLY IDENTICAL in every frame.",
    "Furniture appears in a cinematic reveal — bold, immersive, spatially coherent.",
    SOCIAL_QUALITY_SUFFIX,
  ].join(" ");
}

// ─── Quality boosters & negative prompts for Flux Kontext staging ───

/**
 * Appended to EVERY staging prompt to enforce photorealism + structural fidelity.
 * Flux Kontext Pro reads the tail of the prompt with high weight,
 * so quality tokens here act as a "style lock".
 */
export const STAGING_QUALITY_SUFFIX = [
  "Ultra-photorealistic interior photography, shot on Canon EOS R5 with 16-35mm f/2.8 lens,",
  "natural window light mixed with warm interior lighting,",
  "8K resolution, architectural magazine quality, Architectural Digest editorial,",
  "exact room geometry preserved, walls plumb, floor plane undistorted,",
  "all doors, windows, radiators, outlets, light switches, and fixed elements pixel-perfect unchanged,",
  "correct perspective, no lens warping, no floating objects, physically plausible furniture placement,",
  "consistent shadows matching existing light direction, subtle ambient occlusion under furniture.",
].join(" ");

/**
 * Appended to EVERY cleaning prompt to enforce structural preservation.
 */
export const CLEANING_QUALITY_SUFFIX = [
  "Ultra-photorealistic, shot on Canon EOS R5,",
  "exact room geometry preserved, all architectural elements pixel-perfect,",
  "consistent lighting and shadows, 8K resolution, no artifacts.",
].join(" ");

export const DESCRIPTION_SYSTEM_PROMPT = `Tu es un expert en marketing immobilier et réseaux sociaux. Tu génères des descriptions captivantes pour des biens immobiliers meublés virtuellement.

Tu reçois les informations d'un projet de staging IA (pièces, style, infos du bien). Génère 2 descriptions :

1. **Instagram** : Élégante, inspirante, 3-5 lignes. Utilise des emojis pertinents (🏡✨🪄🛋️📐💎). Termine avec 10-15 hashtags populaires (#staging #immobilier #luxe #homesweethome #realestate #virtualstaging #interiordesign #homedecor #decoration #avendre etc.).

2. **TikTok** : Punchy, court, 2-3 lignes max. Commence par un hook accrocheur (question ou statement percutant). Style oral et dynamique. Termine avec 8-10 hashtags tendance (#staging #immobilier #beforeafter #transformation #homemakeover #fyp #pourtoi #realestate #viral etc.).

Adapte le ton au style de décoration choisi. Mentionne les pièces traitées.

Réponds en JSON valide :
{
  "instagram": "texte complet avec emojis et hashtags",
  "tiktok": "texte complet avec hashtags"
}

Reply ONLY valid JSON, no markdown fences.`;

export const TRIAGE_SYSTEM_PROMPT = `Tu es un expert en immobilier et en visite virtuelle. Tu reçois N photos d'un bien immobilier.

Pour CHAQUE photo, analyse :
1. Le type de pièce
2. La qualité (bonne, floue, doublon, inutilisable)
3. Si elle devrait être incluse dans la visite
4. Un label descriptif

Puis recommande un ORDRE de visite logique (entrée → séjour → cuisine → chambres → salle de bain → extérieur).

Détecte les doublons (même pièce, angle similaire) : garde la meilleure, marque l'autre comme "duplicate".
Détecte les photos floues ou mal cadrées : marque comme "blurry".

Réponds en JSON valide :
{
  "propertyType": "apartment"|"house"|"commercial",
  "photos": [
    {
      "photoIndex": 1,
      "roomType": "living_room"|"bedroom"|"kitchen"|"bathroom"|"dining_room"|"office"|"studio"|"hallway"|"balcony"|"exterior"|"entrance"|"garage"|"terrace",
      "roomLabel": "Salon principal",
      "included": true,
      "reason": "Photo nette, bon angle",
      "quality": "good"|"blurry"|"duplicate"|"unusable",
      "order": 1
    }
  ],
  "suggestedOrder": [1, 3, 2, 5, 4],
  "overallNotes": "Bel appartement 3 pièces, lumineux"
}

photoIndex doit correspondre à l'ordre des images (1-based). suggestedOrder contient les photoIndex dans l'ordre de visite recommandé (uniquement les photos incluses). Reply ONLY valid JSON, no markdown fences.`;
