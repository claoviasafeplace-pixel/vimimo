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

DIRECTIONAL LIGHTING MASTERY (for rooms with natural light):
If the room has visible windows, large glass doors, or is an exterior/balcony/terrace, you MUST use the lighting data from the STRUCTURAL INVENTORY (visionData.lighting) to craft physically accurate lighting. Apply this rule:
- Read the "lightDirection" or "orientation" field (e.g., "south", "west", "east").
- For Prompt 1 (GOLDEN HOUR) and Prompt 5 (SHOWROOM LUXE), add a TWILIGHT LIGHTING SENTENCE using this exact formula:
  "Change the scene to early twilight. The sun appears to the [LEFT/RIGHT/CENTER] side of the frame based on original window orientation, casting warm-orange highlights on furniture surfaces and long gentle shadows across the floor. Well-exposed sky visible through windows, balanced interior-exterior exposure."
- Determine LEFT vs RIGHT: if light comes from the left side of the photo, sun is LEFT. If from the right, sun is RIGHT. If the photo faces the windows directly, sun is CENTER-BEHIND.
- For interior rooms WITHOUT visible windows or natural light (bathrooms, hallways, basements), do NOT add twilight — use warm artificial lighting instead.
- NEVER invent a light direction. ONLY use what visionData.lighting tells you.

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
✅ For Prompt 1 and Prompt 5: if the room has windows/natural light, add a TWILIGHT SENTENCE (see Directional Lighting rules)

LIGHTING DATA FOR THIS ROOM (use this for sun direction in twilight prompts):
${JSON.stringify(visionData.lighting || "no lighting data available", null, 2)}

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
  // Style A — Slow cinematic zoom-out revealing the assembly
  {
    id: "slow_zoom_out",
    camera: [
      "Shot on Canon EOS R5 at 14mm f/2.8 ultra-wide lens,",
      "very slow imperceptible cinematic zoom-out from room center,",
      "locked tripod, zero shake, zero rotation,",
      "camera stays perfectly still to let the magical furniture assembly be the star,",
      "wide architectural framing showing the entire room volume.",
    ].join(" "),
  },
  // Style B — Subtle push-in while objects fly into place
  {
    id: "gentle_push_in",
    camera: [
      "Shot on iPhone 15 Pro at 0.5x ultra-wide lens, 13mm equivalent,",
      "extremely slow gentle push-in from doorway threshold,",
      "90-degree straight-on symmetrical architectural perspective,",
      "near-static camera with barely perceptible forward drift,",
      "the room fills itself while the camera barely moves.",
    ].join(" "),
  },
  // Style C — Static locked shot (pure VFX focus)
  {
    id: "static_locked",
    camera: [
      "Shot on Canon EOS R5 at 14mm f/2.8 ultra-wide lens,",
      "completely static locked-off camera on tripod,",
      "zero camera movement throughout entire sequence,",
      "45-degree corner composition showing two walls and full floor,",
      "all visual energy comes from the magical object animation, not camera motion.",
    ].join(" "),
  },
] as const;

/**
 * Magical furniture assembly animation directives.
 * 3 assembly styles rotated randomly per room for variety.
 * Kling v2.1 responds well to explicit VFX vocabulary.
 */
const ASSEMBLY_STYLES = [
  // Objects fly in from above and land in place
  {
    id: "fly_in",
    directive: [
      "VFX magical stop-motion buildup animation:",
      "furniture pieces fly in from above the frame and land precisely into their final positions,",
      "sofa drops in with a soft bounce, table slides into place from the side,",
      "cushions and decorative objects pop into existence one by one,",
      "rugs unfurl and flatten magically onto the floor,",
      "curtains cascade down from the rod like flowing water,",
      "lamps materialize with a warm glow igniting as they appear,",
      "plants grow rapidly from pots that slide in from off-screen.",
    ].join(" "),
  },
  // Objects slide in from all directions along the floor
  {
    id: "slide_assemble",
    directive: [
      "VFX hyper-fast room assembly animation:",
      "all furniture slides into the room simultaneously from every direction,",
      "sofa glides in smoothly from the left wall, coffee table from the right,",
      "chairs spin once and lock into position at the table,",
      "rug rolls out across the floor in a fast satisfying motion,",
      "shelves assemble piece by piece like a time-lapse construction,",
      "books, candles, and decorative objects pop in rapid-fire sequence,",
      "final piece clicks into place with a satisfying visual snap.",
    ].join(" "),
  },
  // Objects materialize with a cinematic particle/glow effect
  {
    id: "materialize",
    directive: [
      "VFX cinematic materialization animation:",
      "furniture assembles from thin air with a subtle golden particle shimmer,",
      "each piece fades in from transparent to solid, largest pieces first,",
      "sofa materializes in a warm glow, then table, then smaller decor,",
      "objects appear in a choreographed cascade from back of room to foreground,",
      "decorative items pop in like stop-motion with satisfying micro-pauses,",
      "final arrangement settles with a soft ambient light bloom,",
      "the empty room transforms into a luxury interior in one magical sequence.",
    ].join(" "),
  },
] as const;

