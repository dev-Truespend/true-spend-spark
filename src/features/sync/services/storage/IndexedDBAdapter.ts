// IndexedDB implementation of StorageAdapter
import { StorageAdapter, StorageConfig } from './StorageAdapter';
import { initDB } from '@/shared/lib/db/indexedDB';
import { IDBPDatabase } from 'idb';

export class IndexedDBAdapter implements StorageAdapter {
  private config: StorageConfig;
  private isClosing = false;

  constructor(config: StorageConfig) {
    this.config = config;
  }

  async init(): Promise<void> {
    console.log('[IndexedDBAdapter] Initializing...');
    this.isClosing = false;
    // Use shared initDB to ensure single connection
    await initDB();
  }

  private async ensureDB(): Promise<IDBPDatabase> {
    if (this.isClosing) {
      throw new Error('IndexedDBAdapter is closing. Cannot perform operations.');
    }
    // Always get the shared instance
    return await initDB();
  }

  async get<T>(storeName: string, key: string): Promise<T | null> {
    const db = await this.ensureDB();
    const value = await db.get(storeName, key);
    return value || null;
  }

  async set<T>(storeName: string, key: string, value: T): Promise<void> {
    const db = await this.ensureDB();
    await db.put(storeName, value);
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.ensureDB();
    return await db.getAll(storeName);
  }

  async query<T>(
    storeName: string,
    filter?: (item: T) => boolean
  ): Promise<T[]> {
    const all = await this.getAll<T>(storeName);
    if (!filter) return all;
    return all.filter(filter);
  }

  async delete(storeName: string, key: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete(storeName, key);
  }

  async deleteMany(storeName: string, keys: string[]): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction(storeName, 'readwrite');
    await Promise.all(keys.map(key => tx.store.delete(key)));
    await tx.done;
  }

  async clear(storeName: string): Promise<void> {
    const db = await this.ensureDB();
    await db.clear(storeName);
  }

  async count(storeName: string): Promise<number> {
    const db = await this.ensureDB();
    return await db.count(storeName);
  }

  async bulkSet<T>(
    storeName: string,
    items: Array<{ key: string; value: T }>
  ): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction(storeName, 'readwrite');
    await Promise.all(items.map(item => tx.store.put(item.value)));
    await tx.done;
  }

  async close(): Promise<void> {
    this.isClosing = true;
    // DON'T close the shared connection, just mark adapter as closing
    console.log('[IndexedDBAdapter] Adapter marked as closing (shared DB remains open)');
  }

  isActive(): boolean {
    return !this.isClosing;
  }
}

// Default instance for web and browser extension
export const defaultStorage = new IndexedDBAdapter({
  name: 'truespend-offline',
  version: 1,
  stores: ['transactions', 'budgets', 'geofences', 'syncQueue', 'settings'],
});
