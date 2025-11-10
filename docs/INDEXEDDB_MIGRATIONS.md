# IndexedDB Migration Guide

## Overview

The IndexedDB migration system allows safe schema changes without losing user data. This guide explains how to create and apply migrations.

## Current Version

**Database Version:** 1  
**Database Name:** `truespend-offline`

## Migration System

### How It Works

1. Increment `DB_VERSION` constant in `src/lib/db/indexedDB.ts`
2. Add migration handler to `migrations` object
3. Migration runs automatically on next database open
4. User data is preserved during upgrade

### Example: Adding a New Index

```typescript
// In src/lib/db/indexedDB.ts

const DB_VERSION = 2; // Increment version

const migrations: Record<number, MigrationHandler> = {
  2: async (db, oldVersion, newVersion) => {
    const tx = db.transaction('transactions', 'readwrite');
    const store = tx.objectStore('transactions');
    
    // Add new index
    if (!store.indexNames.contains('by-category')) {
      store.createIndex('by-category', 'category');
    }
    
    await tx.done;
  },
};
```

### Example: Adding a New Column

```typescript
const DB_VERSION = 3;

const migrations: Record<number, MigrationHandler> = {
  3: async (db, oldVersion, newVersion) => {
    const tx = db.transaction('transactions', 'readwrite');
    const store = tx.objectStore('transactions');
    
    // Get all records
    const allRecords = await store.getAll();
    
    // Update each record with new field
    for (const record of allRecords) {
      if (!record.receipt_url) {
        record.receipt_url = null; // Add default value
        await store.put(record);
      }
    }
    
    await tx.done;
  },
};
```

### Example: Adding a New Store

```typescript
const DB_VERSION = 4;

const migrations: Record<number, MigrationHandler> = {
  4: async (db, oldVersion, newVersion) => {
    // Create new object store
    if (!db.objectStoreNames.contains('receipts')) {
      const receiptStore = db.createObjectStore('receipts', { keyPath: 'id' });
      receiptStore.createIndex('by-transaction', 'transaction_id');
      receiptStore.createIndex('by-synced', 'synced');
    }
  },
};
```

## Migration Utilities

### Export Data (Backup)

```typescript
import { exportData } from '@/lib/db/indexedDB';

// Export all data to JSON
const backup = await exportData();
localStorage.setItem('db_backup', JSON.stringify(backup));
```

### Import Data (Restore)

```typescript
import { importData } from '@/lib/db/indexedDB';

// Restore from backup
const backup = JSON.parse(localStorage.getItem('db_backup') || '{}');
await importData(backup);
```

### Check Current Version

```typescript
import { getCurrentDBVersion } from '@/lib/db/indexedDB';

const version = await getCurrentDBVersion();
console.log('Current DB version:', version);
```

### Register Dynamic Migration

```typescript
import { registerMigration } from '@/lib/db/indexedDB';

// Register a migration at runtime (before initDB)
registerMigration(5, async (db, oldVersion, newVersion) => {
  // Migration logic
});
```

## Best Practices

### 1. Always Increment Version

```typescript
// ❌ WRONG - Don't modify existing version
const DB_VERSION = 1;
const migrations = {
  1: async (db) => { /* new logic */ }
};

// ✅ CORRECT - Add new version
const DB_VERSION = 2;
const migrations = {
  2: async (db) => { /* new logic */ }
};
```

### 2. Check Before Creating

```typescript
// ✅ CORRECT - Check existence before creating
if (!db.objectStoreNames.contains('newStore')) {
  db.createObjectStore('newStore', { keyPath: 'id' });
}

if (!store.indexNames.contains('newIndex')) {
  store.createIndex('newIndex', 'field');
}
```

### 3. Provide Default Values

```typescript
// ✅ CORRECT - Always provide defaults for new fields
for (const record of allRecords) {
  if (record.newField === undefined) {
    record.newField = null; // or appropriate default
    await store.put(record);
  }
}
```

### 4. Test Migrations

```typescript
// Test migration from version 1 to 2
import { exportData, clearAllData, importData, initDB } from '@/lib/db/indexedDB';

// 1. Export data at version 1
const backup = await exportData();

// 2. Clear database
await clearAllData();

// 3. Update DB_VERSION to 2 in code

// 4. Reinitialize (runs migration)
await initDB();

// 5. Verify data integrity
const restored = await exportData();
// Compare backup vs restored
```

## Migration Checklist

Before deploying a migration:

- [ ] Increment `DB_VERSION` constant
- [ ] Add migration handler to `migrations` object
- [ ] Check for existence before creating stores/indexes
- [ ] Provide default values for new fields
- [ ] Test migration with real data
- [ ] Export backup before testing
- [ ] Verify all data preserved after migration
- [ ] Update TypeScript types if schema changed
- [ ] Document migration in changelog

## Rollback Strategy

IndexedDB doesn't support automatic rollbacks. To rollback:

```typescript
// 1. User exports data before update
const backup = await exportData();

// 2. If migration fails, restore from backup
await clearAllData();
await importData(backup);
```

## Common Errors

### Error: "Store already exists"

```typescript
// ❌ WRONG
db.createObjectStore('transactions', { keyPath: 'id' });

// ✅ CORRECT
if (!db.objectStoreNames.contains('transactions')) {
  db.createObjectStore('transactions', { keyPath: 'id' });
}
```

### Error: "Index already exists"

```typescript
// ❌ WRONG
store.createIndex('by-synced', 'synced');

// ✅ CORRECT
if (!store.indexNames.contains('by-synced')) {
  store.createIndex('by-synced', 'synced');
}
```

### Error: "Transaction inactive"

```typescript
// ❌ WRONG
const store = tx.objectStore('transactions');
await someAsyncOperation(); // tx becomes inactive
await store.put(data); // Error

// ✅ CORRECT
const tx = db.transaction('transactions', 'readwrite');
await tx.objectStore('transactions').put(data);
await tx.done;
```

## Future Schema Changes

When planning schema changes:

1. **Adding data**: Always provide defaults
2. **Removing data**: Keep old fields for backward compatibility
3. **Renaming**: Create new field, copy data, deprecate old field
4. **Type changes**: Create new field with new type, migrate data

## Support

For migration issues:
- Check browser console for migration logs: `[IndexedDB] Upgrading from version X to Y`
- Export data before complex migrations
- Test with small datasets first