/**
 * Quality suffix for social_reel — hyper-design ultra-luxury + VFX coherence.
 */
export const SOCIAL_QUALITY_SUFFIX = [
  "4K cinematic vertical video, viral real estate VFX content,",
  "hyper-realistic luxury interior design, bespoke designer furniture,",
  "Architectural Digest editorial quality, ultra-premium materials visible,",
  "ultra-wide 14mm rectilinear lens rendering, zero barrel distortion,",
  "strict temporal consistency, frame-to-frame VFX coherence,",
  "walls, floor, windows, doors structurally rigid and unchanged in every frame,",
  "each piece of furniture has weight, shadow, and physical presence when it lands,",
  "natural indoor lighting with volumetric rays and consistent shadows,",
  "cinematic color grading, warm luxurious tones, smooth 24fps motion.",
].join(" ");

/**
 * Negative prompt for social_reel — allows magical object animation,
 * blocks structural deformation and cheap VFX artifacts.
 */
export const SOCIAL_NEGATIVE_PROMPT = [
  "blurry, out of focus, low quality, low resolution, grainy,",
  "warped walls, warped floor, warped windows, bent doorframes, curved ceiling,",
  "changed room proportions, room shape shift, structural deformation,",
  "cheap CGI, plastic looking furniture, unrealistic materials,",
  "fisheye distortion, barrel distortion, extreme lens flare,",
  "flickering lights, inconsistent shadows, temporal artifacts,",
  "shaky camera, handheld shake, rolling shutter,",
  "text, watermark, logo, signature.",
].join(" ");

/**
 * Build the social video prompt with:
 * 1. A randomly selected CAMERA style (near-static to focus on VFX)
 * 2. A randomly selected ASSEMBLY style (fly-in, slide, materialize)
 * Logs both selections for debugging.
 */
export function klingSocialVideoPrompt(style: string, roomType: string): string {
  const movement = SOCIAL_CAMERA_MOVEMENTS[
    Math.floor(Math.random() * SOCIAL_CAMERA_MOVEMENTS.length)
  ];
  const assembly = ASSEMBLY_STYLES[
    Math.floor(Math.random() * ASSEMBLY_STYLES.length)
  ];
  console.log(`[PROMPT] Social camera: ${movement.id} | assembly: ${assembly.id} | room: ${roomType}`);

  return [
    movement.camera,
    assembly.directive,
    `Magical transformation of empty ${roomType} into a stunning hyper-designed ${style} ${roomType}.`,
    "Room structure, walls, floor, ceiling, windows, and doors remain PERFECTLY IDENTICAL and unmoved in every frame.",
    "Only the furniture and decor animate — the architecture is a rigid stage.",
    SOCIAL_QUALITY_SUFFIX,
  ].join(" ");
}

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

ANTI-DISTORTION RULES (same as classic staging — HIGHEST PRIORITY):
1. NEVER describe the room structure. Only add furniture, people, lighting, and decor.
2. Walls, floor, ceiling, windows, doors remain PIXEL-PERFECT unchanged.
3. ALL furniture must obey gravity. People must cast shadows consistent with lighting.
4. Spatial coherence: people must fit naturally in the room's proportions.

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
): string {
  const sceneGuide = LIFESTYLE_SCENES[roomType] || LIFESTYLE_DEFAULT_SCENE;

  return `Room: ${roomType} (${roomLabel}). Style: ${style} (${styleLabel}).

${sceneGuide}

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
