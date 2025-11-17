/**
 * IndexedDB Health Check Utility
 * 
 * Provides diagnostics and monitoring for IndexedDB operations.
 * Used for troubleshooting offline storage issues.
 */

import { initDB, getCurrentDBVersion, getAllItems } from './indexedDB';

export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'error';
  checks: HealthCheck[];
  summary: {
    totalStores: number;
    totalRecords: number;
    dbVersion: number;
    quotaUsed: number;
    quotaAvailable: number;
  };
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
}

/**
 * Run comprehensive health check on IndexedDB
 */
export async function runHealthCheck(): Promise<HealthCheckResult> {
  const checks: HealthCheck[] = [];
  const startTime = performance.now();

  console.log('[IndexedDB Health] Starting health check...');

  // Check 1: Database initialization
  try {
    const db = await initDB();
    checks.push({
      name: 'Database Initialization',
      status: 'pass',
      message: 'Database initialized successfully',
      details: { version: db.version, name: db.name },
    });
  } catch (error) {
    checks.push({
      name: 'Database Initialization',
      status: 'fail',
      message: `Failed to initialize database: ${error}`,
    });
    return createFailedResult(checks);
  }

  // Check 2: Verify all object stores exist
  const db = await initDB();
  const expectedStores = ['transactions', 'budgets', 'geofences', 'syncQueue', 'settings'];
  const existingStores = Array.from(db.objectStoreNames);
  const missingStores = expectedStores.filter(store => !existingStores.includes(store));

  if (missingStores.length === 0) {
    checks.push({
      name: 'Object Stores',
      status: 'pass',
      message: 'All required stores exist',
      details: { stores: existingStores },
    });
  } else {
    checks.push({
      name: 'Object Stores',
      status: 'fail',
      message: `Missing stores: ${missingStores.join(', ')}`,
      details: { missing: missingStores, existing: existingStores },
    });
  }

  // Check 3: Count records in each store
  let totalRecords = 0;
  const storeCounts: Record<string, number> = {};

  for (const storeName of expectedStores) {
    try {
      if (existingStores.includes(storeName)) {
        const items = await getAllItems(storeName as any);
        storeCounts[storeName] = items.length;
        totalRecords += items.length;
      }
    } catch (error) {
      checks.push({
        name: `Store Access: ${storeName}`,
        status: 'fail',
        message: `Cannot read from ${storeName}: ${error}`,
      });
    }
  }

  checks.push({
    name: 'Record Counts',
    status: 'pass',
    message: `Total ${totalRecords} records across all stores`,
    details: storeCounts,
  });

  // Check 4: Storage quota
  let quotaUsed = 0;
  let quotaAvailable = 0;

  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      quotaUsed = estimate.usage || 0;
      quotaAvailable = estimate.quota || 0;
      const percentUsed = ((quotaUsed / quotaAvailable) * 100).toFixed(2);

      const status = parseFloat(percentUsed) > 80 ? 'warn' : 'pass';
      checks.push({
        name: 'Storage Quota',
        status,
        message: `Using ${formatBytes(quotaUsed)} of ${formatBytes(quotaAvailable)} (${percentUsed}%)`,
        details: { used: quotaUsed, available: quotaAvailable, percentUsed },
      });
    } catch (error) {
      checks.push({
        name: 'Storage Quota',
        status: 'warn',
        message: 'Cannot estimate storage quota',
      });
    }
  } else {
    checks.push({
      name: 'Storage Quota',
      status: 'warn',
      message: 'Storage API not supported',
    });
  }

  // Check 5: Database version
  const version = await getCurrentDBVersion();
  checks.push({
    name: 'Database Version',
    status: 'pass',
    message: `Current version: ${version}`,
    details: { version },
  });

  // Check 6: Performance test (write/read)
  try {
    const testKey = '__health_check_test__';
    const testData = { id: testKey, timestamp: Date.now(), data: 'test' };
    
    const writeStart = performance.now();
    await db.put('settings', testData, testKey);
    const writeEnd = performance.now();
    
    const readStart = performance.now();
    const result = await db.get('settings', testKey);
    const readEnd = performance.now();
    
    await db.delete('settings', testKey);

    const writeTime = writeEnd - writeStart;
    const readTime = readEnd - readStart;

    checks.push({
      name: 'Performance Test',
      status: writeTime < 100 && readTime < 50 ? 'pass' : 'warn',
      message: `Write: ${writeTime.toFixed(2)}ms, Read: ${readTime.toFixed(2)}ms`,
      details: { writeTime, readTime },
    });
  } catch (error) {
    checks.push({
      name: 'Performance Test',
      status: 'fail',
      message: `Performance test failed: ${error}`,
    });
  }

  const endTime = performance.now();
  const totalTime = endTime - startTime;

  console.log(`[IndexedDB Health] Health check completed in ${totalTime.toFixed(2)}ms`);

  // Determine overall status
  const hasFailures = checks.some(c => c.status === 'fail');
  const hasWarnings = checks.some(c => c.status === 'warn');
  const overallStatus = hasFailures ? 'error' : hasWarnings ? 'warning' : 'healthy';

  return {
    status: overallStatus,
    checks,
    summary: {
      totalStores: existingStores.length,
      totalRecords,
      dbVersion: version,
      quotaUsed,
      quotaAvailable,
    },
  };
}

/**
 * Quick health check (minimal overhead)
 */
export async function quickHealthCheck(): Promise<boolean> {
  try {
    const db = await initDB();
    const expectedStores = ['transactions', 'budgets', 'geofences', 'syncQueue', 'settings'];
    return expectedStores.every(store => db.objectStoreNames.contains(store));
  } catch {
    return false;
  }
}

/**
 * Get storage statistics
 */
export async function getStorageStats() {
  const db = await initDB();
  const stores = ['transactions', 'budgets', 'geofences', 'syncQueue', 'settings'];
  const stats: Record<string, number> = {};

  for (const store of stores) {
    stats[store] = await db.count(store as any);
  }

  return stats;
}

/**
 * Helper to format bytes
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Helper to create failed result
 */
function createFailedResult(checks: HealthCheck[]): HealthCheckResult {
  return {
    status: 'error',
    checks,
    summary: {
      totalStores: 0,
      totalRecords: 0,
      dbVersion: 0,
      quotaUsed: 0,
      quotaAvailable: 0,
    },
  };
}
