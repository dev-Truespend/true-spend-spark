/**
 * Client-side transaction categorization using Hugging Face
 */

import { getHFClient } from './client';
import { HF_MODELS } from './models';
import { CategoryPrediction, TRANSACTION_CATEGORIES, TransactionCategory } from './types';
import { getCachedResponse, cacheResponse } from './cache';

interface TransactionData {
  merchantName?: string;
  description?: string;
  amount?: number;
}

/**
 * Categorize a transaction using client-side ML
 */
export async function categorizeTransaction(
  transaction: TransactionData
): Promise<CategoryPrediction> {
  const startTime = Date.now();
  const client = getHFClient();

  try {
    // Initialize if needed
    await client.initialize();

    // Create input text
    const inputText = createCategoriesInput(transaction);
    
    // Check cache first
    const cached = await getCachedResponse(inputText);
    if (cached) {
      return {
        ...cached,
        method: 'hf-client',
      };
    }

    // Load zero-shot classification pipeline
    const classifier = await client.getPipeline(
      HF_MODELS.ZERO_SHOT.modelId,
      HF_MODELS.ZERO_SHOT.task
    );

    // Run classification
    const result = await classifier(inputText, TRANSACTION_CATEGORIES, {
      multi_label: false,
    });

    // Get best prediction
    const bestLabel = result.labels[0] as TransactionCategory;
    const confidence = result.scores[0];

    const prediction: CategoryPrediction = {
      category: bestLabel,
      confidence,
      method: 'hf-client',
    };

    // Cache the result
    await cacheResponse(inputText, prediction, HF_MODELS.ZERO_SHOT.modelId);

    // Update metrics
    const responseTime = Date.now() - startTime;
    client.updateMetrics(true, responseTime);


    return prediction;
  } catch (error) {
    console.error('[HF Categorizer] Error:', error);
    
    // Update metrics
    const responseTime = Date.now() - startTime;
    client.updateMetrics(false, responseTime);

    // Return fallback
    return {
      category: 'other',
      confidence: 0,
      method: 'hf-client',
    };
  }
}

/**
 * Batch categorize multiple transactions
 */
export async function categorizeTransactionsBatch(
  transactions: TransactionData[]
): Promise<CategoryPrediction[]> {
  const results: CategoryPrediction[] = [];

  for (const transaction of transactions) {
    try {
      const prediction = await categorizeTransaction(transaction);
      results.push(prediction);
    } catch (error) {
      console.error('[HF Categorizer] Batch error:', error);
      results.push({
        category: 'other',
        confidence: 0,
        method: 'hf-client',
      });
    }
  }

  return results;
}

/**
 * Check if client-side categorization is ready
 */
export async function isCategorizerReady(): Promise<boolean> {
  try {
    const client = getHFClient();
    const progress = client.getDownloadProgress(HF_MODELS.ZERO_SHOT.modelId);
    return progress?.status === 'ready';
  } catch {
    return false;
  }
}

/**
 * Preload the categorization model
 */
export async function preloadCategorizer(): Promise<void> {
  try {
    const client = getHFClient();
    await client.initialize();
    await client.getPipeline(HF_MODELS.ZERO_SHOT.modelId, HF_MODELS.ZERO_SHOT.task);
  } catch (error) {
    console.error('[HF Categorizer] Failed to preload:', error);
  }
}

// Helper functions
function createCategoriesInput(transaction: TransactionData): string {
  const parts: string[] = [];

  if (transaction.merchantName) {
    parts.push(`Merchant: ${transaction.merchantName}`);
  }

  if (transaction.description) {
    parts.push(`Description: ${transaction.description}`);
  }

  if (transaction.amount !== undefined) {
    parts.push(`Amount: $${transaction.amount.toFixed(2)}`);
  }

  return parts.join('. ');
}
