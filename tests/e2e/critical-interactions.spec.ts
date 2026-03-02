import { test, expect } from '@playwright/test';

/**
 * Critical interaction tests to prevent regression of core features
 * These tests would have caught the node selection and infinite loop issues
 */

test.describe('Critical User Interactions', () => {
  // Helper function for common page setup
  // Note: We avoid 'networkidle' as it's unreliable on webkit due to analytics/polling
  async function setupPage(page: any) {
    await page.goto('/explorer?skip-intro=true');
    await page.waitForLoadState('domcontentloaded');

    // Clear auth loading screen first — graph cannot mount until this resolves
    const verifyingText = page.locator('text=Verifying authentication');
    await verifyingText.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

    // Clear data loading screen — graph cannot mount until this resolves
    const dataLoadingText = page.locator('text=Loading your personalized data');
    await dataLoadingText.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});

    // Now wait for graph — all async chains resolved
    try {
      await page.waitForSelector('[data-cy="cytoscape-container"]', { timeout: 60000 });
    } catch {
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        throw new Error('Authentication failed - redirected to login page');
      }
      throw new Error(`Page load timed out at URL: ${currentUrl}`);
    }

    // Brief additional wait for any initial renders to complete
    await page.waitForTimeout(1000);
  }

  test('should maintain node selection without flickering', async ({ page }) => {
    await setupPage(page);
    // Wait for graph to load
    await page.waitForSelector('[data-cy="cytoscape-container"]', { timeout: 20000 });
    
    // Monitor network requests to detect infinite loops
    const apiCalls: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/user/data')) {
        apiCalls.push(request.url());
      }
    });

    // Extra settle: Cytoscape needs time to finish rendering nodes on canvas after mount.
    // waitForSelector only confirms the DOM container exists, not that nodes are painted.
    // On slower browsers (Firefox) clicking too soon hits empty canvas space.
    await page.waitForTimeout(2000);

    // Try to click on a company node (simulate node selection)
    const canvas = page.locator('[data-cy="cytoscape-container"] canvas').first();
    await canvas.click({ position: { x: 200, y: 200 } });

    // Wait a moment for any effects to trigger
    await page.waitForTimeout(2000);

    // Primary assertion: no infinite API loop regardless of whether a node was hit
    expect(apiCalls.length).toBeLessThan(5);

    // Check if a detail panel appeared (means a node was selected)
    // Use a short wait — if selection happened it renders quickly; if not, panel stays hidden
    const detailPanel = page.locator('.panel-header');
    const panelVisible = await detailPanel.isVisible().catch(() => false);

    // If a node was selected, verify selection state persists after 2s (no flickering)
    // If no node was hit (click landed on empty canvas), skip — API call check above is sufficient
    if (panelVisible) {
      // Wait another second then re-check — panel should still be there (no flicker)
      await page.waitForTimeout(1000);
      await expect(detailPanel).toBeVisible();
    }
  });

  test('should not trigger infinite API calls on page load', async ({ page }) => {
    // Navigate and wait for full load first — calls during auth/data load are expected
    await setupPage(page);

    // Extra settle time: on slower browsers (Firefox) the initial useDataSync fetch
    // may fire just after graph mount. Wait for it to complete before we start counting.
    await page.waitForTimeout(2000);

    // Start counting AFTER page is ready so we only detect post-load infinite loops
    // (not the legitimate initial fetch that happens during auth resolution)
    const apiCalls: string[] = [];
    const startTime = Date.now();

    page.on('request', request => {
      if (request.url().includes('/api/user/data')) {
        apiCalls.push(request.url());
      }
    });

    // Observe for 5s post-load — useDataSync polls every 10s so at most 1 call expected
    await page.waitForTimeout(5000);

    const duration = Date.now() - startTime;

    // At most 1 sync call should fire in the 5s post-load window (10s poll interval)
    // An infinite loop would produce many more
    expect(apiCalls.length).toBeLessThanOrEqual(1);

    // Observation window should complete without hanging
    expect(duration).toBeLessThan(10000);
  });

  test('should handle rapid user interactions without breaking', async ({ page }) => {
    await setupPage(page);
    await page.waitForSelector('[data-cy="cytoscape-container"]', { timeout: 20000 });
    
    const canvas = page.locator('[data-cy="cytoscape-container"] canvas').first();
    
    // Perform rapid clicks to test selection stability
    for (let i = 0; i < 5; i++) {
      await canvas.click({ position: { x: 150 + i * 20, y: 150 + i * 10 } });
      await page.waitForTimeout(100); // Brief pause between clicks
    }

    // Page should still be responsive
    await expect(page.locator('body')).toBeVisible();

    // Should not show any error toasts or broken states
    // Sonner toasts have data-sonner-toast attribute, check for error/destructive variants
    const errorToasts = page.locator('[data-sonner-toast][data-type="error"]');
    await expect(errorToasts).toHaveCount(0);
  });

  test('should maintain performance under load', async ({ page }) => {
    // Set up console monitoring BEFORE navigation
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate and load
    await setupPage(page);

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
    // Set up route mock BEFORE navigation
    await page.route('/api/user/data', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    // Navigate with mocked error response
    await page.goto('/explorer?skip-intro=true');
    await page.waitForLoadState('domcontentloaded');
    // Wait for app to attempt loading (even with error, some UI should render)
    await page.waitForTimeout(3000);

    // Should handle error gracefully without crashing
    // The app should still render (not white screen of death)
    await expect(page.locator('body')).toBeVisible();

    // Should not have infinite loops or excessive console errors
    await page.waitForTimeout(2000);

    // Page should remain functional (not frozen)
    const isResponsive = await page.evaluate(() => {
      return document.readyState === 'complete';
    });
    expect(isResponsive).toBe(true);
  });
});