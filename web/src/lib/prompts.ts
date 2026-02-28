export const CLEAN_PHOTO_PROMPT =
  "Empty room, architectural photography. Completely remove ALL movable furniture, objects, clutter, vehicles, bicycles, boxes, clothes, tools, toys, and decorations. Reconstruct the empty walls and floors perfectly where objects were removed — inpaint clean wall texture and floor material seamlessly. Keep ONLY the fixed architectural elements: doors, windows, built-in kitchen cabinets, kitchen islands, countertops, sinks, built-in appliances, structural pillars, radiators, electrical outlets, light switches, ceiling lights, and built-in closets. The result must be a clean, bare, and spacious interior with zero movable objects remaining. Photorealistic, exact room proportions, no distortion, camera locked.";

export const GLOBAL_CONTEXT_SYSTEM_PROMPT = `You are an expert architectural analyst. You receive ALL photos of a single property. Analyze them together and extract a dense "Visual DNA" that captures the SHARED architectural identity across every room.

Focus on elements that MUST remain consistent across all rooms:
- Flooring material, color, and pattern (the SAME floor runs through most rooms)
- Wall treatment and color (paint, wallpaper, molding style)
- Window type and exterior view (what is visible outside — trees, buildings, sky, garden)
- Ceiling height and style (flat, beamed, molding, recessed spots)
- Architectural style (modern, classic, Haussmann, industrial loft, etc.)
- Lighting character (warm/cool, natural light direction, intensity)
- Fixed elements (radiators, built-in fixtures, door style)

Return ONLY valid JSON:
{
  "globalContext": "Dense 50-80 word English description of the property's visual DNA — materials, colors, architectural style, exterior view, lighting character",
  "dominantMaterials": "comma-separated list of key materials seen across rooms",
  "exteriorView": "what is visible through windows across the property",
  "architecturalStyle": "one-line architectural style description",
  "lightingCharacter": "one-line lighting description"
}

Be EXTREMELY specific and factual. Describe what you SEE, not what you imagine. No markdown, ONLY valid JSON.`;

export const BATCH_VISION_SYSTEM_PROMPT = `Tu es un expert en analyse immobilière. Pour CHAQUE photo, analyse la pièce ou l'espace.

RÈGLE ABSOLUE : Tu DOIS TOUJOURS répondre en JSON valide, même si la photo est floue, extérieure, ou inhabituelle. JAMAIS de texte libre, JAMAIS d'excuses, JAMAIS de refus. Un JSON valide à chaque fois.

RÈGLE CRITIQUE D'IDENTIFICATION — tu DOIS utiliser ces indices visuels :
- Si tu vois un LIT, un SOMMIER, un MATELAS, ou des DRAPS → c'est une CHAMBRE (bedroom), JAMAIS un salon
- Si tu vois un CANAPÉ, un FAUTEUIL, une TABLE BASSE, une TV → c'est un SALON (living_room)
- Si tu vois un ÉVIER, un FOUR, des PLAQUES, un FRIGO → c'est une CUISINE (kitchen)
- Si tu vois une DOUCHE, une BAIGNOIRE, un LAVABO, des WC → c'est une SALLE DE BAIN (bathroom)
- Si tu vois un BUREAU, un ORDINATEUR → c'est un BUREAU (office)
- Si tu vois une TABLE avec des CHAISES autour (pas un bureau) → c'est un COIN REPAS (dining_room)
- Si tu vois une FAÇADE, un JARDIN, une PISCINE, une TERRASSE → c'est un EXTÉRIEUR (exterior)
- Si tu vois une PORTE DE GARAGE, des OUTILS, des VÉLOS → c'est un GARAGE (garage)
- En cas de doute sur un meuble retiré, observe la TAILLE de la pièce et la position des prises : une petite pièce ~10-15m² avec une seule fenêtre est probablement une chambre

Réponds en JSON valide :
{
  "propertyType": "apartment"|"house"|"commercial",
  "rooms": [
    {
      "photoIndex": 1,
      "roomType": "living_room"|"bedroom"|"kitchen"|"bathroom"|"dining_room"|"office"|"studio"|"hallway"|"balcony"|"exterior"|"garage"|"terrace",
      "roomLabel": "Salon principal",
      "dimensions": { "estimatedArea": "25m²", "ceilingHeight": "2.5m", "shape": "rectangular" },
      "existingMaterials": { "flooring": "parquet", "walls": "white painted", "ceiling": "flat white" },
      "lighting": { "naturalLight": "good", "windowCount": 2, "lightDirection": "south" },
      "cameraAngle": { "perspective": "corner wide", "height": "eye level", "orientation": "landscape" },
      "stagingPriority": "high"|"medium"|"low",
      "notes": "specific observations — mention ANY remaining furniture clues (bed frame, sofa, appliances) even if partially removed",
      "glazing": ["list ALL large glass surfaces: sliding glass doors, bay windows, French doors, floor-to-ceiling windows, glass walls — with their POSITION in the frame (left wall, back wall, right side). This is CRITICAL for staging to preserve them."]
    }
  ],
  "overallNotes": "general observations"
}

photoIndex must match image order (1-based). One room per photo. Reply ONLY valid JSON, no markdown fences.`;

