import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { cacheService, CacheOptions } from '@/services/cacheService';

interface UseBrowserCacheOptions<T> extends CacheOptions {
  queryKey: string[];
  fetcher: () => Promise<T>;
  queryOptions?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>;
}

/**
 * React hook for browser-side caching using IndexedDB
 * Server-side Redis caching is automatically handled by edge functions
 */
export function useBrowserCache<T>({
  queryKey,
  fetcher,
  ttl = 300,
  queryOptions = {},
}: UseBrowserCacheOptions<T>) {
  const queryClient = useQueryClient();
  const cacheKey = queryKey.join(':');

  const query = useQuery<T>({
    queryKey,
    queryFn: async () => {
      // Try IndexedDB cache first
      const { data, stats } = await cacheService.get<T>(cacheKey, { ttl });

      if (data) {
        console.log(`Browser cache hit for ${cacheKey} in ${stats.latency.toFixed(2)}ms`);
        return data;
      }

      // Cache miss - fetch fresh data
      console.log(`Browser cache miss for ${cacheKey}, fetching fresh data`);
      const freshData = await fetcher();

      // Store in IndexedDB cache
      await cacheService.set(cacheKey, freshData, { ttl });

      return freshData;
    },
    staleTime: ttl * 1000,
    gcTime: ttl * 1000 * 2,
    ...queryOptions,
  });

  const invalidate = async () => {
    await cacheService.invalidateKey(cacheKey);
    queryClient.invalidateQueries({ queryKey });
  };

  return {
    ...query,
    invalidate,
  };
}

export function useInvalidateBrowserCache() {
  const queryClient = useQueryClient();

  return async (pattern: string) => {
    await cacheService.invalidate(pattern);
    // Invalidate all queries - pattern matching not supported by React Query
    queryClient.invalidateQueries();
  };
}
