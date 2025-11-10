// IndexedDB wrapper for offline-first architecture - Phase 1
import { openDB, IDBPDatabase } from 'idb';

type TransactionRecord = {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  merchant_id?: string;
  location?: { lat: number; lng: number };
  timestamp: string;
  synced: boolean;
  created_at: string;
};

type BudgetRecord = {
  id: string;
  user_id: string;
  category: string;
  limit: number;
  period: string;
  synced: boolean;
};

type GeofenceRecord = {
  id: string;
  user_id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  type: string;
  synced: boolean;
};

export type SyncQueueRecord = {
  id?: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  timestamp: string;
  retries: number;
};

const DB_NAME = 'truespend-offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase | null = null;

export async function initDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Transactions store
      if (!db.objectStoreNames.contains('transactions')) {
        const transactionStore = db.createObjectStore('transactions', { keyPath: 'id' });
        transactionStore.createIndex('by-synced', 'synced');
        transactionStore.createIndex('by-timestamp', 'timestamp');
      }

      // Budgets store
      if (!db.objectStoreNames.contains('budgets')) {
        const budgetStore = db.createObjectStore('budgets', { keyPath: 'id' });
        budgetStore.createIndex('by-synced', 'synced');
      }

      // Geofences store
      if (!db.objectStoreNames.contains('geofences')) {
        const geofenceStore = db.createObjectStore('geofences', { keyPath: 'id' });
        geofenceStore.createIndex('by-synced', 'synced');
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('by-timestamp', 'timestamp');
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
    },
  });

  return dbInstance;
}

// Generic CRUD operations
type StoreName = 'transactions' | 'budgets' | 'geofences' | 'syncQueue' | 'settings';

export async function addItem(
  storeName: StoreName,
  item: any
): Promise<void> {
  const db = await initDB();
  await db.add(storeName, item);
}

export async function getItem(
  storeName: StoreName,
  key: any
): Promise<any | undefined> {
  const db = await initDB();
  return db.get(storeName, key);
}

export async function getAllItems(
  storeName: StoreName
): Promise<any[]> {
  const db = await initDB();
  return db.getAll(storeName);
}

export async function updateItem(
  storeName: StoreName,
  item: any
): Promise<void> {
  const db = await initDB();
  await db.put(storeName, item);
}

export async function deleteItem(
  storeName: StoreName,
  key: any
): Promise<void> {
  const db = await initDB();
  await db.delete(storeName, key);
}

// Sync queue operations
export async function addToSyncQueue(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  table: string,
  data: any
): Promise<void> {
  const db = await initDB();
  await db.add('syncQueue', {
    action,
    table,
    data,
    timestamp: new Date().toISOString(),
    retries: 0,
  });
}

export async function getSyncQueue(): Promise<SyncQueueRecord[]> {
  const db = await initDB();
  return db.getAll('syncQueue') as Promise<SyncQueueRecord[]>;
}

export async function removeSyncQueueItem(id: number): Promise<void> {
  const db = await initDB();
  await db.delete('syncQueue', id);
}

export async function incrementSyncRetries(id: number): Promise<void> {
  const db = await initDB();
  const item = await db.get('syncQueue', id);
  if (item) {
    item.retries += 1;
    await db.put('syncQueue', item);
  }
}

// Get unsynced items
export async function getUnsyncedItems(
  storeName: StoreName
): Promise<any[]> {
  const db = await initDB();
  if (!db.objectStoreNames.contains(storeName)) return [];
  
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  
  if (!store.indexNames.contains('by-synced')) return [];
  
  const index = store.index('by-synced');
  return index.getAll(IDBKeyRange.only(false));
}

// Settings operations
export async function getSetting(key: string): Promise<any> {
  const db = await initDB();
  return db.get('settings', key);
}

export async function setSetting(key: string, value: any): Promise<void> {
  const db = await initDB();
  await db.put('settings', value, key);
}

// Clear all data (for logout)
export async function clearAllData(): Promise<void> {
  const db = await initDB();
  const stores: StoreName[] = ['transactions', 'budgets', 'geofences', 'syncQueue', 'settings'];
  
  for (const store of stores) {
    await db.clear(store);
  }
}
