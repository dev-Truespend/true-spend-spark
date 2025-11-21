/**
 * Retry middleware with exponential backoff for resilient API calls
 */

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  timeoutMs: number;
  retryableErrors: string[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  timeoutMs: 30000,
  retryableErrors: [
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ERR_NETWORK',
    'rate_limit_exceeded',
    'service_unavailable',
    '503',
    '429',
  ],
};

interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
  totalTime: number;
}

/**
 * Check if an error is retryable based on configuration
 */
function isRetryableError(error: any, config: RetryConfig): boolean {
  const errorString = error?.message || error?.code || String(error);
  return config.retryableErrors.some(retryable => 
    errorString.toLowerCase().includes(retryable.toLowerCase())
  );
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = Math.min(
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelayMs
  );
  // Add jitter (±25% randomization) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(exponentialDelay + jitter);
}

/**
 * Execute function with timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const startTime = Date.now();
  let lastError: any;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      console.log(`[Retry] Attempt ${attempt + 1}/${finalConfig.maxRetries + 1}`);
      
      const result = await withTimeout(fn(), finalConfig.timeoutMs);
      
      const totalTime = Date.now() - startTime;
      console.log(`[Retry] Success after ${attempt + 1} attempt(s) in ${totalTime}ms`);
      
      return {
        success: true,
        data: result,
        attempts: attempt + 1,
        totalTime,
      };
    } catch (error) {
      lastError = error;
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      console.log(`[Retry] Attempt ${attempt + 1} failed:`, errorMsg);

      // Check if we should retry
      if (attempt < finalConfig.maxRetries && isRetryableError(error, finalConfig)) {
        const delay = calculateDelay(attempt, finalConfig);
        console.log(`[Retry] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Max retries reached or non-retryable error
        const totalTime = Date.now() - startTime;
        console.log(`[Retry] All attempts failed after ${totalTime}ms`);
        
        return {
          success: false,
          error: errorMsg,
          attempts: attempt + 1,
          totalTime,
        };
      }
    }
  }

  // This should never be reached, but TypeScript needs it
  return {
    success: false,
    error: lastError instanceof Error ? lastError.message : 'Unknown error',
    attempts: finalConfig.maxRetries + 1,
    totalTime: Date.now() - startTime,
  };
}

/**
 * Specialized retry config for Google Vision API
 */
export const VISION_RETRY_CONFIG: Partial<RetryConfig> = {
  maxRetries: 2,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  timeoutMs: 15000,
};

/**
 * Specialized retry config for database operations
 */
export const DB_RETRY_CONFIG: Partial<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 2000,
  timeoutMs: 5000,
};
