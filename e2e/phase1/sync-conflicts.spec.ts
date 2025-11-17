import { test, expect } from '@playwright/test';

test.describe('Phase 1: Sync Conflict Resolution', () => {
  test('should detect and resolve conflicts', async ({ page, context }) => {
    // Login
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    // Create transaction
    await page.goto('/transactions');
    await page.click('button:has-text("Add Transaction")');
    await page.fill('input[name="amount"]', '75.00');
    await page.fill('input[name="description"]', 'Conflict Test');
    await page.click('button:has-text("Save")');
    
    // Simulate conflict scenario:
    // 1. Go offline
    await context.setOffline(true);
    
    // 2. Edit locally
    await page.click('[data-testid="edit-transaction"]').first();
    await page.fill('input[name="description"]', 'Local Version');
    await page.click('button:has-text("Save")');
    
    // 3. Simulate remote change (in real app, another device edited)
    // For test, we'll mock this via localStorage
    await page.evaluate(() => {
      localStorage.setItem('mock_conflict', JSON.stringify({
        table: 'transactions',
        recordId: 'test-id',
        localData: { description: 'Local Version' },
        remoteData: { description: 'Remote Version' },
        localTimestamp: new Date().toISOString(),
        remoteTimestamp: new Date(Date.now() + 1000).toISOString(),
      }));
    });
    
    // 4. Go back online - should trigger conflict detection
    await context.setOffline(false);
    
    // 5. Verify conflict dialog appears
    await expect(page.locator('[data-testid="conflict-dialog"]')).toBeVisible({ timeout: 5000 });
    
    // 6. Verify both versions are shown
    await expect(page.locator('text=Local Version')).toBeVisible();
    await expect(page.locator('text=Remote Version')).toBeVisible();
    
    // 7. Choose local version
    await page.click('button:has-text("Use Local Version")');
    
    // 8. Verify conflict resolved
    await expect(page.locator('[data-testid="conflict-dialog"]')).not.toBeVisible();
    await expect(page.locator('text=Local Version')).toBeVisible();
  });

  test('should handle multiple conflicts', async ({ page }) => {
    // Create multiple transactions and simulate conflicts
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Mock 3 conflicts
    await page.evaluate(() => {
      localStorage.setItem('mock_conflicts', JSON.stringify([
        { table: 'transactions', recordId: 'id1', localData: { description: 'Local 1' }, remoteData: { description: 'Remote 1' } },
        { table: 'transactions', recordId: 'id2', localData: { description: 'Local 2' }, remoteData: { description: 'Remote 2' } },
        { table: 'budgets', recordId: 'id3', localData: { limit_amount: 500 }, remoteData: { limit_amount: 600 } },
      ]));
    });
    
    await page.goto('/transactions');
    
    // Verify conflict count
    await expect(page.locator('[data-testid="conflict-count"]')).toHaveText('3');
    
    // Resolve first conflict
    await page.click('button:has-text("Review Conflicts")');
    await page.click('button:has-text("Use Remote Version")').first();
    
    // Verify count decreased
    await expect(page.locator('[data-testid="conflict-count"]')).toHaveText('2');
  });
});
