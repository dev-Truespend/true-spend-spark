// React Query persistence with localStorage
import { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

/**
 * Creates a localStorage persister for React Query
 * Stores query cache in localStorage for offline-first behavior
 * Using localStorage instead of IndexedDB to avoid initialization race conditions
 */
export function createSyncPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      localStorage.setItem('truespend-query-cache', JSON.stringify(client));
    },
    restoreClient: async () => {
      const cached = localStorage.getItem('truespend-query-cache');
      return cached ? JSON.parse(cached) : undefined;
    },
    removeClient: async () => {
      localStorage.removeItem('truespend-query-cache');
    },
  };
}
