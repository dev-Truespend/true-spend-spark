/**
 * IndexedDB caching for HF models and responses
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface HFCacheDB extends DBSchema {
  models: {
    key: string;
    value: {
      modelId: string;
      blob: Blob;
      timestamp: number;
      size: number;
    };
  };
  responses: {
    key: string;
    value: {
      input: string;
      output: any;
      timestamp: number;
      modelId: string;
    };
  };
}

const DB_NAME = 'huggingface-cache';
const DB_VERSION = 1;
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days for models
const RESPONSE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours for responses

let db: IDBPDatabase<HFCacheDB> | null = null;

async function getDB(): Promise<IDBPDatabase<HFCacheDB>> {
  if (db) return db;

  db = await openDB<HFCacheDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      // Store for model files
      if (!database.objectStoreNames.contains('models')) {
        database.createObjectStore('models', { keyPath: 'modelId' });
      }

      // Store for inference responses
      if (!database.objectStoreNames.contains('responses')) {
        const store = database.createObjectStore('responses', { keyPath: 'input' });
        store.createIndex('timestamp', 'timestamp');
      }
    },
  });

  return db;
}

export async function cacheModel(modelId: string, blob: Blob): Promise<void> {
  try {
    const database = await getDB();
    await database.put('models', {
      modelId,
      blob,
      timestamp: Date.now(),
      size: blob.size,
    });
    console.log(`[HF Cache] Cached model ${modelId} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
  } catch (error) {
    console.error('[HF Cache] Failed to cache model:', error);
  }
}

export async function getCachedModel(modelId: string): Promise<Blob | null> {
  try {
    const database = await getDB();
    const cached = await database.get('models', modelId);

    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > CACHE_EXPIRY_MS) {
      await database.delete('models', modelId);
      console.log(`[HF Cache] Model ${modelId} expired, deleted from cache`);
      return null;
    }

    console.log(`[HF Cache] Model ${modelId} loaded from cache`);
    return cached.blob;
  } catch (error) {
    console.error('[HF Cache] Failed to get cached model:', error);
    return null;
  }
}

export async function cacheResponse(input: string, output: any, modelId: string): Promise<void> {
  try {
    const database = await getDB();
    await database.put('responses', {
      input,
      output,
      timestamp: Date.now(),
      modelId,
    });
  } catch (error) {
    console.error('[HF Cache] Failed to cache response:', error);
  }
}

export async function getCachedResponse(input: string): Promise<any | null> {
  try {
    const database = await getDB();
    const cached = await database.get('responses', input);

    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > RESPONSE_EXPIRY_MS) {
      await database.delete('responses', input);
      return null;
    }

    return cached.output;
  } catch (error) {
    console.error('[HF Cache] Failed to get cached response:', error);
    return null;
  }
}

export async function clearExpiredCache(): Promise<void> {
  try {
    const database = await getDB();
    const now = Date.now();

    // Clear expired models
    const models = await database.getAll('models');
    for (const model of models) {
      if (now - model.timestamp > CACHE_EXPIRY_MS) {
        await database.delete('models', model.modelId);
      }
    }

    // Clear expired responses
    const responses = await database.getAll('responses');
    for (const response of responses) {
      if (now - response.timestamp > RESPONSE_EXPIRY_MS) {
        await database.delete('responses', response.input);
      }
    }

    console.log('[HF Cache] Cleared expired cache entries');
  } catch (error) {
    console.error('[HF Cache] Failed to clear expired cache:', error);
  }
}

export async function getCacheStats(): Promise<{
  modelCount: number;
  responseCount: number;
  totalSize: number;
}> {
  try {
    const database = await getDB();
    const models = await database.getAll('models');
    const responses = await database.getAll('responses');

    const totalSize = models.reduce((sum, model) => sum + model.size, 0);

    return {
      modelCount: models.length,
      responseCount: responses.length,
      totalSize,
    };
  } catch (error) {
    console.error('[HF Cache] Failed to get cache stats:', error);
    return { modelCount: 0, responseCount: 0, totalSize: 0 };
  }
}

export async function clearAllCache(): Promise<void> {
  try {
    const database = await getDB();
    await database.clear('models');
    await database.clear('responses');
    console.log('[HF Cache] Cleared all cache');
  } catch (error) {
    console.error('[HF Cache] Failed to clear cache:', error);
  }
}
