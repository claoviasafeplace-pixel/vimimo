// Timeline constants and helpers for StudioMontage

export const FPS = 30;
export const INTRO_FRAMES = 120; // 4s
export const ROOM_FRAMES = 150; // 5s
export const TRANSITION_FRAMES = 40; // 1.3s
export const OUTRO_FRAMES = 90; // 3s

/**
 * Calculate total duration in frames for N rooms.
 * totalFrames = INTRO + N×ROOM + (N-1)×TRANSITION + OUTRO
 */
export function calculateStudioDuration(roomCount: number): number {
  return (
    INTRO_FRAMES +
    roomCount * ROOM_FRAMES +
    (roomCount - 1) * TRANSITION_FRAMES +
    OUTRO_FRAMES
  );
}

/**
 * Get the start frame for a specific room segment.
 * Each room starts after intro + previous rooms + previous transitions.
 */
export function getRoomStart(index: number): number {
  return INTRO_FRAMES + index * (ROOM_FRAMES + TRANSITION_FRAMES);
}

/**
 * Get the start frame for a transition between rooms.
 * Transition i sits between room i and room i+1.
 */
export function getTransitionStart(index: number): number {
  return getRoomStart(index) + ROOM_FRAMES;
}

/**
 * Get the start frame for the outro.
 */
export function getOutroStart(roomCount: number): number {
  return (
    INTRO_FRAMES +
    roomCount * ROOM_FRAMES +
    (roomCount - 1) * TRANSITION_FRAMES
  );
}
