import { test, expect } from '@playwright/test';

test.describe('Phase 1: Camera & OCR Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should show camera button on transactions page', async ({ page, context }) => {
    await context.grantPermissions(['camera']);
    
    await page.goto('/transactions');
    
    // Verify camera button is present
    const cameraButton = page.locator('[data-testid="camera-button"]');
    await expect(cameraButton).toBeVisible();
    await expect(cameraButton).toContainText('Scan Receipt');
  });

  test('should open receipt capture dialog', async ({ page, context }) => {
    await context.grantPermissions(['camera']);
    
    await page.goto('/transactions');
    
    // Click camera button
    await page.click('[data-testid="camera-button"]');
    
    // Verify dialog opens with receipt capture component
    await expect(page.locator('text=Scan Receipt').first()).toBeVisible();
    await expect(page.locator('text=Automatically extract transaction details')).toBeVisible();
  });

  test('should show camera capture button', async ({ page, context }) => {
    await context.grantPermissions(['camera']);
    
    await page.goto('/transactions');
    await page.click('[data-testid="camera-button"]');
    
    // Verify capture button or camera start button is visible
    const startButton = page.locator('button:has-text("Start Camera")');
    await expect(startButton).toBeVisible();
  });

  test('should handle camera permission denial gracefully', async ({ page, context }) => {
    // Don't grant camera permissions
    
    await page.goto('/transactions');
    await page.click('[data-testid="camera-button"]');
    
    // Dialog should still open
    await expect(page.locator('text=Scan Receipt').first()).toBeVisible();
    
    // Click start camera - should show error
    await page.click('button:has-text("Start Camera")');
    
    // Wait a moment for error handling
    await page.waitForTimeout(1000);
    
    // Error alert should be visible (implementation shows camera error)
    const alerts = page.locator('[role="alert"]');
    const alertCount = await alerts.count();
    expect(alertCount).toBeGreaterThan(0);
  });

  test('should allow canceling receipt capture', async ({ page, context }) => {
    await context.grantPermissions(['camera']);
    
    await page.goto('/transactions');
    await page.click('[data-testid="camera-button"]');
    
    // Verify dialog is open
    await expect(page.locator('text=Scan Receipt').first()).toBeVisible();
    
    // Click cancel button
    await page.click('button:has-text("Cancel")');
    
    // Dialog should close
    await page.waitForTimeout(500);
    const dialogVisible = await page.locator('text=Automatically extract transaction details').isVisible().catch(() => false);
    expect(dialogVisible).toBe(false);
  });
});