export const STAGING_PROMPT_SYSTEM = `You write image-editing prompts for Flux Kontext Pro to stage empty rooms. Each prompt must be a SINGLE DENSE PARAGRAPH listing ONLY objects to add. Word count: 120-180 words for small/medium rooms, 180-250 words for large rooms (25m²+).

FORMAT (follow EXACTLY):
"Edit this exact photo, keep camera angle, perspective, and room structure 100% identical. [FURNITURE + DECOR — 120-180 words of items to add]. Keep all walls, floor, windows, doors, ceiling, radiators, outlets, and light switches exactly unchanged. Photorealistic interior photography, exact room proportions, no distortion, no lens warping, camera locked."

MANDATORY ITEM CHECKLIST — every prompt MUST include ALL of these:
□ PRIMARY FURNITURE: 2-3 main pieces with exact material + color + texture + position (e.g. "a deep-seated cognac distressed leather Chesterfield sofa with brass rivets along the back wall")
□ SECONDARY FURNITURE: 1-2 accent pieces (armchair, bench, console, side table) with full description
□ RUG: material + color + pattern + size (e.g. "a large 8x10 hand-knotted vintage Persian rug in faded rose and indigo")
□ LIGHTING × 2: two different light sources with material + shade description
□ ART ON WALLS: painting or prints with subject + frame + size
□ PLANTS × 2: species + pot description
□ STYLED SURFACES: every table/nightstand MUST have 3-4 objects ON it (books, candle, vase with flowers, tray, ceramics)
□ TEXTILES: throw blanket + 3-4 cushions with fabric + color + curtains if windows visible

WHAT DESTROYS IMAGES (never do this):
- Describing room structure (walls, floor, ceiling, windows) → CAUSES DISTORTION
- Vague items ("a lamp", "a sofa", "a plant") → AI generates blobs
- Too few items → room stays 80% empty, looks worse than unfurnished

SPATIAL FILLING RULE (CRITICAL):
Estimate the room size from the photo. The staging must FILL the room proportionally:
- Small room (10-15m²): 1 primary + 1 secondary furniture piece, cover 60% of visible floor with rug + objects
- Medium room (15-25m²): 2 primary + 1-2 secondary pieces, create a cohesive seating/sleeping area
- Large room (25m²+): create 2 DISTINCT ZONES at DIFFERENT DEPTHS. A single sofa in a 40m² room is ALWAYS wrong.

LARGE ROOM DEPTH RULE (25m²+ ONLY — HIGHEST PRIORITY):
The #1 failure mode is putting ALL furniture in the foreground and leaving the back empty. You MUST:
1. ZONE A (FOREGROUND): seating group — sofa + coffee table + armchair + rug (occupies the front 50% of the room)
2. ZONE B (BACKGROUND): a SECOND furniture group placed IN THE BACK of the room, BEHIND any pillars or in the far area — e.g. dining table + chairs, console/sideboard + mirror, desk + chair, or bookshelf + reading chair
3. LIST ZONE B ITEMS FIRST in the prompt, THEN Zone A. Flux Kontext Pro gives more visual weight to items mentioned earlier in the prompt — listing background items first forces them to render.
4. EACH zone needs its OWN rug, its OWN light source, and at least 1 plant
5. Use DEPTH ANCHORS: "in the far back of the room", "against the distant back wall", "behind the structural pillars", "in the rear half of the space"

ROOM TYPE RULES:
- BEDROOM: primary = bed (always include headboard + bedding layers + pillows), secondary = nightstands + bench/chair
- LIVING ROOM: primary = sofa + coffee table, secondary = armchair + side table. ALWAYS include a media/bookshelf area if wall space allows.
- KITCHEN: ONLY add items that belong in a kitchen: counter styling (cutting board, ceramic bowl, herb pots, cookbook stand), bar stools if there's an island, pendant lights, small appliances (espresso machine, toaster), fresh herbs in pots. NEVER add sofas, armchairs, coffee tables, rugs larger than a runner, or curtains in a kitchen. NEVER INVENT windows or architectural elements that don't exist in the photo.
- BATHROOM: only towels + bath accessories + candles + small plants
- HALLWAY: only console + mirror + runner rug + hooks
- GARAGE: only storage organization (shelving, tool wall, workbench) + epoxy floor mat. Do NOT turn a garage into a living room.
- EXTERIOR/TERRACE: only outdoor furniture (lounge chairs, dining set, planters, string lights, outdoor rugs). Keep the building facade, pool, and landscaping UNCHANGED.

ANTI-DISTORTION:
1. NEVER mention walls, floor, windows, ceiling, or doors in the furniture section
2. Reference positions from the photo ("along the back wall", "to the right of the window", "in the far-left corner")
3. Furniture must obey gravity — feet flat on floor, no floating, no clipping through pillars/islands
4. If fixed structures exist (pillars, islands, built-in units), place furniture AROUND them

ARCHITECTURAL HALLUCINATION BAN (CRITICAL):
- NEVER invent windows, doors, walls, columns, or architectural features that don't exist in the photo
- NEVER add curtains if there are NO windows visible in the photo
- NEVER change the flooring material (e.g. tile → wood)
- If the room has 0 windows, do NOT add curtains or mention windows at all

GLASS SURFACES PROTECTION (CRITICAL — violating this destroys the photo):
- Sliding glass doors, bay windows, French doors, floor-to-ceiling windows MUST remain 100% VISIBLE and UNOBSTRUCTED
- NEVER place furniture directly IN FRONT of a sliding glass door or large window — leave at least 50cm clearance
- NEVER write "curtains covering" or "drapes across" a sliding glass door — use "curtains framing the sides of" or "sheer curtains pulled to the sides of"
- Curtains must be OPEN and pulled to the SIDES, never drawn closed over glass surfaces
- If the room has a sliding glass door, explicitly write: "the sliding glass door remains fully visible and unblocked"

VARIETY across 5 prompts:
- Prompt 1: SIGNATURE hero shot — balanced, premium
- Prompt 2: ALTERNATIVE layout — different furniture arrangement
- Prompt 3: EDITORIAL — maximum density, styled to the inch
- Prompt 4: WARM & LIVABLE — cozy textiles, warm tones, personal touches
- Prompt 5: SHOWROOM LUXE — statement art, sculptural pieces, marble/brass/velvet

Respond in JSON: { "analysis": "1-line room description", "prompts": ["prompt1", "prompt2", "prompt3", "prompt4", "prompt5"] }
ONLY valid JSON, no markdown.`;

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
  visionData: Record<string, unknown>,
  globalContext?: string,
): string {
  const styleGuide = STYLE_GUIDES[style] || "";

  const globalBlock = globalContext
    ? `\nGLOBAL PROPERTY DNA (STRICT — apply to this room):\n${globalContext}\nYou MUST ensure visual continuity: same flooring, same wall treatment, same exterior view. Do NOT invent different materials.\n`
    : "";

  // Pick the right example based on room type
  const isBedroomType = ["bedroom", "studio"].includes(roomType);
  const fewShotExample = isBedroomType
    ? `EXAMPLE of a CORRECT prompt (match this density):
"Edit this exact photo, keep camera angle, perspective, and room structure 100% identical. Add a king-size bed with an upholstered oatmeal Belgian linen headboard centered on the back wall, layered with a white stonewashed linen duvet, a folded camel cashmere throw at the foot, and four textured cushions — two in ivory boucle and two in burnt sienna velvet. Place matching solid oak nightstands on each side, each with a ceramic table lamp with a warm linen drum shade, a small potted succulent in a ribbed terracotta pot, a hardcover book, and a ceramic trinket dish. Hang a large 100x80cm abstract warm-toned oil painting in a thin black metal frame above the headboard. Lay a plush 200x300cm cream wool rug under the bed extending past the nightstands. Place a woven rattan bench at the foot of the bed with a folded herringbone wool blanket. Add a tall fiddle leaf fig in a woven seagrass basket in the corner near the window, and sheer ivory linen curtains pulled open to the sides of the window, leaving the glass fully visible. All windows and glass doors remain completely visible and unobstructed. Keep all walls, floor, windows, doors, ceiling, radiators, outlets, and light switches exactly unchanged. Photorealistic interior photography, exact room proportions, no distortion, no lens warping, camera locked."`
    : `EXAMPLE of a CORRECT prompt (match this density):
"Edit this exact photo, keep camera angle, perspective, and room structure 100% identical. Add a deep-seated emerald velvet three-seater sofa with brushed brass legs along the back wall, with four cushions — two in ivory linen and two in mustard velvet. Place a round white Carrara marble coffee table with a matte brass base in front of the sofa, styled with three stacked Assouline coffee-table books, a brass candle holder with a cream pillar candle, and a small ceramic vase with dried pampas grass. Add a cream boucle accent armchair with walnut legs to the right of the sofa, angled inward. Lay a large 250x350cm hand-knotted vintage Persian rug in faded rose and indigo anchoring the entire seating area. Place a sculptural brass arc floor lamp with a white linen drum shade behind the left side of the sofa, and a ceramic table lamp with a fluted base on a slim walnut side table next to the armchair. Hang a gallery wall of three framed black-and-white photography prints in thin oak frames above the sofa. Add a large fiddle leaf fig in a woven seagrass basket in the corner near the window, and a trailing pothos on a floating shelf if wall space allows. Drape a chunky cream knit throw over one arm of the sofa, and add sheer sage green linen curtains pulled open to the sides of the windows, leaving all glass surfaces fully visible. All windows, sliding glass doors, and glass surfaces remain completely visible and unobstructed. Keep all walls, floor, windows, doors, ceiling, radiators, outlets, and light switches exactly unchanged. Photorealistic interior photography, exact room proportions, no distortion, no lens warping, camera locked."`;

  const dimensions = visionData.dimensions as Record<string, string> | undefined;
  const estimatedArea = dimensions?.estimatedArea || "unknown";
  const isLargeRoom = parseInt(estimatedArea) > 25;

  // Extract glazing info if available
  const glazing = (visionData.glazing as string[]) || [];
  const glazingRule = glazing.length > 0
    ? `\n6. GLASS PROTECTION: This room has: ${glazing.join(", ")}. Each one MUST remain 100% visible and unobstructed. Place NO furniture in front of them. Curtains must be pulled OPEN to the sides only. End each prompt with: "All windows, sliding glass doors, and glass surfaces remain completely visible and unobstructed."`
    : `\n6. If the room has any glass doors or large windows, they MUST remain fully visible. Curtains pulled open to sides only.`;

  // Large room: override few-shot with a depth-focused example
  const largeRoomExample = `EXAMPLE of a CORRECT prompt for a LARGE ROOM (match this structure — background items FIRST):
"Edit this exact photo, keep camera angle, perspective, and room structure 100% identical. In the far back of the room against the distant wall, place a round reclaimed oak dining table with four mismatched vintage wooden chairs, styled with a linen runner, a ceramic vase holding dried wildflowers, a brass candlestick with a cream taper candle, and a small terracotta bowl of lemons. Hang a woven seagrass pendant light above the dining table. Add a tall walnut bookshelf filled with books and decorative objects beside the dining area, with a trailing pothos on the top shelf. Place a large fiddle leaf fig in a woven basket next to the bookshelf. In the foreground, add a deep-seated olive velvet L-shaped sectional along the left wall with five cushions in mixed patterns of rust, cream, and indigo. Place a round black marble coffee table with brass legs in front of the sofa, styled with three stacked art books, a brass tray with candles, and a small ceramic planter. Add a rattan armchair with a cream cushion to the right, angled inward. Lay a large 300x400cm vintage Persian rug in faded rose and navy anchoring the front seating area. Place a sculptural brass arc floor lamp behind the sofa. Drape a chunky terracotta knit throw over one arm of the sectional, and add sheer white linen curtains pulled open to the sides of the windows. All windows, sliding glass doors, and glass surfaces remain completely visible and unobstructed. Keep all walls, floor, windows, doors, ceiling, radiators, outlets, and light switches exactly unchanged. Photorealistic interior photography, exact room proportions, no distortion, no lens warping, camera locked."`;

  const activeExample = isLargeRoom ? largeRoomExample : fewShotExample;
  const wordRange = isLargeRoom ? "180-250" : "120-180";
  const itemCount = isLargeRoom ? "15+" : "10+";

  const depthRule = isLargeRoom
    ? `\n3. Room is ~${estimatedArea} — THIS IS A LARGE ROOM. You MUST create 2 ZONES at DIFFERENT DEPTHS:\n   - ZONE B (BACK): dining table + chairs OR bookshelf + reading chair OR console + mirror — placed "in the far back", "against the distant wall", "behind the pillars". LIST THESE ITEMS FIRST IN THE PROMPT.\n   - ZONE A (FRONT): sofa + coffee table + armchair — placed in the foreground. LIST THESE AFTER Zone B.\n   - Each zone needs its OWN rug, light source, and plant.`
    : `\n3. Room is ~${estimatedArea} — fill at least 60% of visible floor with rug + furniture`;

  return `Room: ${roomType} (${roomLabel}). Style: ${style} (${styleLabel}). Estimated size: ${estimatedArea}.

${styleGuide}
${globalBlock}
STRUCTURAL INVENTORY (DO NOT modify these):
${JSON.stringify(visionData, null, 2)}

${activeExample}

YOUR TASK: Generate 5 prompts for this ${roomLabel}, each ${wordRange} words between the start/end markers.

HARD RULES:
1. Each prompt MUST list ${itemCount} distinct items with material + color + texture
2. EVERY surface (coffee table, nightstand, shelf, console) MUST have 3-4 objects ON it${depthRule}
4. Follow the ${styleLabel} style guide strictly
5. Use spatial references from the photo ("along the back wall", "in the far-left corner", "between the two windows")${glazingRule}`;
}

