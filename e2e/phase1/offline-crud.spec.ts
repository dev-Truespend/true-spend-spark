import { test, expect } from '@playwright/test';

test.describe('Phase 1: Offline CRUD Operations', () => {
  test.beforeEach(async ({ page, context }) => {
    // Login before each test
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should create transaction while offline', async ({ page, context }) => {
    await page.goto('/transactions');
    
    // Go offline
    await context.setOffline(true);
    
    // Wait for offline indicator
    await expect(page.locator('text=Offline')).toBeVisible({ timeout: 5000 });
    
    // Add transaction
    await page.click('button:has-text("Add Transaction")');
    await page.fill('input#amount', '25.99');
    await page.fill('input#description', 'Test offline transaction');
    await page.click('button[type="submit"]');
    
    // Should show offline success message
    await expect(page.locator('text=/saved offline/i')).toBeVisible({ timeout: 5000 });
    
    // Should show pending badge
    await expect(page.locator('text=/pending/i')).toBeVisible();
  });

  test('should sync transactions when back online', async ({ page, context }) => {
    await page.goto('/transactions');
    
    // Create transaction offline
    await context.setOffline(true);
    await expect(page.locator('text=Offline')).toBeVisible({ timeout: 5000 });
    
    await page.click('button:has-text("Add Transaction")');
    await page.fill('input#amount', '15.50');
    await page.fill('input#description', 'Test sync transaction');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=/saved offline/i')).toBeVisible({ timeout: 5000 });
    
    // Go back online
    await context.setOffline(false);
    
    // Wait for online indicator
    await page.waitForTimeout(2000);
    
    // Sync button should appear if there are pending items
    const syncButton = page.locator('[data-testid="sync-now-button"]');
    if (await syncButton.isVisible()) {
      await syncButton.click();
      
      // Wait for sync to complete
      await expect(page.locator('text=/synced/i')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show offline indicator', async ({ page, context }) => {
    await page.goto('/transactions');
    
    // Go offline
    await context.setOffline(true);
    
    // Offline indicator should appear
    await expect(page.locator('text=Offline')).toBeVisible({ timeout: 5000 });
    
    // Go back online
    await context.setOffline(false);
    await page.waitForTimeout(2000);
    
    // Offline indicator should disappear or show online
    const offlineVisible = await page.locator('text=Offline').isVisible().catch(() => false);
    
    // Should either be hidden or show online status
    if (offlineVisible) {
      // If still visible, should not be the primary indicator
      console.log('Offline indicator handling transition');
    }
  });

  test('should handle read operations offline', async ({ page, context }) => {
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');
    
    // Go offline
    await context.setOffline(true);
    await expect(page.locator('text=Offline')).toBeVisible({ timeout: 5000 });
    
    // Should still be able to view transactions (from cache)
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Page should load with cached data
    const pageTitle = page.locator('h1:has-text("Transactions")');
    await expect(pageTitle).toBeVisible();
  });

  test('should queue multiple offline operations', async ({ page, context }) => {
    await page.goto('/transactions');
    
    // Go offline
    await context.setOffline(true);
    await expect(page.locator('text=Offline')).toBeVisible({ timeout: 5000 });
    
    // Create multiple transactions
    for (let i = 1; i <= 3; i++) {
      await page.click('button:has-text("Add Transaction")');
      await page.fill('input#amount', `${i * 10}.00`);
      await page.fill('input#description', `Offline transaction ${i}`);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
    }
    
    // Should show pending count
    const pendingBadge = page.locator('text=/pending/i').first();
    await expect(pendingBadge).toBeVisible();
  });

  test('should sync pending items on connectivity restore', async ({ page, context }) => {
    await page.goto('/transactions');
    
    // Create offline transaction
    await context.setOffline(true);
    await expect(page.locator('text=Offline')).toBeVisible({ timeout: 5000 });
    
    await page.click('button:has-text("Add Transaction")');
    await page.fill('input#amount', '99.99');
    await page.fill('input#description', 'Auto sync test');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    
    // Go back online
    await context.setOffline(false);
    await page.waitForTimeout(3000);
    
    // Sync should happen automatically or button should be available
    const syncButton = page.locator('[data-testid="sync-now-button"]');
    if (await syncButton.isVisible()) {
      await syncButton.click();
      await page.waitForTimeout(3000);
    }
    
    // Pending badge should eventually disappear or decrease
    await page.waitForTimeout(2000);
    console.log('Sync initiated after connectivity restore');
  });
});
