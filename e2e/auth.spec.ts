import { test, expect } from '@playwright/test';

test.describe('Authentication Smoke Tests', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check for auth form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows validation errors for invalid email', async ({ page }) => {
    await page.goto('/');
    
    // Fill in invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should show validation error
    await expect(page.locator('text=/invalid.*email/i')).toBeVisible({ timeout: 5000 });
  });

  test('Google sign-in button is present', async ({ page }) => {
    await page.goto('/');
    
    // Check for Google sign-in button
    await expect(page.locator('button:has-text("Google")')).toBeVisible();
  });

  test('forgot password link works', async ({ page }) => {
    await page.goto('/');
    
    // Click forgot password
    await page.click('text=/forgot.*password/i');
    
    // Should navigate to forgot password page
    await expect(page).toHaveURL(/forgot-password/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

test.describe('Password Reset Flow', () => {
  test('password reset page loads', async ({ page }) => {
    await page.goto('/forgot-password');
    
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});

// Note: Full authentication tests require valid credentials
// These smoke tests ensure the UI is functioning correctly