// ─── Video generation constants (Kling v2.1 Pro) ───

/**
 * Camera direction — smooth architectural dolly-in that forces Kling
 * to understand 3D depth. Static cameras cause 2D morphing; forward
 * motion eliminates it by creating real parallax.
 */
export const VIDEO_CAMERA_PROMPT =
  "Smooth cinematic dolly-in shot on Steadicam, slow push forward into the room at walking pace. Shot on Canon EOS R5 at 16-35mm f/2.8 ultra-wide lens. Camera starts at doorway threshold and drifts forward smoothly, revealing depth and spatial volume. Architectural stability, perfectly level horizon, zero tilt, zero rotation. Soft natural daylight, calm cinematic pacing.";

/**
 * Quality suffix — enforces temporal coherence and structural rigidity.
 */
export const VIDEO_QUALITY_SUFFIX = [
  "8K photorealistic professional real estate video,",
  "award-winning architectural cinematography,",
  "strict temporal consistency, frame-to-frame coherence,",
  "no morphing, no melting, no warping, no object flickering,",
  "all furniture physically stable and stationary throughout,",
  "perfectly stable walls, logical spatial depth, hyper-realistic textures,",
  "walls, floor, windows, doors structurally rigid in every frame,",
  "natural indoor lighting with consistent shadows, no light flickering,",
  "Architectural Digest cinematic quality, 24fps smooth motion.",
].join(" ");

