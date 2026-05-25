/**
 * Hugging Face Transformers.js client for browser-side ML
 */

import { pipeline, env } from '@huggingface/transformers';
import { HFClientOptions, ModelDownloadProgress, HFMetrics } from './types';
import { HF_MODELS, getOptimalDevice } from './models';
import { getCachedModel, cacheModel, clearExpiredCache } from './cache';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

class HuggingFaceClient {
  private pipelines: Map<string, any> = new Map();
  private downloadProgress: Map<string, ModelDownloadProgress> = new Map();
  private metrics: HFMetrics = {
    requestCount: 0,
    successCount: 0,
    errorCount: 0,
    avgLatencyMs: 0,
    cacheHitRate: 0,
  };
  private options: HFClientOptions;
  private initialized = false;

  constructor(options: HFClientOptions = {}) {
    this.options = {
      enableWebGPU: true,
      enableCaching: true,
      maxCacheSize: 500 * 1024 * 1024, // 500MB
      ...options,
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;


    // Clear expired cache on startup
    if (this.options.enableCaching) {
      await clearExpiredCache();
    }

    this.initialized = true;
  }

  async getPipeline(modelId: string, task: any): Promise<any> {
    const key = `${task}:${modelId}`;

    // Return existing pipeline if available
    if (this.pipelines.has(key)) {
      return this.pipelines.get(key);
    }

    // Determine optimal device
    const device = this.options.enableWebGPU ? await getOptimalDevice() : 'wasm';


    // Set download progress
    this.downloadProgress.set(modelId, {
      modelId,
      progress: 0,
      status: 'downloading',
    });

    try {
      // Create pipeline
      const pipe = await pipeline(task, modelId, {
        device,
        progress_callback: (progress: any) => {
          if (progress.status === 'progress') {
            this.downloadProgress.set(modelId, {
              modelId,
              progress: progress.progress || 0,
              status: 'downloading',
            });
          }
        },
      });

      this.downloadProgress.set(modelId, {
        modelId,
        progress: 100,
        status: 'ready',
      });

      this.pipelines.set(key, pipe);

      return pipe;
    } catch (error) {
      console.error(`[HF Client] Failed to load pipeline ${modelId}:`, error);
      this.downloadProgress.set(modelId, {
        modelId,
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  getDownloadProgress(modelId: string): ModelDownloadProgress | undefined {
    return this.downloadProgress.get(modelId);
  }

  getAllDownloadProgress(): ModelDownloadProgress[] {
    return Array.from(this.downloadProgress.values());
  }

  getMetrics(): HFMetrics {
    return { ...this.metrics };
  }

  updateMetrics(success: boolean, responseTime: number): void {
    this.metrics.requestCount++;
    if (success) {
      this.metrics.successCount++;
    } else {
      this.metrics.errorCount++;
    }

    // Update average latency
    const count = this.metrics.requestCount;
    this.metrics.avgLatencyMs =
      (this.metrics.avgLatencyMs * (count - 1) + responseTime) / count;
  }

  async dispose(): Promise<void> {
    
    for (const [key, pipe] of this.pipelines.entries()) {
      try {
        if (pipe.dispose) {
          await pipe.dispose();
        }
      } catch (error) {
        console.error(`[HF Client] Error disposing pipeline ${key}:`, error);
      }
    }

    this.pipelines.clear();
    this.downloadProgress.clear();
    this.initialized = false;
    
  }
}

// Singleton instance
let hfClient: HuggingFaceClient | null = null;

export function getHFClient(options?: HFClientOptions): HuggingFaceClient {
  if (!hfClient) {
    hfClient = new HuggingFaceClient(options);
  }
  return hfClient;
}

export async function disposeHFClient(): Promise<void> {
  if (hfClient) {
    await hfClient.dispose();
    hfClient = null;
  }
}

export { HuggingFaceClient };
export * from './types';
export * from './models';
