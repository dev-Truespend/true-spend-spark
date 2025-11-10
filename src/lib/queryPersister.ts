// React Query persistence with IndexedDB
import { get, set, del } from 'idb-keyval';
import { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

/**
 * Creates an IDBKeyVal persister for React Query
 * Stores query cache in IndexedDB for offline-first behavior
 */
export function createIDBPersister(idbValidKey: IDBValidKey = 'reactQuery'): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(idbValidKey, client);
    },
    restoreClient: async () => {
      return await get<PersistedClient>(idbValidKey);
    },
    removeClient: async () => {
      await del(idbValidKey);
    },
  };
}
