// @ts-nocheck -- TODO: fix strictNullChecks errors
/**
 * Client-side Rate Limiting Handler
 * Phase 2: Security & Ingress - Layer 3 (API Gateway)
 */

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: string;
  retryAfter?: number;
}

export interface RateLimitError extends Error {
  rateLimitInfo?: RateLimitInfo;
  retryAfter?: number;
}

/**
 * Parse rate limit headers from response
 */
export function parseRateLimitHeaders(response: Response): RateLimitInfo | null {
  const limit = response.headers.get('X-RateLimit-Limit');
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const reset = response.headers.get('X-RateLimit-Reset');
  const retryAfter = response.headers.get('Retry-After');

  if (!limit || !remaining || !reset) {
    return null;
  }

  return {
    limit: parseInt(limit),
    remaining: parseInt(remaining),
    reset,
    retryAfter: retryAfter ? parseInt(retryAfter) : undefined,
  };
}

/**
 * Exponential backoff retry logic
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if not a rate limit error
      if (error.status !== 429) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = error.retryAfter
        ? error.retryAfter * 1000
        : baseDelay * Math.pow(2, attempt);


      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Check if response is rate limited
 */
export function isRateLimited(response: Response): boolean {
  return response.status === 429;
}

/**
 * Create a rate limit error from response
 */
export async function createRateLimitError(response: Response): Promise<RateLimitError> {
  const data = await response.json().catch(() => ({}));
  const rateLimitInfo = parseRateLimitHeaders(response);

  const error = new Error(data.error || 'Rate limit exceeded') as RateLimitError;
  error.rateLimitInfo = rateLimitInfo;
  error.retryAfter = data.retryAfter || rateLimitInfo?.retryAfter;

  return error;
}

/**
 * Wrapper for fetch with rate limit handling
 */
export async function fetchWithRateLimit(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const response = await fetch(url, options);

  if (isRateLimited(response)) {
    throw await createRateLimitError(response);
  }

  return response;
}

/**
 * React hook for rate limit state management
 */
export interface UseRateLimitState {
  isRateLimited: boolean;
  rateLimitInfo: RateLimitInfo | null;
  retryAfter: number | null;
}

/**
 * Local storage key for rate limit state
 */
const RATE_LIMIT_STORAGE_KEY = 'rateLimitState';

/**
 * Get rate limit state from storage
 */
export function getRateLimitState(): UseRateLimitState {
  try {
    const stored = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (stored) {
      const state = JSON.parse(stored);
      // Check if rate limit has expired
      if (state.rateLimitInfo?.reset) {
        const resetTime = new Date(state.rateLimitInfo.reset);
        if (resetTime < new Date()) {
          clearRateLimitState();
          return {
            isRateLimited: false,
            rateLimitInfo: null,
            retryAfter: null,
          };
        }
      }
      return state;
    }
  } catch (error) {
    console.error('Error reading rate limit state:', error);
  }

  return {
    isRateLimited: false,
    rateLimitInfo: null,
    retryAfter: null,
  };
}

/**
 * Save rate limit state to storage
 */
export function saveRateLimitState(state: UseRateLimitState): void {
  try {
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving rate limit state:', error);
  }
}

/**
 * Clear rate limit state from storage
 */
export function clearRateLimitState(): void {
  try {
    localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing rate limit state:', error);
  }
}