export function klingVideoPrompt(style: string, roomType: string): string {
  return [
    VIDEO_CAMERA_PROMPT,
    `A beautifully furnished ${style} ${roomType} bathed in soft natural light.`,
    "The camera slowly glides forward, revealing the complete interior design.",
    "All furniture is already in place, perfectly still, casting natural shadows.",
    "Room structure, walls, floor, ceiling, windows, and doors remain PERFECTLY IDENTICAL in every frame.",
    VIDEO_QUALITY_SUFFIX,
  ].join(" ");
}

export const KLING_NEGATIVE_PROMPT = [
  "blurry, out of focus, low quality, low resolution, grainy,",
  "warped walls, warped floor, warped windows, bent doorframes, curved ceiling,",
  "changed room proportions, room shape shift, structural deformation,",
  "furniture sliding, furniture floating, furniture morphing, objects melting,",
  "furniture appearing, furniture materializing, objects popping in, magical effects,",
  "fast camera movement, shaky camera, handheld, whip pan, rotation,",
  "perspective shift, fisheye distortion, lens flare,",
  "flickering lights, inconsistent shadows, temporal artifacts,",
  "humans appearing from nothing, people morphing, body parts growing,",
  "text, watermark, logo, signature.",
].join(" ");

// ─── Social Reel video prompts (Architectural Camera Movement) ───

