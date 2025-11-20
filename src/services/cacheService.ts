/**
 * Browser-side Cache Service (IndexedDB Only)
 * Server-side caching (Redis) is handled by edge functions
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface CacheDB extends DBSchema {
  cache: {
    key: string;
    value: {
      data: any;
      timestamp: number;
      ttl: number;
    };
  };
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

export interface CacheStats {
  layer: 'indexeddb' | 'miss';
  latency: number;
  key: string;
}

class BrowserCacheService {
  private db: IDBPDatabase<CacheDB> | null = null;
  private stats: CacheStats[] = [];
  private maxStats = 1000;

  async init() {
    if (this.db) return;
    
    try {
      this.db = await openDB<CacheDB>('truespend-cache', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('cache')) {
            db.createObjectStore('cache');
          }
        },
      });
    } catch (error) {
      console.error('Failed to initialize IndexedDB cache:', error);
    }
  }

  async get<T>(key: string, options: CacheOptions = {}): Promise<{ data: T | null; stats: CacheStats }> {
    const startTime = performance.now();
    
    await this.init();
    
    if (!this.db) {
      return {
        data: null,
        stats: { layer: 'miss', latency: performance.now() - startTime, key }
      };
    }

    try {
      const cached = await this.db.get('cache', key);
      
      if (cached) {
        const age = Date.now() - cached.timestamp;
        const ttlMs = cached.ttl * 1000;
        
        if (age < ttlMs) {
          const stats: CacheStats = {
            layer: 'indexeddb',
            latency: performance.now() - startTime,
            key
          };
          this.recordStats(stats);
          return { data: cached.data as T, stats };
        } else {
          // Expired, delete it
          await this.db.delete('cache', key);
        }
      }
    } catch (error) {
      console.error('IndexedDB cache get error:', error);
    }

    const stats: CacheStats = {
      layer: 'miss',
      latency: performance.now() - startTime,
      key
    };
    this.recordStats(stats);
    return { data: null, stats };
  }

  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    await this.init();
    
    if (!this.db) return;

    const ttl = options.ttl || 300; // Default 5 minutes

    try {
      await this.db.put('cache', {
        data,
        timestamp: Date.now(),
        ttl
      }, key);
    } catch (error) {
      console.error('IndexedDB cache set error:', error);
    }
  }

  async invalidateKey(key: string): Promise<void> {
    await this.init();
    
    if (!this.db) return;

    try {
      await this.db.delete('cache', key);
    } catch (error) {
      console.error('IndexedDB cache invalidate error:', error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    await this.init();
    
    if (!this.db) return;

    try {
      const allKeys = await this.db.getAllKeys('cache');
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      
      for (const key of allKeys) {
        if (regex.test(key as string)) {
          await this.db.delete('cache', key);
        }
      }
    } catch (error) {
      console.error('IndexedDB cache invalidate pattern error:', error);
    }
  }

  private recordStats(stats: CacheStats) {
    this.stats.push(stats);
    if (this.stats.length > this.maxStats) {
      this.stats.shift();
    }
  }

  getStats(): CacheStats[] {
    return this.stats;
  }

  getCacheHitRate(): { indexeddb: number; miss: number } {
    if (this.stats.length === 0) {
      return { indexeddb: 0, miss: 0 };
    }

    const indexeddbHits = this.stats.filter(s => s.layer === 'indexeddb').length;
    const total = this.stats.length;

    return {
      indexeddb: (indexeddbHits / total) * 100,
      miss: ((total - indexeddbHits) / total) * 100,
    };
  }

  getAverageLatency(): { indexeddb: number } {
    const indexeddbStats = this.stats.filter(s => s.layer === 'indexeddb');

    return {
      indexeddb: indexeddbStats.length > 0
        ? indexeddbStats.reduce((sum, s) => sum + s.latency, 0) / indexeddbStats.length
        : 0,
    };
  }
}

export const cacheService = new BrowserCacheService();
