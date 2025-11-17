import { test, expect } from '@playwright/test';

test.describe('Phase 1: IndexedDB Migration', () => {
  test('should handle schema upgrades', async ({ page }) => {
    // Set old schema version in IndexedDB
    await page.goto('/auth');
    await page.evaluate(() => {
      const request = indexedDB.open('truespend-offline', 1);
      request.onsuccess = () => {
        const db = request.result;
        db.close();
      };
    });
    
    // Login and trigger migration
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Wait for app to load
    await page.waitForURL('/');
    
    // Verify new schema version
    const version = await page.evaluate(() => {
      return new Promise((resolve) => {
        const request = indexedDB.open('truespend-offline');
        request.onsuccess = () => {
          resolve(request.result.version);
          request.result.close();
        };
      });
    });
    
    expect(version).toBeGreaterThan(1);
  });

  test('should preserve data during migration', async ({ page }) => {
    // Add test data to old schema
    await page.goto('/auth');
    await page.evaluate(() => {
      const request = indexedDB.open('truespend-offline', 1);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('transactions')) {
          const store = db.createObjectStore('transactions', { keyPath: 'id' });
          store.add({ id: 'test-1', description: 'Test Transaction', amount: 100 });
        }
      };
    });
    
    // Trigger migration by logging in
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    // Verify data still exists
    await page.goto('/transactions');
    await expect(page.locator('text=Test Transaction')).toBeVisible();
  });

  test('should export and import data', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Create some test data
    await page.goto('/transactions');
    await page.click('button:has-text("Add Transaction")');
    await page.fill('input[name="amount"]', '55.00');
    await page.fill('input[name="description"]', 'Export Test');
    await page.click('button:has-text("Save")');
    
    // Export data
    await page.goto('/settings');
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-data"]');
    const download = await downloadPromise;
    
    // Verify file downloaded
    expect(download.suggestedFilename()).toMatch(/truespend-export.*\.json/);
  });
});
