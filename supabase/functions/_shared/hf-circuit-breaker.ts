/**
 * Circuit breaker for Hugging Face services
 * Prevents cascading failures and provides automatic fallback
 */

interface CircuitState {
  status: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  nextRetryTime: number | null;
}

const circuits = new Map<string, CircuitState>();

const CIRCUIT_CONFIG = {
  failureThreshold: 5, // Open circuit after 5 failures
  resetTimeout: 60000, // Try again after 1 minute
  halfOpenRetries: 3, // Allow 3 test requests in half-open state
};

/**
 * Get or initialize circuit state for a service
 */
function getCircuit(serviceName: string): CircuitState {
  if (!circuits.has(serviceName)) {
    circuits.set(serviceName, {
      status: 'closed',
      failureCount: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      nextRetryTime: null,
    });
  }
  return circuits.get(serviceName)!;
}

/**
 * Check if circuit allows request
 */
export function canMakeRequest(serviceName: string): boolean {
  const circuit = getCircuit(serviceName);
  const now = Date.now();

  if (circuit.status === 'closed') {
    return true;
  }

  if (circuit.status === 'open') {
    // Check if we should transition to half-open
    if (circuit.nextRetryTime && now >= circuit.nextRetryTime) {
      circuit.status = 'half-open';
      circuit.failureCount = 0;
      console.log(`[Circuit Breaker] ${serviceName}: OPEN -> HALF-OPEN`);
      return true;
    }
    return false;
  }

  // half-open state: allow limited requests
  return circuit.failureCount < CIRCUIT_CONFIG.halfOpenRetries;
}

/**
 * Record successful request
 */
export function recordSuccess(serviceName: string): void {
  const circuit = getCircuit(serviceName);
  const now = Date.now();

  circuit.lastSuccessTime = now;
  circuit.failureCount = 0;

  if (circuit.status === 'half-open') {
    circuit.status = 'closed';
    circuit.nextRetryTime = null;
    console.log(`[Circuit Breaker] ${serviceName}: HALF-OPEN -> CLOSED`);
  }
}

/**
 * Record failed request
 */
export function recordFailure(serviceName: string, error?: string): void {
  const circuit = getCircuit(serviceName);
  const now = Date.now();

  circuit.failureCount++;
  circuit.lastFailureTime = now;

  console.log(
    `[Circuit Breaker] ${serviceName}: Failure ${circuit.failureCount}/${CIRCUIT_CONFIG.failureThreshold}`,
    error ? `- ${error}` : ''
  );

  if (circuit.status === 'half-open') {
    // Failed during test - go back to open
    circuit.status = 'open';
    circuit.nextRetryTime = now + CIRCUIT_CONFIG.resetTimeout;
    console.log(`[Circuit Breaker] ${serviceName}: HALF-OPEN -> OPEN`);
    return;
  }

  if (circuit.failureCount >= CIRCUIT_CONFIG.failureThreshold) {
    circuit.status = 'open';
    circuit.nextRetryTime = now + CIRCUIT_CONFIG.resetTimeout;
    console.log(`[Circuit Breaker] ${serviceName}: CLOSED -> OPEN (threshold reached)`);
  }
}

/**
 * Get circuit status for monitoring
 */
export function getCircuitStatus(serviceName: string): {
  status: string;
  failureCount: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  availableIn: number | null;
} {
  const circuit = getCircuit(serviceName);
  const now = Date.now();

  let availableIn = null;
  if (circuit.status === 'open' && circuit.nextRetryTime) {
    availableIn = Math.max(0, circuit.nextRetryTime - now);
  }

  return {
    status: circuit.status,
    failureCount: circuit.failureCount,
    lastFailureTime: circuit.lastFailureTime,
    lastSuccessTime: circuit.lastSuccessTime,
    availableIn,
  };
}

/**
 * Reset circuit (for manual override or testing)
 */
export function resetCircuit(serviceName: string): void {
  circuits.set(serviceName, {
    status: 'closed',
    failureCount: 0,
    lastFailureTime: null,
    lastSuccessTime: null,
    nextRetryTime: null,
  });
  console.log(`[Circuit Breaker] ${serviceName}: RESET`);
}

/**
 * Get all circuit statuses
 */
export function getAllCircuitStatuses(): Record<string, ReturnType<typeof getCircuitStatus>> {
  const statuses: Record<string, ReturnType<typeof getCircuitStatus>> = {};
  for (const serviceName of circuits.keys()) {
    statuses[serviceName] = getCircuitStatus(serviceName);
  }
  return statuses;
}
