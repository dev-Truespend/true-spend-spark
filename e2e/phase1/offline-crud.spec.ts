import { test, expect } from '@playwright/test';

test.describe('Phase 1: Offline CRUD Operations', () => {
  test.beforeEach(async ({ page, context }) => {
    // Login first
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should create transaction while offline', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    
    // Navigate to transactions
    await page.goto('/transactions');
    
    // Create transaction
    await page.click('button:has-text("Add Transaction")');
    await page.fill('input[name="amount"]', '50.00');
    await page.fill('input[name="description"]', 'Offline Test Transaction');
    await page.selectOption('select[name="category"]', 'Dining');
    await page.click('button:has-text("Save")');
    
    // Verify offline indicator shows
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Verify transaction appears with pending sync badge
    await expect(page.locator('text=Offline Test Transaction')).toBeVisible();
    await expect(page.locator('[data-testid="sync-pending"]')).toBeVisible();
  });

  test('should sync transactions when back online', async ({ page, context }) => {
    // Create offline transaction
    await context.setOffline(true);
    await page.goto('/transactions');
    await page.click('button:has-text("Add Transaction")');
    await page.fill('input[name="amount"]', '25.00');
    await page.fill('input[name="description"]', 'Will Sync Soon');
    await page.click('button:has-text("Save")');
    
    // Go back online
    await context.setOffline(false);
    
    // Wait for sync
    await page.waitForSelector('[data-testid="sync-pending"]', { state: 'hidden', timeout: 10000 });
    
    // Verify synced badge appears
    await expect(page.locator('[data-testid="synced"]')).toBeVisible();
  });

  test('should update transaction offline', async ({ page, context }) => {
    // Create transaction first
    await page.goto('/transactions');
    await page.click('button:has-text("Add Transaction")');
    await page.fill('input[name="amount"]', '100.00');
    await page.fill('input[name="description"]', 'Original Description');
    await page.click('button:has-text("Save")');
    
    // Go offline and edit
    await context.setOffline(true);
    await page.click('[data-testid="edit-transaction"]').first();
    await page.fill('input[name="description"]', 'Updated Offline');
    await page.click('button:has-text("Save")');
    
    // Verify updated
    await expect(page.locator('text=Updated Offline')).toBeVisible();
    await expect(page.locator('[data-testid="sync-pending"]')).toBeVisible();
  });

  test('should queue delete operations offline', async ({ page, context }) => {
    // Create transaction
    await page.goto('/transactions');
    await page.click('button:has-text("Add Transaction")');
    await page.fill('input[name="amount"]', '30.00');
    await page.fill('input[name="description"]', 'To Be Deleted');
    await page.click('button:has-text("Save")');
    
    // Go offline and attempt delete
    await context.setOffline(true);
    
    // Delete button should be disabled offline
    await expect(page.locator('[data-testid="delete-transaction"]').first()).toBeDisabled();
    
    // Verify warning message
    await expect(page.locator('text=Delete is disabled while offline')).toBeVisible();
  });
});
