// Storage Adapter Interface - Abstraction for cross-platform storage
// Supports: Web (IndexedDB), Browser Extension (IndexedDB), Native Apps (SQLite)

export interface StorageAdapter {
  /**
   * Initialize the storage (open connection, run migrations, etc.)
   */
  init(): Promise<void>;

  /**
   * Get a single item by key
   */
  get<T>(storeName: string, key: string): Promise<T | null>;

  /**
   * Set a single item
   */
  set<T>(storeName: string, key: string, value: T): Promise<void>;

  /**
   * Get all items from a store
   */
  getAll<T>(storeName: string): Promise<T[]>;

  /**
   * Query items with filters
   */
  query<T>(
    storeName: string,
    filter?: (item: T) => boolean
  ): Promise<T[]>;

  /**
   * Delete a single item
   */
  delete(storeName: string, key: string): Promise<void>;

  /**
   * Delete multiple items
   */
  deleteMany(storeName: string, keys: string[]): Promise<void>;

  /**
   * Clear all items in a store
   */
  clear(storeName: string): Promise<void>;

  /**
   * Get count of items in a store
   */
  count(storeName: string): Promise<number>;

  /**
   * Bulk operations
   */
  bulkSet<T>(storeName: string, items: Array<{ key: string; value: T }>): Promise<void>;

  /**
   * Close the storage connection
   */
  close(): Promise<void>;
}

export interface StorageConfig {
  name: string;
  version: number;
  stores: string[];
}
