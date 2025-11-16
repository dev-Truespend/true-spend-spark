// React Query persistence with IndexedDB via idb-keyval
import { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { get, set, del } from 'idb-keyval';

const CACHE_KEY = 'truespend-query-cache';

/**
 * Creates an IndexedDB persister for React Query using idb-keyval
 * Stores query cache in IndexedDB for offline-first behavior
 * Benefits over localStorage:
 * - No 5-10MB size limit
 * - Asynchronous operations (non-blocking)
 * - Better for large datasets
 * - Automatic quota management
 */
export function createSyncPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(CACHE_KEY, client);
    },
    restoreClient: async () => {
      return await get<PersistedClient>(CACHE_KEY);
    },
    removeClient: async () => {
      await del(CACHE_KEY);
    },
  };
}