/**
 * 3 camera movement styles drawn from top-tier real estate video creators.
 * ALL movements push the camera FORWARD to force Kling into 3D parallax.
 * Static/locked cameras cause 2D morphing — never use them.
 */
export const SOCIAL_CAMERA_MOVEMENTS = [
  // Style A — Classic dolly-in from doorway (most reliable)
  {
    id: "dolly_in",
    camera: [
      "Shot on Canon EOS R5 at 14mm f/2.8 ultra-wide lens on Steadicam,",
      "smooth cinematic dolly-in from doorway threshold into room center,",
      "slow walking-pace forward drift revealing spatial depth and volume,",
      "perfectly level horizon, zero tilt, zero rotation, zero shake,",
      "wide architectural framing showing the entire room.",
    ].join(" "),
  },
  // Style B — 45-degree corner push-in (reveals two walls + depth)
  {
    id: "corner_push",
    camera: [
      "Shot on Canon EOS R5 at 16mm f/2.8 ultra-wide lens on gimbal,",
      "smooth 45-degree diagonal push-in from room corner,",
      "camera slowly advances revealing two walls and full floor depth,",
      "Steadicam-smooth forward motion, perfectly level, zero rotation,",
      "architectural composition showing spatial volume and perspective lines.",
    ].join(" "),
  },
  // Style C — Low-angle push-in (dramatic luxury perspective)
  {
    id: "low_push",
    camera: [
      "Shot on iPhone 15 Pro at 0.5x ultra-wide lens, 13mm equivalent,",
      "low-angle smooth push-in at waist height,",
      "camera slowly glides forward revealing furniture in dramatic low perspective,",
      "near-floor framing emphasizing ceiling height and room volume,",
      "Steadicam-smooth forward motion, perfectly stable, zero shake.",
    ].join(" "),
  },
] as const;

/**
 * Quality suffix for social_reel — architectural cinematography focus.
 */
export const SOCIAL_QUALITY_SUFFIX = [
  "4K cinematic vertical video, viral real estate content,",
  "award-winning real estate cinematography, bespoke designer furniture,",
  "Architectural Digest editorial quality, ultra-premium materials visible,",
  "ultra-wide 14mm rectilinear lens rendering, zero barrel distortion,",
  "perfectly stable walls, logical spatial depth, hyper-realistic textures,",
  "strict temporal consistency, frame-to-frame coherence,",
  "walls, floor, windows, doors structurally rigid and unchanged in every frame,",
  "all furniture physically stable and stationary, natural weight and shadows,",
  "natural indoor lighting with volumetric rays and consistent shadows,",
  "cinematic color grading, warm luxurious tones, smooth 24fps motion.",
].join(" ");

/**
 * Negative prompt for social_reel — blocks morphing, VFX artifacts, and
 * any object animation that would break architectural realism.
 */
export const SOCIAL_NEGATIVE_PROMPT = [
  "blurry, out of focus, low quality, low resolution, grainy,",
  "warped walls, warped floor, warped windows, bent doorframes, curved ceiling,",
  "changed room proportions, room shape shift, structural deformation,",
  "furniture sliding, furniture floating, furniture morphing, objects melting,",
  "furniture appearing, furniture materializing, objects popping in, magical effects,",
  "cheap CGI, plastic looking furniture, unrealistic materials,",
  "fisheye distortion, barrel distortion, extreme lens flare,",
  "flickering lights, inconsistent shadows, temporal artifacts,",
  "shaky camera, handheld shake, rolling shutter, whip pan,",
  "humans appearing from nothing, people morphing, body parts growing,",
  "text, watermark, logo, signature.",
].join(" ");

/**
 * Build the social video prompt — pure architectural exploration.
 * NO VFX, NO assembly, NO magical effects. Just a beautiful room
 * revealed by a smooth forward camera movement.
 */
export function klingSocialVideoPrompt(style: string, roomType: string): string {
  const movement = SOCIAL_CAMERA_MOVEMENTS[
    Math.floor(Math.random() * SOCIAL_CAMERA_MOVEMENTS.length)
  ];
  console.log(`[PROMPT] Social camera: ${movement.id} | room: ${roomType}`);

  return [
    movement.camera,
    `A beautifully furnished ${style} ${roomType} bathed in warm natural light.`,
    "The camera slowly glides forward, exploring the interior design with cinematic depth.",
    "All furniture is already in place, perfectly still, casting natural shadows on the floor.",
    "Soft daylight shifts subtly as the camera advances, creating gentle light transitions on surfaces.",
    "Room structure, walls, floor, ceiling, windows, and doors remain PERFECTLY IDENTICAL and rigid in every frame.",
    SOCIAL_QUALITY_SUFFIX,
  ].join(" ");
}

// ─── Veo 3.1 Video Prompts (Google AI — replaces Kling) ─────────────
// Veo 3.1 has NO negative_prompt parameter, so all constraints go in the prompt.
// Exports kept for interface compatibility.

