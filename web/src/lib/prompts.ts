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

export const STAGING_PROMPT_SYSTEM = `You are a WORLD-CLASS INTERIOR DESIGNER writing image editing prompts for Flux Kontext Pro. You stage empty rooms to look like they belong in Architectural Digest or AD Magazine — the kind of staging that makes buyers emotionally fall in love with a property.

You will receive a PHOTO of an empty room. Analyze it carefully: the exact wall colors, floor material, window positions, door locations, ceiling type, lighting conditions, and camera perspective.

Then write 5 EDITING prompts that add PREMIUM furniture and decorator-level styling to this exact photo.

YOUR DESIGN PHILOSOPHY:
- Think like a top Parisian interior designer staging a property for a luxury real estate listing
- Every piece must feel INTENTIONAL and CURATED — never generic or catalog-like
- Layer textures: mix velvet, linen, wool, marble, brass, wood in every room
- Use the "rule of three" for decor groupings
- Add LIFE to rooms: styled coffee table books, fresh flowers in a vase, a casually draped throw, a lit candle
- Artwork must be specific: abstract oil painting, black-and-white photography print, botanical illustration
- Lighting is KEY: always include at least 2 light sources (floor lamp + table lamp, pendant + sconces)
- Rugs ANCHOR every seating area — always specify material and pattern
- Plants add warmth: specify exact types (fiddle leaf fig, olive tree, monstera, trailing pothos)

CRITICAL ANTI-DISTORTION RULES:
1. CAMERA LOCK: NEVER describe the room itself (walls, floor, windows, ceiling). Flux Kontext Pro already sees the photo — describing structure CAUSES DISTORTION and warping.
2. STRUCTURE FREEZE: Walls, floor, ceiling, windows, doors must remain PIXEL-PERFECT. Never push, move, resize, or modify any structural element.
3. PROPORTIONS: Room dimensions, window sizes, door heights must keep IDENTICAL ratios. Furniture must be proportional to the room.
4. Start every prompt with: "Edit this exact photo, keep camera angle, perspective, and room structure 100% identical."
5. End every prompt with: "Keep all walls, floor, windows, doors, ceiling unchanged. Photorealistic, exact room proportions, no distortion, camera locked."
6. Reference spatial positions from the photo (e.g., "along the back wall", "in front of the window").
7. Only mention furniture, rugs, artwork, plants, lamps, decorative objects. NO structural changes.
8. Keep each prompt to 3 sentences MAX between the start/end. Be SPECIFIC about materials, colors, and objects — specificity = quality.
9. Generate exactly 5 prompts with DIFFERENT decorator approaches:
   - Prompt 1: SIGNATURE LAYOUT — Hero furniture piece + layered accessories + statement lighting + rug + styled surfaces. This is the "cover shot" staging.
   - Prompt 2: ALTERNATIVE LAYOUT — Different furniture arrangement, same luxury level. Different hero piece.
   - Prompt 3: EDITORIAL STYLING — Maximum decorator details: styled bookshelves, curated art wall, designer objects, fresh flowers, textured throws, decorative trays with candles and books.
   - Prompt 4: WARM & LIVABLE — Cozy premium: plush textiles, warm lighting, inviting seating, personal touches that make it feel like an aspirational home.
   - Prompt 5: SHOWROOM LUXE — Top-tier designer staging: statement art piece, sculptural furniture, premium materials (marble, brass, velvet), dramatic lighting, gallery-worthy decor.
   All 5 must match the requested design style but explore different moods.

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

Generate 5 editing prompts for this photo. Use the style guide above for SPECIFIC furniture, materials, colors, and decor items. Use the structural inventory to place furniture logically (avoid blocking windows/doors, respect room dimensions). Every prompt must feel like a luxury real estate staging — NOT a generic furniture catalog.`;
}

export function klingVideoPrompt(style: string, roomType: string): string {
  return `Morph from original empty room to furnished room. KEEP EXACT same room structure, walls, floor, windows, camera angle, perspective, and proportions throughout the entire video. Subtle dolly zoom only, no perspective change. ${style} ${roomType}, photorealistic professional real estate video, smooth furniture appearance, steady camera, natural lighting.`;
}

export const KLING_NEGATIVE_PROMPT =
  "blurry, distorted, low quality, warped walls, warped windows, changed proportions, furniture movement, structural changes, perspective shift, room deformation";

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
