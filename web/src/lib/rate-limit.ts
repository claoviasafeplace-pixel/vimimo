/**
 * In-memory rate limiter for serverless.
 * Provides per-IP burst protection within a single instance.
 * For full distributed rate limiting, upgrade to Upstash Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 60s
let cleanupScheduled = false;
function scheduleCleanup() {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  setTimeout(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt < now) store.delete(key);
    }
    cleanupScheduled = false;
  }, 60_000);
}

export interface RateLimitConfig {
  /** Max requests in the window */
  max: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export const RATE_LIMITS = {
  /** Project creation: 5 per minute */
  PROJECT_CREATE: { max: 5, windowMs: 60_000 },
  /** Checkout: 3 per minute */
  CHECKOUT: { max: 3, windowMs: 60_000 },
  /** Upload: 10 per minute */
  UPLOAD: { max: 10, windowMs: 60_000 },
  /** Description generation: 5 per minute */
  DESCRIPTION: { max: 5, windowMs: 60_000 },
  /** AI pipeline actions (generate, triage, montage): 3 per minute */
  AI_PIPELINE: { max: 3, windowMs: 60_000 },
  /** Replicate polling: 30 per minute */
  REPLICATE_POLL: { max: 30, windowMs: 60_000 },
  /** General API: 30 per minute */
  GENERAL: { max: 30, windowMs: 60_000 },
} as const;

/**
 * Check rate limit. Returns null if allowed, or a Response if blocked.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { limited: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = identifier;

  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    scheduleCleanup();
    return { limited: false, remaining: config.max - 1, resetAt: now + config.windowMs };
  }

  entry.count++;

  if (entry.count > config.max) {
    return { limited: true, remaining: 0, resetAt: entry.resetAt };
  }

  return { limited: false, remaining: config.max - entry.count, resetAt: entry.resetAt };
}

/**
 * Extract IP from request for rate limiting.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