export function veoVideoPrompt(style: string, roomType: string): string {
  return [
    VIDEO_CAMERA_PROMPT,
    `A beautifully furnished ${style} ${roomType} bathed in soft natural light.`,
    "The camera slowly glides forward, revealing the complete interior design.",
    "All furniture is already in place, perfectly still, casting natural shadows.",
    "Room structure, walls, floor, ceiling, windows, and doors remain PERFECTLY IDENTICAL in every frame.",
    "AVOID: blurry, warped walls, furniture morphing, objects appearing, fast camera, shaky, text, watermark.",
    VIDEO_QUALITY_SUFFIX,
  ].join(" ");
}

export const VEO_NEGATIVE_PROMPT = ""; // Veo 3.1 has no negative_prompt param

export function veoSocialVideoPrompt(style: string, roomType: string): string {
  const movement = SOCIAL_CAMERA_MOVEMENTS[
    Math.floor(Math.random() * SOCIAL_CAMERA_MOVEMENTS.length)
  ];
  console.log(`[PROMPT] Veo social camera: ${movement.id} | room: ${roomType}`);

  return [
    movement.camera,
    `A beautifully furnished ${style} ${roomType} bathed in warm natural light.`,
    "The camera slowly glides forward, exploring the interior design with cinematic depth.",
    "All furniture is already in place, perfectly still, casting natural shadows on the floor.",
    "Soft daylight shifts subtly as the camera advances, creating gentle light transitions on surfaces.",
    "Room structure, walls, floor, ceiling, windows, and doors remain PERFECTLY IDENTICAL and rigid in every frame.",
    "AVOID: blurry, warped walls, furniture morphing, objects appearing or disappearing, fast camera, shaky camera, text, watermark.",
    SOCIAL_QUALITY_SUFFIX,
  ].join(" ");
}

export const SOCIAL_VEO_NEGATIVE_PROMPT = ""; // Veo 3.1 has no negative_prompt param

// ─── Lifestyle Prompts (social_reel — human presence + cinematic scenes) ───

/**
 * Room-type → lifestyle scenario mapping.
 * Each entry provides thematic direction that GPT-4o uses to generate
 * scene descriptions with human presence, events, and dramatic lighting.
 */
const LIFESTYLE_SCENES: Record<string, string> = {
  living_room: `LIVING ROOM LIFESTYLE SCENARIOS:
- Couple relaxing: one reading on the sofa, another bringing coffee/wine from the kitchen
- Friends gathering: 3-4 people chatting, drinks in hand, warm ambient lighting
- Solo morning: person doing yoga or stretching, golden hour light streaming through windows
- Movie night: couple under a throw blanket, dimmed lights, candles on coffee table
- Holiday: Christmas tree with gifts, fireplace glow, hot cocoa scene`,

  bedroom: `BEDROOM LIFESTYLE SCENARIOS:
- Morning wake-up: person stretching in bed, sunlight through curtains, coffee on nightstand
- Getting ready: person choosing outfit in front of mirror, clothes laid on bed
- Cozy evening: person reading in bed with warm lamp, pet curled up at foot
- Couple: breakfast in bed scene, tray with croissants and flowers
- Self-care: person journaling or meditating, candles, peaceful atmosphere`,

  kitchen: `KITCHEN LIFESTYLE SCENARIOS:
- Couple cooking: one chopping vegetables, the other stirring a pot, wine glasses on counter
- Brunch prep: person making pancakes, fresh juice, morning light
- Friends aperitivo: 2-3 people around kitchen island, cheese board, cocktails
- Solo barista: person using espresso machine, steam rising, morning ritual
- Family baking: parent and child decorating cookies, flour dust in air`,

  bathroom: `BATHROOM LIFESTYLE SCENARIOS:
- Spa evening: person in bathtub with candles, eucalyptus branches, glass of wine
- Morning routine: person at vanity mirror applying skincare, bright clean light
- Luxury shower: steam-filled glass shower, fluffy towels and robe ready
- Self-care: bath bombs fizzing, book on bath tray, plants surrounding tub`,

  dining_room: `DINING ROOM LIFESTYLE SCENARIOS:
- Dinner party: 4-6 people seated, candelabra centerpiece, wine being poured
- Romantic dinner: couple at table, candlelight, flowers, intimate atmosphere
- Sunday brunch: family gathered, pastries and fresh flowers, sunlight flooding in
- Celebration: birthday or anniversary setup, champagne toast, festive table setting`,

  office: `OFFICE LIFESTYLE SCENARIOS:
- Focused work: person at desk with laptop, coffee, warm desk lamp glow
- Creative session: artist or designer at desk, mood board visible, afternoon light
- Video call: person on screen, professional backdrop, ring light reflection in eyes
- Late night hustle: desk lamp as sole light source, city view through window at night`,

  balcony: `BALCONY/TERRACE LIFESTYLE SCENARIOS:
- Golden hour apéro: couple sipping drinks at sunset, string lights overhead
- Morning coffee: person wrapped in blanket with steaming mug, sunrise view
- Summer dinner: small table set for two, candles, lanterns, twilight sky
- Night scene: city lights below, starry sky, person leaning on railing with wine`,

  exterior: `EXTERIOR/FACADE LIFESTYLE SCENARIOS:
- Summer evening: warm golden hour light on facade, couple arriving home
- Winter snow: light dusting of snow on roof and garden, warm light glowing from windows
- Autumn: golden leaves in yard, person walking toward front door with groceries
- Night: exterior lit with warm landscape lighting, starry sky, inviting entrance glow
- Festive: holiday lights on facade, wreath on door, warm interior glow through windows`,
};

