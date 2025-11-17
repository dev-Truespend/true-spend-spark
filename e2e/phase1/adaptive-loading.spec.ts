import { test, expect } from '@playwright/test';

test.describe('Phase 1: Adaptive Loading', () => {
  test('should show fast network indicators', async ({ page, context }) => {
    // Simulate fast connection
    await context.route('**/*', (route) => {
      setTimeout(() => route.continue(), 10); // 10ms delay
    });
    
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    await page.goto('/transactions');
    
    // Verify fast network indicator
    await expect(page.locator('[data-testid="network-quality"]')).toHaveText(/fast|good/i);
  });

  test('should adapt UI for slow connections', async ({ page, context }) => {
    // Simulate slow connection (2G)
    await context.route('**/*', (route) => {
      setTimeout(() => route.continue(), 2000); // 2s delay
    });
    
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    await page.goto('/transactions');
    
    // Verify slow network indicator
    await expect(page.locator('[data-testid="network-quality"]')).toHaveText(/slow/i);
    
    // Verify adaptive features activated
    await expect(page.locator('[data-testid="low-quality-mode"]')).toBeVisible();
  });

  test('should cache API responses', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // First load - should fetch from API
    await page.goto('/transactions');
    await page.waitForSelector('[data-testid="transaction-list"]');
    
    // Second load - should use cache (instant)
    const startTime = Date.now();
    await page.reload();
    const loadTime = Date.now() - startTime;
    
    // Cache load should be < 500ms
    expect(loadTime).toBeLessThan(500);
  });
});
