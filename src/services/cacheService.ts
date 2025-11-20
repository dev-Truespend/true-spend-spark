/**
 * Multi-Layer Cache Service
 * L1: Redis (in-memory, shared)
 * L2: IndexedDB (client-side, persistent)
 * L3: Supabase (database)
 */

import { redis } from './redisClient';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

export interface CacheOptions {
  ttl?: number; // seconds
  skipRedis?: boolean;
  skipIndexedDB?: boolean;
}

export interface CacheStats {
  layer: 'redis' | 'indexeddb' | 'miss';
  latency: number;
  key: string;
}

export class CacheService {
  private stats: CacheStats[] = [];

  async get<T>(key: string, options: CacheOptions = {}): Promise<{ data: T | null; stats: CacheStats }> {
    const startTime = performance.now();

    // L1: Redis
    if (!options.skipRedis) {
      try {
        const cached = await redis.get(key);
        if (cached) {
          const data = JSON.parse(cached) as T;
          const stats: CacheStats = {
            layer: 'redis',
            latency: performance.now() - startTime,
            key,
          };
          this.recordStats(stats);
          return { data, stats };
        }
      } catch (error) {
        console.warn('Redis L1 cache miss:', error);
      }
    }

    // L2: IndexedDB
    if (!options.skipIndexedDB) {
      try {
        const cached = await idbGet<{ data: T; expires: number }>(key);
        if (cached && cached.expires > Date.now()) {
          // Promote to L1
          if (!options.skipRedis) {
            const ttl = Math.floor((cached.expires - Date.now()) / 1000);
            await redis.set(key, JSON.stringify(cached.data), ttl).catch(() => {});
          }

          const stats: CacheStats = {
            layer: 'indexeddb',
            latency: performance.now() - startTime,
            key,
          };
          this.recordStats(stats);
          return { data: cached.data, stats };
        }
      } catch (error) {
        console.warn('IndexedDB L2 cache miss:', error);
      }
    }

    // Cache miss
    const stats: CacheStats = {
      layer: 'miss',
      latency: performance.now() - startTime,
      key,
    };
    this.recordStats(stats);
    return { data: null, stats };
  }

  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || 300; // 5 min default

    // L1: Redis
    if (!options.skipRedis) {
      try {
        await redis.set(key, JSON.stringify(data), ttl);
      } catch (error) {
        console.warn('Redis set failed:', error);
      }
    }

    // L2: IndexedDB
    if (!options.skipIndexedDB) {
      try {
        const expires = Date.now() + ttl * 1000;
        await idbSet(key, { data, expires });
      } catch (error) {
        console.warn('IndexedDB set failed:', error);
      }
    }
  }

  async invalidate(pattern: string): Promise<void> {
    // Clear Redis keys matching pattern
    try {
      const keys = await redis.keys(pattern);
      await Promise.all(keys.map(key => redis.del(key)));
    } catch (error) {
      console.warn('Redis invalidation failed:', error);
    }

    // IndexedDB doesn't support pattern matching, so we can't efficiently clear it
    // Individual keys should be deleted as needed
  }

  async invalidateKey(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.warn('Redis key deletion failed:', error);
    }

    try {
      await idbDel(key);
    } catch (error) {
      console.warn('IndexedDB key deletion failed:', error);
    }
  }

  private recordStats(stats: CacheStats): void {
    this.stats.push(stats);
    if (this.stats.length > 1000) {
      this.stats = this.stats.slice(-1000);
    }
  }

  getStats(): CacheStats[] {
    return [...this.stats];
  }

  getCacheHitRate(): { redis: number; indexeddb: number; miss: number } {
    const total = this.stats.length;
    if (total === 0) return { redis: 0, indexeddb: 0, miss: 0 };

    const redis = this.stats.filter(s => s.layer === 'redis').length;
    const indexeddb = this.stats.filter(s => s.layer === 'indexeddb').length;
    const miss = this.stats.filter(s => s.layer === 'miss').length;

    return {
      redis: (redis / total) * 100,
      indexeddb: (indexeddb / total) * 100,
      miss: (miss / total) * 100,
    };
  }

  getAverageLatency(): { redis: number; indexeddb: number } {
    const redisStats = this.stats.filter(s => s.layer === 'redis');
    const idbStats = this.stats.filter(s => s.layer === 'indexeddb');

    return {
      redis: redisStats.length > 0
        ? redisStats.reduce((sum, s) => sum + s.latency, 0) / redisStats.length
        : 0,
      indexeddb: idbStats.length > 0
        ? idbStats.reduce((sum, s) => sum + s.latency, 0) / idbStats.length
        : 0,
    };
  }
}

export const cacheService = new CacheService();
