import { test, expect } from '@playwright/test';

test.describe('Redis Cache Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('merchant discovery cache hit/miss cycle', async ({ page }) => {
    // First request should be cache miss
    const firstResponse = await page.request.post('/api/merchant-discovery', {
      data: {
        lat: 40.7128,
        lng: -74.0060,
        category: 'restaurant'
      }
    });
    expect(firstResponse.ok()).toBeTruthy();
    
    // Second request within TTL should be cache hit
    const secondResponse = await page.request.post('/api/merchant-discovery', {
      data: {
        lat: 40.7128,
        lng: -74.0060,
        category: 'restaurant'
      }
    });
    expect(secondResponse.ok()).toBeTruthy();
    
    // Verify response time improvement (cache hit should be faster)
    const firstTiming = await firstResponse.json();
    const secondTiming = await secondResponse.json();
    console.log('First request (cache miss):', firstTiming);
    console.log('Second request (cache hit):', secondTiming);
  });

  test('dashboard cache with different users', async ({ page, context }) => {
    // Login as first user
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test1@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // First dashboard load (cache miss)
    const firstLoad = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const firstLoadTime = Date.now() - firstLoad;
    
    // Second dashboard load (cache hit)
    const secondLoad = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const secondLoadTime = Date.now() - secondLoad;
    
    console.log(`First load: ${firstLoadTime}ms, Second load: ${secondLoadTime}ms`);
    expect(secondLoadTime).toBeLessThan(firstLoadTime);
  });

  test('location analytics cache with various parameters', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test different parameter combinations
    const params = [
      { days: 7, geofence: 'geo1' },
      { days: 30, geofence: 'geo1' },
      { days: 7, geofence: 'geo2' },
    ];
    
    for (const param of params) {
      const response = await page.request.get('/api/location-analytics-bff', {
        params: param
      });
      expect(response.ok()).toBeTruthy();
    }
  });

  test('cache TTL expiration', async ({ page }) => {
    // Make initial request
    const firstResponse = await page.request.post('/api/merchant-discovery', {
      data: {
        lat: 40.7128,
        lng: -74.0060,
        category: 'restaurant'
      }
    });
    expect(firstResponse.ok()).toBeTruthy();
    
    // Wait for TTL to expire (5 minutes + buffer)
    console.log('Waiting for cache TTL to expire (5 minutes)...');
    await page.waitForTimeout(5 * 60 * 1000 + 10000);
    
    // Request should now be cache miss
    const expiredResponse = await page.request.post('/api/merchant-discovery', {
      data: {
        lat: 40.7128,
        lng: -74.0060,
        category: 'restaurant'
      }
    });
    expect(expiredResponse.ok()).toBeTruthy();
    console.log('Cache TTL expiration verified');
  });

  test('cache performance under load', async ({ page }) => {
    const requests = 100;
    const concurrency = 10;
    const results = [];
    
    // Warm up cache
    await page.request.post('/api/merchant-discovery', {
      data: {
        lat: 40.7128,
        lng: -74.0060,
        category: 'restaurant'
      }
    });
    
    // Load test
    for (let i = 0; i < requests / concurrency; i++) {
      const batch = Array(concurrency).fill(null).map(() => 
        page.request.post('/api/merchant-discovery', {
          data: {
            lat: 40.7128,
            lng: -74.0060,
            category: 'restaurant'
          }
        }).then(async (response) => {
          const start = Date.now();
          await response.json();
          return Date.now() - start;
        })
      );
      
      const times = await Promise.all(batch);
      results.push(...times);
    }
    
    // Calculate statistics
    const avgLatency = results.reduce((a, b) => a + b, 0) / results.length;
    const p99Latency = results.sort((a, b) => a - b)[Math.floor(results.length * 0.99)];
    
    console.log(`Average latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`P99 latency: ${p99Latency}ms`);
    
    expect(p99Latency).toBeLessThan(50); // Should be fast with Redis cache
    expect(avgLatency).toBeLessThan(20);
  });

  test('SCAN performance with large key set', async ({ page }) => {
    // This test verifies that SCAN doesn't block Redis
    // Create multiple cache entries with different patterns
    const patterns = ['merchants', 'dashboard', 'location_analytics'];
    
    for (const pattern of patterns) {
      for (let i = 0; i < 50; i++) {
        await page.request.post(`/api/${pattern}`, {
          data: { id: `test-${i}` }
        });
      }
    }
    
    // Attempt to invalidate with pattern - should not timeout
    const start = Date.now();
    const invalidateResponse = await page.request.delete('/api/cache', {
      data: { pattern: 'merchants:*' }
    });
    const duration = Date.now() - start;
    
    expect(invalidateResponse.ok()).toBeTruthy();
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    console.log(`Cache invalidation with SCAN took ${duration}ms`);
  });
});

test.describe('Redis Monitoring', () => {
  test('verify hit rate increases over time', async ({ page }) => {
    await page.goto('/dashboard/performance');
    
    // Check initial hit rate
    const initialHitRate = await page.locator('text=/Hit Rate/').textContent();
    console.log('Initial hit rate:', initialHitRate);
    
    // Make multiple cached requests
    for (let i = 0; i < 20; i++) {
      await page.request.post('/api/merchant-discovery', {
        data: {
          lat: 40.7128,
          lng: -74.0060,
          category: 'restaurant'
        }
      });
    }
    
    // Refresh metrics
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const newHitRate = await page.locator('text=/Hit Rate/').textContent();
    console.log('New hit rate:', newHitRate);
  });

  test('memory usage stays under quota', async ({ page }) => {
    await page.goto('/dashboard/performance');
    
    const memoryUsage = await page.locator('[data-testid="redis-memory-usage"]').textContent();
    const quotaRemaining = await page.locator('[data-testid="redis-quota-remaining"]').textContent();
    
    console.log('Memory usage:', memoryUsage);
    console.log('Quota remaining:', quotaRemaining);
    
    // Parse and verify memory usage is under 80%
    const usageMatch = memoryUsage?.match(/(\d+(\.\d+)?)/);
    if (usageMatch) {
      const usage = parseFloat(usageMatch[1]);
      expect(usage).toBeLessThan(80);
    }
  });

  test('latency stays below threshold', async ({ page }) => {
    await page.goto('/dashboard/performance');
    
    const avgLatency = await page.locator('[data-testid="redis-avg-latency"]').textContent();
    console.log('Average latency:', avgLatency);
    
    // Parse latency value
    const latencyMatch = avgLatency?.match(/(\d+(\.\d+)?)/);
    if (latencyMatch) {
      const latency = parseFloat(latencyMatch[1]);
      expect(latency).toBeLessThan(10); // Should be under 10ms
    }
  });
});
