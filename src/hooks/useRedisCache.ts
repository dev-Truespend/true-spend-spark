import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { cacheService, CacheOptions } from '@/services/cacheService';

interface UseRedisCacheOptions<T> extends CacheOptions {
  queryKey: string[];
  fetcher: () => Promise<T>;
  queryOptions?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>;
}

export function useRedisCache<T>({
  queryKey,
  fetcher,
  ttl = 300,
  skipRedis = false,
  skipIndexedDB = false,
  queryOptions = {},
}: UseRedisCacheOptions<T>) {
  const queryClient = useQueryClient();
  const cacheKey = queryKey.join(':');

  const query = useQuery<T>({
    queryKey,
    queryFn: async () => {
      // Try cache first
      const { data, stats } = await cacheService.get<T>(cacheKey, {
        ttl,
        skipRedis,
        skipIndexedDB,
      });

      if (data) {
        console.log(`Cache hit [${stats.layer}] for ${cacheKey} in ${stats.latency.toFixed(2)}ms`);
        return data;
      }

      // Cache miss - fetch fresh data
      console.log(`Cache miss for ${cacheKey}, fetching fresh data`);
      const freshData = await fetcher();

      // Store in cache
      await cacheService.set(cacheKey, freshData, { ttl, skipRedis, skipIndexedDB });

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

export function useInvalidateCache() {
  const queryClient = useQueryClient();

  return async (pattern: string) => {
    await cacheService.invalidate(pattern);
    // Invalidate all queries - pattern matching not supported by React Query
    queryClient.invalidateQueries();
  };
}
