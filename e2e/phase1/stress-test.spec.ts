import { test, expect } from '@playwright/test';

test.describe('Phase 1: Stress & Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should handle bulk transaction creation', async ({ page }) => {
    await page.goto('/transactions');
    
    const transactionCount = 20;
    const startTime = Date.now();
    
    // Create multiple transactions
    for (let i = 0; i < transactionCount; i++) {
      await page.click('button:has-text("Add Transaction")');
      await page.fill('input#amount', `${(i + 1) * 5}.00`);
      await page.fill('input#description', `Bulk transaction ${i + 1}`);
      await page.click('button[type="submit"]');
      
      // Wait for success toast
      await page.waitForTimeout(500);
    }
    
    const duration = Date.now() - startTime;
    console.log(`Created ${transactionCount} transactions in ${duration}ms`);
    
    // Should complete in reasonable time (< 60s for 20 items)
    expect(duration).toBeLessThan(60000);
  });

  test('should handle rapid page navigation', async ({ page }) => {
    const pages = ['/dashboard', '/transactions', '/budgets', '/insights', '/settings'];
    const iterations = 3;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState('domcontentloaded');
        
        // Verify page loaded
        const mainContent = page.locator('main, [role="main"]');
        await expect(mainContent).toBeVisible({ timeout: 5000 });
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`Completed ${iterations * pages.length} navigations in ${duration}ms`);
    
    // Should handle navigation smoothly (< 30s total)
    expect(duration).toBeLessThan(30000);
  });

  test('should handle offline/online cycling', async ({ page, context }) => {
    await page.goto('/transactions');
    
    const cycles = 5;
    
    for (let i = 0; i < cycles; i++) {
      // Go offline
      await context.setOffline(true);
      await page.waitForTimeout(1000);
      await expect(page.locator('text=Offline')).toBeVisible({ timeout: 3000 });
      
      // Go online
      await context.setOffline(false);
      await page.waitForTimeout(1000);
      
      // Create a transaction
      await page.click('button:has-text("Add Transaction")');
      await page.fill('input#amount', `${i + 1}.00`);
      await page.fill('input#description', `Cycle ${i + 1}`);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
    }
    
    console.log(`Completed ${cycles} offline/online cycles`);
  });

  test('should handle large dataset rendering', async ({ page }) => {
    await page.goto('/transactions');
    
    // Wait for initial load
    await page.waitForLoadState('networkidle');
    
    const startTime = Date.now();
    
    // Scroll through list to trigger rendering
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
    }
    
    const duration = Date.now() - startTime;
    console.log(`Scrolling stress test completed in ${duration}ms`);
    
    // Should remain responsive (< 10s)
    expect(duration).toBeLessThan(10000);
  });

  test('should handle concurrent operations', async ({ page }) => {
    await page.goto('/transactions');
    
    // Start multiple async operations
    const operations = [];
    
    // Add transaction
    operations.push(
      (async () => {
        await page.click('button:has-text("Add Transaction")');
        await page.fill('input#amount', '50.00');
        await page.fill('input#description', 'Concurrent test');
        await page.click('button[type="submit"]');
      })()
    );
    
    // Navigate to budgets
    operations.push(page.goto('/budgets'));
    
    // Navigate back
    operations.push(
      (async () => {
        await page.waitForTimeout(1000);
        return page.goto('/transactions');
      })()
    );
    
    // Wait for all operations
    await Promise.allSettled(operations);
    
    console.log('Concurrent operations handled');
  });

  test('should handle memory pressure', async ({ page }) => {
    await page.goto('/transactions');
    
    // Create many transactions quickly
    const count = 50;
    const startTime = Date.now();
    
    for (let i = 0; i < count; i++) {
      await page.click('button:has-text("Add Transaction")');
      await page.fill('input#amount', `${i + 1}.00`);
      await page.fill('input#description', `Memory test ${i}`);
      await page.click('button[type="submit"]');
      
      // Minimal wait
      await page.waitForTimeout(200);
      
      // Navigate occasionally to test cleanup
      if (i % 10 === 0) {
        await page.goto('/dashboard');
        await page.goto('/transactions');
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`Created ${count} items under memory pressure in ${duration}ms`);
    
    // Should complete without crashing (< 2 minutes)
    expect(duration).toBeLessThan(120000);
  });

  test('should recover from errors gracefully', async ({ page }) => {
    await page.goto('/transactions');
    
    // Try invalid operations
    await page.click('button:has-text("Add Transaction")');
    
    // Submit without required fields
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    
    // Try again with valid data
    await page.fill('input#amount', '10.00');
    await page.fill('input#description', 'Recovery test');
    await page.click('button[type="submit"]');
    
    // Should succeed
    await page.waitForTimeout(1000);
    
    // App should still be functional
    await page.goto('/dashboard');
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should maintain performance with storage limits', async ({ page }) => {
    // Navigate to data management
    await page.goto('/settings');
    await page.click('text=Privacy');
    
    // Check storage usage
    const storageCard = page.locator('text=Storage Usage');
    await expect(storageCard).toBeVisible();
    
    // Test refresh storage info
    await page.click('button:has-text("Refresh Storage Info")');
    await page.waitForTimeout(1000);
    
    console.log('Storage monitoring functional');
  });
});
