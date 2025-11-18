/**
 * Graceful Degradation Utilities
 * Handle service failures gracefully with fallbacks
 */

export interface FallbackConfig<T> {
  fallbackValue?: T;
  fallbackFn?: () => Promise<T> | T;
  cacheKey?: string;
  cacheDuration?: number; // in ms
  onError?: (error: Error) => void;
}

// Simple in-memory cache for fallback data
const fallbackCache = new Map<string, { value: any; expires: number }>();

export async function withFallback<T>(
  fn: () => Promise<T>,
  config: FallbackConfig<T>
): Promise<T> {
  try {
    const result = await fn();
    
    // Cache successful result if cache key provided
    if (config.cacheKey && config.cacheDuration) {
      fallbackCache.set(config.cacheKey, {
        value: result,
        expires: Date.now() + config.cacheDuration,
      });
    }
    
    return result;
  } catch (error) {
    console.warn('[GracefulDegradation] Primary function failed, using fallback', error);
    
    if (config.onError) {
      config.onError(error instanceof Error ? error : new Error(String(error)));
    }
    
    // Try cached value first
    if (config.cacheKey) {
      const cached = fallbackCache.get(config.cacheKey);
      if (cached && cached.expires > Date.now()) {
        console.log('[GracefulDegradation] Using cached fallback value');
        return cached.value;
      }
    }
    
    // Try fallback function
    if (config.fallbackFn) {
      console.log('[GracefulDegradation] Using fallback function');
      return await config.fallbackFn();
    }
    
    // Use static fallback value
    if (config.fallbackValue !== undefined) {
      console.log('[GracefulDegradation] Using static fallback value');
      return config.fallbackValue;
    }
    
    // No fallback available, rethrow
    throw error;
  }
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors?: (error: Error) => boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error;
  let delay = finalConfig.initialDelay;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if error is retryable
      if (finalConfig.retryableErrors && !finalConfig.retryableErrors(lastError)) {
        throw lastError;
      }
      
      // Don't retry on last attempt
      if (attempt === finalConfig.maxRetries) {
        break;
      }
      
      console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, lastError.message);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * finalConfig.backoffMultiplier, finalConfig.maxDelay);
    }
  }

  throw lastError!;
}

export interface TimeoutConfig {
  timeoutMs: number;
  timeoutError?: string;
}

export async function withTimeout<T>(
  fn: () => Promise<T>,
  config: TimeoutConfig
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(config.timeoutError || `Operation timed out after ${config.timeoutMs}ms`)),
        config.timeoutMs
      )
    ),
  ]);
}

export function clearFallbackCache(key?: string) {
  if (key) {
    fallbackCache.delete(key);
  } else {
    fallbackCache.clear();
  }
}
