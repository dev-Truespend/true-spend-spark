/**
 * Batch Operations Utilities
 * Optimizes IndexedDB and API operations by batching multiple requests
 */

import { initDB } from '@/lib/db/indexedDB';
import { supabase } from '@/integrations/supabase/client';
import { measureAsync } from '@/lib/performance/performanceMonitor';

const BATCH_SIZE = 50; // Process 50 items at a time
const BATCH_DELAY = 100; // 100ms delay between batches

/**
 * Batch insert items into IndexedDB
 */
export async function batchInsertLocal<T extends { id: string }>(
  storeName: string,
  items: T[]
): Promise<void> {
  return measureAsync(`batch-insert-local-${storeName}`, async () => {
    const db = await initDB();
    const batches = chunkArray(items, BATCH_SIZE);
    
    for (const batch of batches) {
      const tx = db.transaction(storeName as any, 'readwrite');
      for (const item of batch) {
        await tx.store.put(item, item.id);
      }
      await tx.done;
      
      // Small delay to prevent blocking main thread
      if (batches.length > 1) {
        await delay(BATCH_DELAY);
      }
    }
    
    console.log(`[BatchOps] Inserted ${items.length} items into ${storeName}`);
  });
}

/**
 * Batch upsert items to Supabase
 */
export async function batchUpsertRemote<T extends { id: string }>(
  tableName: string,
  items: T[]
): Promise<{ success: number; failed: number }> {
  return measureAsync(`batch-upsert-remote-${tableName}`, async () => {
    let successCount = 0;
    let failedCount = 0;
    
    const batches = chunkArray(items, BATCH_SIZE);
    
    for (const batch of batches) {
      try {
        const { error } = await supabase
          .from(tableName as any)
          .upsert(batch, { onConflict: 'id' });
        
        if (error) throw error;
        
        successCount += batch.length;
        console.log(`[BatchOps] Upserted batch of ${batch.length} to ${tableName}`);
        
        // Small delay between batches
        if (batches.length > 1) {
          await delay(BATCH_DELAY);
        }
      } catch (error) {
        console.error(`[BatchOps] Failed to upsert batch to ${tableName}:`, error);
        failedCount += batch.length;
      }
    }
    
    return { success: successCount, failed: failedCount };
  });
}

/**
 * Batch fetch items from Supabase
 */
export async function batchFetchRemote<T>(
  tableName: string,
  ids: string[]
): Promise<T[]> {
  return measureAsync(`batch-fetch-remote-${tableName}`, async () => {
    const batches = chunkArray(ids, BATCH_SIZE);
    const results: T[] = [];
    
    for (const batch of batches) {
      try {
        const { data, error } = await supabase
          .from(tableName as any)
          .select('*')
          .in('id', batch);
        
        if (error) throw error;
        
        if (data) {
          results.push(...(data as T[]));
        }
        
        // Small delay between batches
        if (batches.length > 1) {
          await delay(BATCH_DELAY);
        }
      } catch (error) {
        console.error(`[BatchOps] Failed to fetch batch from ${tableName}:`, error);
      }
    }
    
    console.log(`[BatchOps] Fetched ${results.length} items from ${tableName}`);
    return results;
  });
}

/**
 * Batch delete items from IndexedDB
 */
export async function batchDeleteLocal(
  storeName: string,
  ids: string[]
): Promise<void> {
  return measureAsync(`batch-delete-local-${storeName}`, async () => {
    const db = await initDB();
    const batches = chunkArray(ids, BATCH_SIZE);
    
    for (const batch of batches) {
      const tx = db.transaction(storeName as any, 'readwrite');
      for (const id of batch) {
        await tx.store.delete(id);
      }
      await tx.done;
      
      // Small delay to prevent blocking
      if (batches.length > 1) {
        await delay(BATCH_DELAY);
      }
    }
    
    console.log(`[BatchOps] Deleted ${ids.length} items from ${storeName}`);
  });
}

/**
 * Batch delete items from Supabase
 */
export async function batchDeleteRemote(
  tableName: string,
  ids: string[]
): Promise<{ success: number; failed: number }> {
  return measureAsync(`batch-delete-remote-${tableName}`, async () => {
    let successCount = 0;
    let failedCount = 0;
    
    const batches = chunkArray(ids, BATCH_SIZE);
    
    for (const batch of batches) {
      try {
        const { error } = await supabase
          .from(tableName as any)
          .delete()
          .in('id', batch);
        
        if (error) throw error;
        
        successCount += batch.length;
        console.log(`[BatchOps] Deleted batch of ${batch.length} from ${tableName}`);
        
        // Small delay between batches
        if (batches.length > 1) {
          await delay(BATCH_DELAY);
        }
      } catch (error) {
        console.error(`[BatchOps] Failed to delete batch from ${tableName}:`, error);
        failedCount += batch.length;
      }
    }
    
    return { success: successCount, failed: failedCount };
  });
}

// Helper functions

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
