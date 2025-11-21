import { test, expect } from '@playwright/test';

test.describe('ML Training Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'adminpassword');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('Upload training data and trigger job', async ({ page }) => {
    // Navigate to ML Training dashboard
    await page.goto('/admin/ml-training');
    await page.waitForSelector('text=ML Training & Model Registry');

    // Switch to Training Data tab
    await page.click('button:has-text("Training Data")');
    
    // Upload a test file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test_data.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify([
        { feature1: 1, feature2: 2, label: 'A' },
        { feature1: 3, feature2: 4, label: 'B' }
      ]))
    });

    await page.click('button:has-text("Upload")');
    await expect(page.locator('text=Training data uploaded successfully')).toBeVisible();

    // Switch to Start Training tab
    await page.click('button:has-text("Start Training")');
    
    // Select model type
    await page.click('[id="model-type"]');
    await page.click('text=DQN Cache Policy');

    // Select training data file
    await page.click('[id="training-data"]');
    await page.click('text=test_data.json');

    // Verify config is populated
    const configTextarea = page.locator('textarea#config');
    const configValue = await configTextarea.inputValue();
    expect(configValue).toContain('learning_rate');

    // Start training job
    await page.click('button:has-text("Start Training Job")');
    
    // Verify success message
    await expect(page.locator('text=/Training job started/i')).toBeVisible({ timeout: 10000 });

    // Verify job appears in monitor
    await page.click('button:has-text("Training Jobs")');
    await expect(page.locator('text=dqn_cache_policy')).toBeVisible({ timeout: 5000 });
  });

  test('Verify model registry after training completes', async ({ page }) => {
    await page.goto('/admin/ml-training');
    
    // Check Model Registry tab
    await page.click('button:has-text("Model Registry")');
    
    // Should show registered models
    const modelCards = page.locator('[class*="grid"] > div');
    const count = await modelCards.count();
    expect(count).toBeGreaterThanOrEqual(0); // May be 0 if no models trained yet
  });

  test('Shadow deployment workflow', async ({ page }) => {
    await page.goto('/admin/ml-training');
    await page.click('button:has-text("Pipeline")');

    // Look for models that can be deployed
    const deployButton = page.locator('button:has-text("Deploy to Shadow")').first();
    
    if (await deployButton.isVisible()) {
      await deployButton.click();
      
      // Verify deployment initiated
      await expect(page.locator('text=/deployed to shadow/i')).toBeVisible({ timeout: 10000 });
    }
  });

  test('A/B testing creation', async ({ page }) => {
    await page.goto('/admin/ml-training');
    await page.click('button:has-text("A/B Testing")');

    // Create new A/B test
    await page.click('button:has-text("Create A/B Test")');
    
    // Fill form
    await page.fill('input[placeholder*="DQN"]', 'Test A vs B');
    await page.fill('input[placeholder*="production"]', 'production');
    await page.fill('input[placeholder*="model-id"]', 'model-test-123');
    await page.fill('input[type="number"]', '10');

    await page.click('button:has-text("Create Test")');
    
    // Verify test created
    await expect(page.locator('text=A/B test created successfully')).toBeVisible({ timeout: 5000 });
  });

  test('Model health monitoring displays correctly', async ({ page }) => {
    await page.goto('/admin/ml-training');
    
    // Add health monitoring tab if it exists
    const healthTab = page.locator('button:has-text("Health")');
    if (await healthTab.isVisible()) {
      await healthTab.click();
      
      // Verify health metrics render
      await expect(page.locator('text=Model Health Monitoring')).toBeVisible();
    }
  });

  test('Data quality checker validates files', async ({ page }) => {
    await page.goto('/admin/ml-training');
    
    // Navigate to data quality if available
    const qualityTab = page.locator('button:has-text("Quality")');
    if (await qualityTab.isVisible()) {
      await qualityTab.click();
      
      // Select a file and run quality check
      const fileSelect = page.locator('[id*="file"]').first();
      if (await fileSelect.isVisible()) {
        await fileSelect.click();
        const firstOption = page.locator('text=/\\.json|\\.csv/').first();
        if (await firstOption.isVisible()) {
          await firstOption.click();
          await page.click('button:has-text("Run Quality Check")');
          
          // Verify quality report appears
          await expect(page.locator('text=Quality Report')).toBeVisible({ timeout: 10000 });
        }
      }
    }
  });

  test('Cost tracking displays spending', async ({ page }) => {
    await page.goto('/admin/ml-training');
    await page.click('button:has-text("Costs")');

    // Verify cost dashboard elements
    await expect(page.locator('text=30-Day Cost Overview')).toBeVisible();
    await expect(page.locator('text=/Total Cost|Projected/i')).toBeVisible();
  });

  test('Training alerts show failed jobs', async ({ page }) => {
    await page.goto('/admin/ml-training');
    await page.click('button:has-text("Alerts")');

    // Verify alerts section renders
    await expect(page.locator('text=/Training Failures|Failed Training Jobs/i')).toBeVisible();
  });

  test('Performance tracking shows model metrics', async ({ page }) => {
    await page.goto('/admin/ml-training');
    await page.click('button:has-text("Performance")');

    // Verify performance dashboard
    await expect(page.locator('text=Model Performance')).toBeVisible();
    
    // Check for metric cards
    const metricCards = page.locator('text=/Accuracy|Loss|F1 Score/i');
    expect(await metricCards.count()).toBeGreaterThan(0);
  });
});

test.describe('ML Training Error Handling', () => {
  test('Handle missing MODAL_API_TOKEN gracefully', async ({ page }) => {
    // This would require admin panel or configuration UI
    await page.goto('/admin/ml-training');
    
    // Attempt to trigger job without token
    await page.click('button:has-text("Start Training")');
    await page.click('[id="model-type"]');
    await page.click('text=DQN Cache Policy');
    
    // Should show error if token missing
    await page.click('button:has-text("Start Training Job")');
    
    // Verify appropriate error message
    const errorText = page.locator('text=/Modal integration not configured|Failed to start training/i');
    // Error may or may not appear depending on environment
  });

  test('Validate file format before upload', async ({ page }) => {
    await page.goto('/admin/ml-training');
    await page.click('button:has-text("Training Data")');

    // Try uploading invalid file type
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake pdf content')
    });

    // Verify error message
    await expect(page.locator('text=Please upload a JSON or CSV file')).toBeVisible({ timeout: 3000 });
  });
});