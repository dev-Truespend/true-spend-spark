import { supabase } from "@/integrations/supabase/client";

interface CacheEvent {
  layer: 'L1_IndexedDB' | 'L2_Memory' | 'L3_Database';
  key: string;
  hit: boolean;
  ttl?: number;
}

export const useCacheAnalytics = () => {
  const recordCacheEvent = async ({ layer, key, hit, ttl }: CacheEvent) => {
    try {
      const { error } = await supabase.from('cache_analytics').insert({
        cache_type: layer,
        operation: hit ? 'hit' : 'miss',
        metadata: { 
          cache_key: key,
          ttl_seconds: ttl
        }
      });

      if (error) {
        console.error('Failed to record cache analytics:', error);
      }
    } catch (error) {
      console.error('Cache analytics error:', error);
    }
  };

  return { recordCacheEvent };
};
