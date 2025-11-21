/**
 * Hugging Face model configurations
 */

import { HFModelConfig } from './types';

export const HF_MODELS = {
  // Text Classification - Transaction Categorization
  CATEGORIZATION: {
    modelId: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
    task: 'text-classification',
    device: 'webgpu',
    quantized: true,
  } as HFModelConfig,

  // Zero-Shot Classification - Better for custom categories
  ZERO_SHOT: {
    modelId: 'Xenova/mobilebert-uncased-mnli',
    task: 'zero-shot-classification',
    device: 'webgpu',
    quantized: true,
  } as HFModelConfig,

  // Feature Extraction - For transaction similarity
  EMBEDDINGS: {
    modelId: 'Xenova/all-MiniLM-L6-v2',
    task: 'feature-extraction',
    device: 'webgpu',
    quantized: true,
  } as HFModelConfig,
};

// Server-side models (used in edge functions via HF Inference API)
export const HF_SERVER_MODELS = {
  OCR: 'microsoft/trocr-base-printed',
  CATEGORIZATION: 'facebook/bart-large-mnli',
  ANALYSIS: 'mistralai/Mistral-7B-Instruct-v0.2',
};

// Check if WebGPU is available
export async function checkWebGPUSupport(): Promise<boolean> {
  if (!navigator.gpu) {
    console.warn('[HF] WebGPU not available, will fallback to WASM/CPU');
    return false;
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch (error) {
    console.warn('[HF] WebGPU adapter request failed:', error);
    return false;
  }
}

// Get optimal device based on capabilities
export async function getOptimalDevice(): Promise<'webgpu' | 'wasm' | 'cpu'> {
  const hasWebGPU = await checkWebGPUSupport();
  
  if (hasWebGPU) {
    return 'webgpu';
  }

  // Check for WebAssembly SIMD support
  if (typeof WebAssembly !== 'undefined') {
    return 'wasm';
  }

  return 'cpu';
}
