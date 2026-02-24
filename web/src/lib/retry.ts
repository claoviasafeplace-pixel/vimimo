// Exponential backoff retry utility with jitter

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatusCodes: number[];
}

export const OPENAI_RETRY: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 2000,
  maxDelayMs: 8000,
  retryableStatusCodes: [429, 500, 502, 503],
};

export const REPLICATE_RETRY: RetryOptions = {
  maxRetries: 2,
  baseDelayMs: 1000,
  maxDelayMs: 3000,
  retryableStatusCodes: [429, 500, 502, 503],
};

export const REMOTION_RETRY: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 5000,
  maxDelayMs: 20000,
  retryableStatusCodes: [429, 500, 502, 503],
};

export function isRetryableError(err: unknown, statusCodes: number[]): boolean {
  if (!err || typeof err !== "object") return false;

  // OpenAI SDK errors
  const status =
    (err as { status?: number }).status ??
    (err as { statusCode?: number }).statusCode ??
    (err as { response?: { status?: number } }).response?.status;

  if (status === 402) return false; // Never retry 402 — quota exhausted
  if (status && statusCodes.includes(status)) return true;

  // Network errors
  const message = (err as { message?: string }).message ?? "";
  if (
    message.includes("ECONNRESET") ||
    message.includes("ETIMEDOUT") ||
    message.includes("ECONNREFUSED") ||
    message.includes("fetch failed")
  ) {
    return true;
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getDelay(attempt: number, baseMs: number, maxMs: number): number {
  const exponential = baseMs * Math.pow(2, attempt);
  const jitter = Math.random() * baseMs;
  return Math.min(exponential + jitter, maxMs);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt === opts.maxRetries) break;
      if (!isRetryableError(err, opts.retryableStatusCodes)) break;

      const delay = getDelay(attempt, opts.baseDelayMs, opts.maxDelayMs);
      console.warn(
        `[retry] Attempt ${attempt + 1}/${opts.maxRetries} failed, retrying in ${Math.round(delay)}ms`,
        err instanceof Error ? err.message : err,
      );
      await sleep(delay);
    }
  }

  throw lastError;
}
