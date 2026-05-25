/**
 * Performance Monitoring System
 * Tracks and reports on critical operation timings
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private readonly maxMetricsPerKey = 1000; // Keep last 1000 measurements per metric

  /**
   * Start a performance measurement
   */
  startMeasure(name: string): void {
    performance.mark(`${name}-start`);
  }

  /**
   * End a performance measurement and record it
   */
  endMeasure(name: string): number {
    try {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);

      const entries = performance.getEntriesByName(name, 'measure');
      if (entries.length === 0) return 0;

      const measure = entries[entries.length - 1];
      const duration = measure.duration;

      this.recordMetric(name, duration);

      // Clean up performance entries
      performance.clearMarks(`${name}-start`);
      performance.clearMarks(`${name}-end`);
      performance.clearMeasures(name);

      return duration;
    } catch (error) {
      console.error(`[PerformanceMonitor] Failed to measure ${name}:`, error);
      return 0;
    }
  }

  /**
   * Record a metric value
   */
  private recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(value);

    // Keep only last N measurements to prevent memory issues
    if (values.length > this.maxMetricsPerKey) {
      values.shift();
    }
  }

  /**
   * Get statistics for a metric
   */
  getMetrics(name: string) {
    const values = this.metrics.get(name) || [];
    
    if (values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      avg: sum / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: this.percentile(sorted, 0.5),
      p75: this.percentile(sorted, 0.75),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
    };
  }

  /**
   * Get all available metrics
   */
  getAllMetrics(): Record<string, ReturnType<typeof this.getMetrics>> {
    const result: Record<string, ReturnType<typeof this.getMetrics>> = {};
    
    for (const [name] of this.metrics) {
      result[name] = this.getMetrics(name);
    }

    return result;
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;
    
    const index = Math.ceil(sortedValues.length * p) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * Clear all metrics
   */
  clearMetrics(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    const allMetrics = this.getAllMetrics();
    return JSON.stringify(allMetrics, null, 2);
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Convenience wrapper for measuring async operations
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  performanceMonitor.startMeasure(name);
  try {
    const result = await fn();
    return result;
  } finally {
    const duration = performanceMonitor.endMeasure(name);
    if (import.meta.env.DEV) {
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    }
  }
}

/**
 * Convenience wrapper for measuring sync operations
 */
export function measureSync<T>(name: string, fn: () => T): T {
  performanceMonitor.startMeasure(name);
  try {
    return fn();
  } finally {
    const duration = performanceMonitor.endMeasure(name);
    if (import.meta.env.DEV) {
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    }
  }
}
