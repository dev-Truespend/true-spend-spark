import { supabase } from "@/integrations/supabase/client";

interface CacheEvent {
  layer: 'L1_IndexedDB' | 'L2_Memory' | 'L3_Database';
  key: string;
  hit: boolean;
  ttl?: number;
}

// Sampling rate: only record 15% of cache events to reduce database load
const SAMPLING_RATE = 0.15;

export const useCacheAnalytics = () => {
  const recordCacheEvent = async ({ layer, key, hit, ttl }: CacheEvent) => {
    // Sample events - only record 15% of the time
    if (Math.random() > SAMPLING_RATE) {
      return;
    }

    // Fire-and-forget: never block user flows on analytics failures
    try {
      await supabase.from('cache_analytics').insert({
        cache_type: layer,
        operation: hit ? 'hit' : 'miss',
        metadata: { 
          cache_key: key,
          ttl_seconds: ttl
        }
      });
    } catch (error) {
      // Silent failure - analytics should never break the app
      if (import.meta.env.DEV) {
        console.error('Cache analytics error:', error);
      }
    }
  };

  return { recordCacheEvent };
};
