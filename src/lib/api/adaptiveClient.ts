// Adaptive Client - Network-aware request handling
import { NetworkQuality } from '@/hooks/useNetworkQuality';

export interface AdaptiveConfig {
  imageQuality: 'high' | 'medium' | 'low';
  shouldBatch: boolean;
  requestTimeout: number;
  maxConcurrent: number;
  retryDelay: number;
}

export class AdaptiveClient {
  private networkQuality: NetworkQuality;

  constructor(networkQuality: NetworkQuality) {
    this.networkQuality = networkQuality;
  }

  /**
   * Get adaptive configuration based on network quality
   */
  getConfig(): AdaptiveConfig {
    switch (this.networkQuality) {
      case 'excellent':
        return {
          imageQuality: 'high',
          shouldBatch: false,
          requestTimeout: 10000, // 10 seconds
          maxConcurrent: 6,
          retryDelay: 1000,
        };

      case 'good':
        return {
          imageQuality: 'high',
          shouldBatch: false,
          requestTimeout: 15000, // 15 seconds
          maxConcurrent: 4,
          retryDelay: 2000,
        };

      case 'fair':
        return {
          imageQuality: 'medium',
          shouldBatch: true,
          requestTimeout: 30000, // 30 seconds
          maxConcurrent: 2,
          retryDelay: 3000,
        };

      case 'poor':
        return {
          imageQuality: 'low',
          shouldBatch: true,
          requestTimeout: 60000, // 60 seconds
          maxConcurrent: 1,
          retryDelay: 5000,
        };

      case 'offline':
        return {
          imageQuality: 'low',
          shouldBatch: true,
          requestTimeout: 5000,
          maxConcurrent: 0,
          retryDelay: 10000,
        };
    }
  }

  /**
   * Get image quality settings
   */
  getImageQuality(): { maxDimension: number; quality: number } {
    const config = this.getConfig();
    switch (config.imageQuality) {
      case 'high':
        return { maxDimension: 1920, quality: 0.92 };
      case 'medium':
        return { maxDimension: 1024, quality: 0.80 };
      case 'low':
        return { maxDimension: 512, quality: 0.70 };
    }
  }

  /**
   * Should batch requests
   */
  shouldBatchRequests(): boolean {
    return this.getConfig().shouldBatch;
  }

  /**
   * Get request timeout
   */
  getRequestTimeout(): number {
    return this.getConfig().requestTimeout;
  }

  /**
   * Get max concurrent requests
   */
  getMaxConcurrent(): number {
    return this.getConfig().maxConcurrent;
  }

  /**
   * Get retry delay
   */
  getRetryDelay(): number {
    return this.getConfig().retryDelay;
  }

  /**
   * Check if should defer request to when online
   */
  shouldDeferRequest(): boolean {
    return this.networkQuality === 'offline';
  }

  /**
   * Get user-friendly network message
   */
  getNetworkMessage(): string | null {
    switch (this.networkQuality) {
      case 'offline':
        return 'You\'re offline. Changes will sync when you\'re back online.';
      case 'poor':
        return 'Slow connection detected. Optimizing for your network...';
      case 'fair':
        return 'Connection is a bit slow. Batching requests...';
      default:
        return null;
    }
  }

  /**
   * Estimate upload time for a file
   */
  estimateUploadTime(fileSizeBytes: number): number {
    // Rough estimates based on network quality
    const speedBytesPerSecond: Record<NetworkQuality, number> = {
      excellent: 5_000_000, // 5 MB/s
      good: 2_000_000, // 2 MB/s
      fair: 500_000, // 500 KB/s
      poor: 100_000, // 100 KB/s
      offline: 0,
    };

    const speed = speedBytesPerSecond[this.networkQuality];
    if (speed === 0) return Infinity;

    return (fileSizeBytes / speed) * 1000; // milliseconds
  }
}