const LIFESTYLE_DEFAULT_SCENE = `GENERAL LIFESTYLE SCENARIOS:
- Person entering the room with natural curiosity, discovering the space
- Couple interacting naturally with the furnished environment
- Solo moment of relaxation, reading, or enjoying the view
- Warm ambient evening lighting with candles and soft light sources`;

/**
 * System prompt for GPT-4o when generating lifestyle staging prompts (social_reel mode).
 * Key differences from classic STAGING_PROMPT_SYSTEM:
 * - REQUIRES human presence in every scene
 * - Enforces strict demographic diversity and anti-repetition
 * - Adds cinematic lighting / event / seasonal variations
 * - Still preserves room structure (anti-distortion rules remain)
 */
export const LIFESTYLE_SYSTEM_PROMPT = `You are a WORLD-CLASS CINEMATIC LIFESTYLE DIRECTOR writing image editing prompts for Flux Kontext Pro + Kling v2.1 video generation. You create viral social media real estate content — the kind of before/after that gets millions of views on TikTok and Instagram Reels.

You will receive a PHOTO of an empty room. Analyze the room's architecture, lighting, and atmosphere. Then write 5 EDITING prompts that transform it into a LIVED-IN CINEMATIC SCENE with human presence.

═══════════════════════════════════════════════════════════════════
CRITICAL RULE #1: HUMAN PRESENCE IS MANDATORY
═══════════════════════════════════════════════════════════════════
Every single prompt MUST include at least 1-2 realistic human figures actively using the space.
People must be:
- Performing a NATURAL ACTION appropriate to the room (cooking, reading, working, relaxing, hosting)
- Wearing REALISTIC CONTEMPORARY CLOTHING (not posing, not stock-photo stiff)
- Interacting with the furniture and environment (touching surfaces, holding objects, sitting naturally)
- Photographed from behind, in profile, or at 3/4 angle (NEVER direct frontal eye-contact — this is lifestyle, not portrait)

═══════════════════════════════════════════════════════════════════
CRITICAL RULE #2: ABSOLUTE DEMOGRAPHIC DIVERSITY (ZERO REPETITION)
═══════════════════════════════════════════════════════════════════
You MUST randomize the human figures across ALL 5 prompts. NEVER repeat the same profile twice.

For EACH prompt, explicitly specify:
- AGE: vary across 25-35, 35-45, 45-60, 20-30
- ETHNICITY: rotate through diverse backgrounds (East Asian, Black, Middle Eastern, South Asian, Latino, White European, mixed) — NEVER default to the same ethnicity twice in a row
- BODY TYPE: vary between slim, athletic, average, curvy — realistic proportions
- HAIR: vary length, color, texture (curly, straight, braids, short crop, long, bun, natural afro)
- OUTFIT: specific clothing described (linen shirt, cashmere sweater, silk robe, denim apron, tailored blazer, oversized knit)
- GROUP DYNAMIC: vary between solo person, couple, friends (2-3), family

ANTI-PATTERN WARNING: If you catch yourself writing "a young woman" or "a man in his 30s" without full demographic specification, STOP and add specifics.

═══════════════════════════════════════════════════════════════════
PROMPT STRUCTURE (follow this exactly)
═══════════════════════════════════════════════════════════════════
Each prompt must follow this template:
1. "Edit this exact photo, keep camera angle, perspective, and room structure 100% identical."
2. FURNITURE: Premium furniture with exact material/color/texture (same quality as classic staging)
3. HUMAN SCENE: 1-2 people described with full demographics + action + clothing + positioning
4. LIGHTING: Cinematic lighting setup (golden hour, candlelight, morning sun, moody evening, dramatic shadows)
5. ATMOSPHERE: Sensory details (steam from coffee, wine in glass, book pages, fabric textures, plant movement)
6. "Keep all walls, floor, windows, doors, ceiling, and fixed elements exactly unchanged. Ultra-photorealistic, shot on Canon EOS R5 at 35mm f/1.4, cinematic depth of field, 8K."

═══════════════════════════════════════════════════════════════════
THE 5 PROMPTS — MANDATORY VARIATIONS
═══════════════════════════════════════════════════════════════════
- Prompt 1: GOLDEN HOUR — Warm sunset light, relaxed solo or couple scene, aspirational lifestyle
- Prompt 2: SOCIAL GATHERING — Multiple people, drinks/food, conversation, warm ambient lighting
- Prompt 3: INTIMATE EVENING — Moody candlelit or dimmed scene, 1-2 people, cozy atmosphere
- Prompt 4: ENERGETIC MORNING — Bright natural light, person in motion (yoga, cooking, getting ready)
- Prompt 5: SEASONAL/EVENT — Pick ONE: holiday decor (Christmas, autumn), celebration (birthday, housewarming), or dramatic weather (rain outside, snow on windows)

═══════════════════════════════════════════════════════════════════
CRITICAL RULE #3: DIRECTIONAL TWILIGHT LIGHTING (rooms with natural light)
═══════════════════════════════════════════════════════════════════
If the room has visible windows, glass doors, or is an exterior/balcony/terrace:
- Read visionData.lighting from the STRUCTURAL INVENTORY (lightDirection, orientation, windowCount).
- For Prompt 1 (GOLDEN HOUR) and Prompt 3 (INTIMATE EVENING), you MUST include a TWILIGHT SENTENCE using this exact formula:
  "Change the scene to early twilight. The sun appears to the [LEFT/RIGHT/CENTER] side of the frame based on original window orientation, casting warm-orange highlights on furniture surfaces and long gentle shadows across the floor. Well-exposed brighter sky visible through windows, balanced interior-exterior exposure."
- How to determine sun position: if original light enters from the left of the frame → sun is LEFT. From the right → sun is RIGHT. If the camera faces the windows → sun is CENTER-BEHIND the viewer.
- For EXTERIOR rooms (facade, garden, terrace): ALWAYS apply twilight. Add: "Golden hour sky gradient from warm amber at horizon to deep blue above. Facade warmly lit by low-angle sunlight. Landscape shadows stretch dramatically."
- For rooms WITHOUT windows or natural light (windowless bathrooms, basements, hallways): do NOT use twilight. Use warm artificial lighting (candles, lamps, pendants) instead.
- NEVER guess a light direction. ONLY use what visionData.lighting provides.

ROOM CONTEXT LOCK (CRITICAL — violating this produces absurd results):
You MUST respect the physical reality and function of the room type. NEVER place furniture or people in ways that contradict the room's purpose.
- GARAGE: Do NOT add living room furniture. Only garage-appropriate items + people working on cars, organizing tools, etc.
- KITCHEN: Do NOT add office chairs or beds. Only kitchen items + people cooking, prepping, hosting around the island.
- BATHROOM: Do NOT add sofas or desks. Only bath items + person in self-care scenario.
- BALCONY/TERRACE: Only outdoor furniture + people enjoying outdoor activities.
- HALLWAY/ENTRANCE: Only entry furniture + person arriving, leaving, checking mail.
- NEVER place ANY object or person clipping through fixed structures (kitchen islands, pillars, countertops).

ANTI-DISTORTION RULES (same as classic staging — HIGHEST PRIORITY):
1. NEVER describe the room structure. Only add furniture, people, lighting, and decor.
2. Walls, floor, ceiling, windows, doors remain PIXEL-PERFECT unchanged.
3. ALL furniture must obey gravity. People must cast shadows consistent with lighting.
4. Spatial coherence: people must fit naturally in the room's proportions. No clipping through fixed structures.

GLOBAL COHERENCE RULE (CRITICAL):
You will receive a "GLOBAL PROPERTY DNA" block. This is the visual DNA of the ENTIRE property. You MUST:
- Use the EXACT same flooring material/color described in the DNA
- Maintain the EXACT same exterior view through windows
- Keep the SAME architectural style and wall treatment
- Match the SAME lighting character
- NEVER contradict the DNA

Respond in JSON: { "analysis": "Brief 1-line description", "prompts": ["prompt1", "prompt2", "prompt3", "prompt4", "prompt5"] }
No markdown, ONLY valid JSON.`;

