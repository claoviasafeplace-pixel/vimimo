// Custom easing functions for Studio Montage animations

/** Attempt to mimic a spring-like ease with a slight overshoot */
export function springEase(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4);
}

/** Smooth ease-out cubic */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Smooth ease-in-out cubic */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Clamp a value between 0 and 1 */
export function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

/** Map a frame range to 0-1 progress, clamped */
export function progress(frame: number, start: number, end: number): number {
  return clamp01((frame - start) / (end - start));
}
