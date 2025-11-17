import { test, expect } from '@playwright/test';

test.describe('Phase 1: Camera & OCR Integration', () => {
  test('should request camera permissions', async ({ page, context }) => {
    // Grant camera permissions
    await context.grantPermissions(['camera']);
    
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    await page.goto('/transactions');
    
    // Click camera button
    await page.click('[data-testid="camera-button"]');
    
    // Verify camera component loads
    await expect(page.locator('[data-testid="camera-preview"]')).toBeVisible();
  });

  test('should show OCR quality indicator', async ({ page, context }) => {
    await context.grantPermissions(['camera']);
    
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    await page.goto('/transactions');
    await page.click('[data-testid="camera-button"]');
    
    // Simulate image capture
    await page.click('[data-testid="capture-button"]');
    
    // Verify OCR quality indicator appears
    await expect(page.locator('[data-testid="ocr-quality"]')).toBeVisible({ timeout: 3000 });
  });

  test('should preprocess images before OCR', async ({ page, context }) => {
    await context.grantPermissions(['camera']);
    
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    await page.goto('/transactions');
    await page.click('[data-testid="camera-button"]');
    await page.click('[data-testid="capture-button"]');
    
    // Verify preprocessing steps
    await expect(page.locator('text=Optimizing image...')).toBeVisible();
    await expect(page.locator('text=Quality: Good')).toBeVisible({ timeout: 5000 });
  });
});
