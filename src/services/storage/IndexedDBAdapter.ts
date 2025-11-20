// IndexedDB implementation of StorageAdapter
import { StorageAdapter, StorageConfig } from './StorageAdapter';
import { initDB } from '@/lib/db/indexedDB';
import { IDBPDatabase } from 'idb';

export class IndexedDBAdapter implements StorageAdapter {
  private db: IDBPDatabase | null = null;
  private config: StorageConfig;
  private isClosing = false;

  constructor(config: StorageConfig) {
    this.config = config;
  }

  async init(): Promise<void> {
    console.log('[IndexedDBAdapter] Initializing...');
    this.isClosing = false;
    this.db = await initDB();
  }

  private ensureDB(): IDBPDatabase {
    if (this.isClosing) {
      throw new Error('IndexedDBAdapter is closing. Cannot perform operations.');
    }
    if (!this.db) {
      throw new Error('IndexedDBAdapter not initialized. Call init() first.');
    }
    return this.db;
  }

  async get<T>(storeName: string, key: string): Promise<T | null> {
    const db = this.ensureDB();
    const value = await db.get(storeName, key);
    return value || null;
  }

  async set<T>(storeName: string, key: string, value: T): Promise<void> {
    const db = this.ensureDB();
    await db.put(storeName, value);
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = this.ensureDB();
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
    const db = this.ensureDB();
    await db.delete(storeName, key);
  }

  async deleteMany(storeName: string, keys: string[]): Promise<void> {
    const db = this.ensureDB();
    const tx = db.transaction(storeName, 'readwrite');
    await Promise.all(keys.map(key => tx.store.delete(key)));
    await tx.done;
  }

  async clear(storeName: string): Promise<void> {
    const db = this.ensureDB();
    await db.clear(storeName);
  }

  async count(storeName: string): Promise<number> {
    const db = this.ensureDB();
    return await db.count(storeName);
  }

  async bulkSet<T>(
    storeName: string,
    items: Array<{ key: string; value: T }>
  ): Promise<void> {
    const db = this.ensureDB();
    const tx = db.transaction(storeName, 'readwrite');
    await Promise.all(items.map(item => tx.store.put(item.value)));
    await tx.done;
  }

  async close(): Promise<void> {
    this.isClosing = true;
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  isActive(): boolean {
    return !this.isClosing && this.db !== null;
  }
}

// Default instance for web and browser extension
export const defaultStorage = new IndexedDBAdapter({
  name: 'truespend-offline',
  version: 1,
  stores: ['transactions', 'budgets', 'geofences', 'syncQueue', 'settings'],
});