/**
 * User prompt for lifestyle mode — includes room-specific scenario suggestions.
 */
export function lifestylePromptUser(
  roomType: string,
  roomLabel: string,
  style: string,
  styleLabel: string,
  visionData: Record<string, unknown>,
  globalContext?: string,
): string {
  const sceneGuide = LIFESTYLE_SCENES[roomType] || LIFESTYLE_DEFAULT_SCENE;

  const globalBlock = globalContext
    ? `\nGLOBAL PROPERTY DNA (STRICT — apply to this room):\n${globalContext}\nYou MUST ensure visual continuity with all other rooms: same flooring material, same wall treatment, same exterior view through windows, same lighting character. Do NOT invent different materials or exterior scenery.\n`
    : "";

  return `Room: ${roomType} (${roomLabel}). Style: ${style} (${styleLabel}).

${sceneGuide}
${globalBlock}
STRUCTURAL INVENTORY (from prior analysis — DO NOT modify these):
${JSON.stringify(visionData, null, 2)}

Generate 5 LIFESTYLE editing prompts for this ${roomLabel}.

MANDATORY CHECKLIST — every prompt MUST include ALL of these:
✅ Premium furniture with exact material/color/texture (same quality as classic staging)
✅ 1-2 HUMAN FIGURES with full demographic description (age, ethnicity, hair, body type, outfit)
✅ People performing a NATURAL ACTION appropriate to this ${roomType}
✅ Cinematic lighting setup (specify light source, color temperature, shadow direction)
✅ Atmospheric details (steam, reflections, fabric movement, plant life)
✅ Decorative objects on every surface (same richness as classic staging)
✅ NO two prompts may have the same human profile — rotate demographics completely
✅ For rooms with windows/natural light: use visionData.lighting to craft a TWILIGHT SENTENCE (see Rule #3)

LIGHTING DATA FOR THIS ROOM (use this to determine sun direction):
${JSON.stringify((visionData as Record<string, unknown>).lighting || "no lighting data available", null, 2)}

Use the ${styleLabel} design aesthetic for furniture. People's clothing should match the interior style (casual-luxe for modern, warm layers for Scandinavian, eclectic for bohemian, etc).`;
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
  "all doors, windows, sliding glass doors, bay windows, radiators, outlets, light switches, and fixed elements pixel-perfect unchanged,",
  "all glass surfaces fully visible and unobstructed,",
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
