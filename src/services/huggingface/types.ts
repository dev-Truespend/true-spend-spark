/**
 * Hugging Face service types
 */

export interface HFModelConfig {
  modelId: string;
  task: 'text-classification' | 'feature-extraction' | 'image-to-text' | 'zero-shot-classification';
  device?: 'webgpu' | 'wasm' | 'cpu';
  quantized?: boolean;
}

export interface CategoryPrediction {
  category: string;
  confidence: number;
  method: 'hf-client' | 'hf-server' | 'lovable-ai' | 'rule-based';
}

export interface HFClientOptions {
  enableWebGPU?: boolean;
  enableCaching?: boolean;
  maxCacheSize?: number;
}

export interface ModelDownloadProgress {
  modelId: string;
  progress: number;
  status: 'downloading' | 'loading' | 'ready' | 'error';
  error?: string;
}

export interface HFMetrics {
  requestCount: number;
  successCount: number;
  errorCount: number;
  avgLatencyMs: number;
  cacheHitRate: number;
  lastError?: string;
}

export const TRANSACTION_CATEGORIES = [
  'groceries',
  'dining',
  'transportation',
  'entertainment',
  'shopping',
  'utilities',
  'healthcare',
  'travel',
  'other'
] as const;

export type TransactionCategory = typeof TRANSACTION_CATEGORIES[number];
