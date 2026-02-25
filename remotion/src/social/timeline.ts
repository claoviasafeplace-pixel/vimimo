// Timeline constants for SocialMontage (vertical 1080x1920, fast cuts)
// Beat-synced: 120 BPM = 1 beat every 0.5s = 15 frames at 30fps.
// All segments are multiples of 15 frames so transitions land on beats.

export const SOCIAL_FPS = 30;
export const SOCIAL_BPM = 120;
export const SOCIAL_BEAT_FRAMES = 15; // 1 beat at 120 BPM / 30fps
export const SOCIAL_HOOK_FRAMES = 45; // 3 beats (1.5s) hook text
export const SOCIAL_ROOM_FRAMES = 60; // 4 beats (2s) per room: original → cleaned → video → staged
export const SOCIAL_CUT_FRAMES = 15; // 1 beat (0.5s) flash cut
export const SOCIAL_OUTRO_FRAMES = 45; // 3 beats (1.5s) outro

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
