// Timeline constants for SocialMontage (vertical 1080x1920, fast cuts)

export const SOCIAL_FPS = 30;
export const SOCIAL_HOOK_FRAMES = 45; // 1.5s hook text
export const SOCIAL_ROOM_FRAMES = 40; // ~1.3s per room (fast cuts)
export const SOCIAL_CUT_FRAMES = 8; // 0.27s cut transition
export const SOCIAL_OUTRO_FRAMES = 45; // 1.5s outro

/**
 * Calculate total duration for N rooms.
 * hook + N×room + (N-1)×cut + outro
 */
export function calculateSocialDuration(roomCount: number): number {
  return (
    SOCIAL_HOOK_FRAMES +
    roomCount * SOCIAL_ROOM_FRAMES +
    Math.max(0, roomCount - 1) * SOCIAL_CUT_FRAMES +
    SOCIAL_OUTRO_FRAMES
  );
}

/**
 * Get the start frame for a specific room.
 */
export function getSocialRoomStart(index: number): number {
  return SOCIAL_HOOK_FRAMES + index * (SOCIAL_ROOM_FRAMES + SOCIAL_CUT_FRAMES);
}

/**
 * Get the start frame for the outro.
 */
export function getSocialOutroStart(roomCount: number): number {
  return (
    SOCIAL_HOOK_FRAMES +
    roomCount * SOCIAL_ROOM_FRAMES +
    Math.max(0, roomCount - 1) * SOCIAL_CUT_FRAMES
  );
}
