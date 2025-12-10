import { test, expect } from '@playwright/test';

/**
 * Critical interaction tests to prevent regression of core features
 * These tests would have caught the node selection and infinite loop issues
 */

test.describe('Critical User Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app with skip-intro
    await page.goto('/?skip-intro=true');
    await page.waitForLoadState('networkidle');

    // Give the app extra time to fully load and render
    await page.waitForTimeout(2000);
  });

  test('should maintain node selection without flickering', async ({ page }) => {
    // Wait for graph to load
    await page.waitForSelector('[data-cy="cytoscape-container"]', { timeout: 20000 });
    
    // Monitor network requests to detect infinite loops
    const apiCalls: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/user/data')) {
        apiCalls.push(request.url());
      }
    });

    // Try to click on a company node (simulate node selection)
    const canvas = page.locator('[data-cy="cytoscape-container"] canvas').first();
    await canvas.click({ position: { x: 200, y: 200 } });

    // Wait a moment for any effects to trigger
    await page.waitForTimeout(2000);

    // Should not have excessive API calls (infinite loop detection)
    expect(apiCalls.length).toBeLessThan(5);

    // Look for company detail panel or selected state indicators
    // This ensures selection actually worked and wasn't immediately cleared
    const detailPanel = page.locator('[class*="detail"], [class*="panel"], [class*="selected"]');
    
    // At least one selection indicator should be visible
    const hasSelectionIndicator = await detailPanel.count() > 0;
    expect(hasSelectionIndicator).toBeTruthy();
  });

  test('should not trigger infinite API calls on page load', async ({ page }) => {
    let apiCallCount = 0;
    const startTime = Date.now();

    // Monitor API calls
    page.on('request', request => {
      if (request.url().includes('/api/user/data')) {
        apiCallCount++;
      }
    });

    await page.goto('/?skip-intro=true');
    
    // Wait for initial load
    await page.waitForLoadState('networkidle');
    
    // Wait additional time to catch any delayed infinite loops
    await page.waitForTimeout(5000);
    
    const duration = Date.now() - startTime;
    
    // Should not make excessive API calls
    expect(apiCallCount).toBeLessThan(3);
    
    // Should not take excessively long due to infinite loops
    expect(duration).toBeLessThan(15000); // 15 seconds max
  });

  test('should handle rapid user interactions without breaking', async ({ page }) => {
    await page.waitForSelector('[data-cy="cytoscape-container"]', { timeout: 20000 });
    
    const canvas = page.locator('[data-cy="cytoscape-container"] canvas').first();
    
    // Perform rapid clicks to test selection stability
    for (let i = 0; i < 5; i++) {
      await canvas.click({ position: { x: 150 + i * 20, y: 150 + i * 10 } });
      await page.waitForTimeout(100); // Brief pause between clicks
    }

    // Page should still be responsive
    await expect(page.locator('body')).toBeVisible();
    
    // Should not show any error overlays or broken states
    const errorElements = page.locator('[class*="error"], [role="alert"]');
    await expect(errorElements).toHaveCount(0);
  });

  test('should maintain performance under load', async ({ page }) => {
    // Monitor console errors that might indicate infinite loops
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/?skip-intro=true');
    await page.waitForLoadState('networkidle');

    // Interact with various UI elements
    const canvas = page.locator('[data-cy="cytoscape-container"] canvas').first();
    
    // Simulate user browsing behavior
    for (let i = 0; i < 10; i++) {
      await canvas.click({ position: { x: 100 + i * 15, y: 100 + i * 15 } });
      await page.waitForTimeout(200);
    }

    // Should not have performance-related console errors
    const performanceErrors = consoleErrors.filter(error => 
      error.includes('Maximum update depth') || 
      error.includes('infinite') ||
      error.includes('Too many re-renders')
    );
    
    expect(performanceErrors).toHaveLength(0);
  });

  test('should recover gracefully from errors', async ({ page }) => {
    // Force an error condition by mocking API failure
    await page.route('/api/user/data', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    await page.goto('/?skip-intro=true');
    
    // Should redirect to login on auth failure, not loop infinitely
    await page.waitForURL(/\/login/, { timeout: 10000 });
    
    // Should reach login page without infinite redirects
    expect(page.url()).toContain('/login');
  });
});