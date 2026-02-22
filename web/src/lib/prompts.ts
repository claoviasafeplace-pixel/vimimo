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

export const STAGING_PROMPT_SYSTEM = `You are an expert at writing image EDITING prompts for Flux Kontext Pro.

You will receive a PHOTO of an empty room. Analyze it carefully: the exact wall colors, floor material, window positions, door locations, ceiling type, lighting conditions, and camera perspective.

Then write 5 EDITING prompts that ONLY add furniture/decor to this exact photo.

CRITICAL ANTI-DISTORTION RULES:
1. CAMERA LOCK: NEVER describe the room itself (walls, floor, windows, ceiling). Flux Kontext Pro already sees the photo — describing structure CAUSES DISTORTION and warping.
2. STRUCTURE FREEZE: Walls, floor, ceiling, windows, doors must remain PIXEL-PERFECT. Never push, move, resize, or modify any structural element.
3. PROPORTIONS: Room dimensions, window sizes, door heights must keep IDENTICAL ratios. Furniture must be proportional to the room.
4. Start every prompt with: "Edit this exact photo, keep camera angle, perspective, and room structure 100% identical. Add [specific furniture] to this room."
5. End every prompt with: "Keep all walls, floor, windows, doors, ceiling unchanged. Photorealistic, exact room proportions, no distortion, camera locked."
6. Reference spatial positions from the photo (e.g., "along the back wall", "in front of the window").
7. Only mention furniture, rugs, artwork, plants, lamps, decorative objects. NO structural changes.
8. Keep each prompt SHORT (2 sentences MAX between the start/end). Longer prompts = more distortion.
9. Generate exactly 5 prompts with DIFFERENT approaches:
   - Prompt 1: MAIN FURNITURE (sofa, bed, table, chairs)
   - Prompt 2: DIFFERENT MAIN FURNITURE layout
   - Prompt 3: DECORATION focus (art, plants, cushions, rugs, curtains)
   - Prompt 4: COMPLETE but MINIMAL setup
   - Prompt 5: LUXURIOUS/FULL setup
   All 5 must keep the SAME design style but vary in density and focus.

Respond in JSON: { "analysis": "Brief 1-line description of what you see", "prompts": ["prompt1", "prompt2", "prompt3", "prompt4", "prompt5"] }
No markdown, ONLY valid JSON.`;

export function stagingPromptUser(
  roomType: string,
  roomLabel: string,
  style: string,
  styleLabel: string,
  visionData: Record<string, unknown>
): string {
  return `Room: ${roomType} (${roomLabel}). Style to apply: ${style} (${styleLabel}).

STRUCTURAL INVENTORY (from prior analysis — DO NOT modify these):
${JSON.stringify(visionData, null, 2)}

Generate 5 editing prompts for this photo. Use the structural inventory to place furniture logically (avoid blocking windows/doors, respect room dimensions).`;
}

export function klingVideoPrompt(style: string, roomType: string): string {
  return `Morph from original empty room to furnished room. KEEP EXACT same room structure, walls, floor, windows, camera angle, perspective, and proportions throughout the entire video. Subtle dolly zoom only, no perspective change. ${style} ${roomType}, photorealistic professional real estate video, smooth furniture appearance, steady camera, natural lighting.`;
}

export const KLING_NEGATIVE_PROMPT =
  "blurry, distorted, low quality, warped walls, warped windows, changed proportions, furniture movement, structural changes, perspective shift, room deformation";
