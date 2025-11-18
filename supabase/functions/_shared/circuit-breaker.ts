/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping requests to failing services
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening circuit
  resetTimeout: number;           // Time in ms before attempting to close circuit
  monitoringPeriod: number;      // Time window in ms for counting failures
  halfOpenMaxAttempts: number;   // Max attempts in half-open state
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 60000,        // 1 minute
  monitoringPeriod: 120000,   // 2 minutes
  halfOpenMaxAttempts: 3,
};

class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private halfOpenAttempts = 0;
  private config: CircuitBreakerConfig;
  private serviceName: string;

  constructor(serviceName: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.serviceName = serviceName;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN') {
      if (Date.now() - (this.lastFailureTime || 0) >= this.config.resetTimeout) {
        console.log(`[CircuitBreaker:${this.serviceName}] Transitioning to HALF_OPEN`);
        this.state = 'HALF_OPEN';
        this.halfOpenAttempts = 0;
      } else {
        throw new Error(`Circuit breaker OPEN for ${this.serviceName}. Service unavailable.`);
      }
    }

    // Check half-open attempt limit
    if (this.state === 'HALF_OPEN' && this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
      console.log(`[CircuitBreaker:${this.serviceName}] Max half-open attempts reached, opening circuit`);
      this.state = 'OPEN';
      this.lastFailureTime = Date.now();
      throw new Error(`Circuit breaker OPEN for ${this.serviceName}. Service unavailable.`);
    }

    try {
      if (this.state === 'HALF_OPEN') {
        this.halfOpenAttempts++;
      }

      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.successCount++;
    this.lastSuccessTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      console.log(`[CircuitBreaker:${this.serviceName}] Success in HALF_OPEN, closing circuit`);
      this.state = 'CLOSED';
      this.failureCount = 0;
      this.halfOpenAttempts = 0;
    } else if (this.state === 'CLOSED') {
      // Reset failure count if monitoring period has passed
      if (this.lastFailureTime && Date.now() - this.lastFailureTime > this.config.monitoringPeriod) {
        this.failureCount = 0;
      }
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      console.log(`[CircuitBreaker:${this.serviceName}] Failure in HALF_OPEN, opening circuit`);
      this.state = 'OPEN';
    } else if (this.state === 'CLOSED' && this.failureCount >= this.config.failureThreshold) {
      console.log(`[CircuitBreaker:${this.serviceName}] Failure threshold reached, opening circuit`);
      this.state = 'OPEN';
    }
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.halfOpenAttempts = 0;
  }
}

// Global circuit breaker registry
const circuitBreakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(
  serviceName: string,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, new CircuitBreaker(serviceName, config));
  }
  return circuitBreakers.get(serviceName)!;
}

export function getAllCircuitBreakerStats(): Record<string, CircuitBreakerStats> {
  const stats: Record<string, CircuitBreakerStats> = {};
  circuitBreakers.forEach((breaker, name) => {
    stats[name] = breaker.getStats();
  });
  return stats;
}
