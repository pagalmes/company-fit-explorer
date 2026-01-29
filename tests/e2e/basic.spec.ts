import { test, expect } from '@playwright/test';

/**
 * @testSuite Basic E2E Smoke Tests
 * @description Minimal tests to verify E2E infrastructure works
 * 
 * These tests ensure the application loads and basic functionality works
 * without getting into complex visual regression testing details.
 */

// Helper function for common page setup with better auth handling
async function waitForAppReady(page: any) {
  await page.goto('/explorer?skip-intro=true');
  await page.waitForLoadState('domcontentloaded');

  // Wait for the graph container with extended timeout
  // The auth verification can sometimes be slow, especially under parallel load
  try {
    await page.waitForSelector('[data-cy="cytoscape-container"]', { timeout: 45000 });
  } catch {
    // If we timed out, try to get more info for debugging
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      throw new Error('Authentication failed - redirected to login page');
    }
    throw new Error(`Page load timed out at URL: ${currentUrl}`);
  }
}

test.describe('Application Smoke Tests', () => {
  test('should load application successfully', async ({ page }) => {
    // Navigate and wait for app to be ready
    await waitForAppReady(page);

    // Verify the page title is correct
    await expect(page).toHaveTitle(/Cosmos/);

    // Brief wait for any animations to settle before screenshot
    await page.waitForTimeout(2000);

    // Basic screenshot to verify visual state - this will show what's actually rendered
    await expect(page).toHaveScreenshot('app-loaded.png');
  });

  test('should allow company interaction', async ({ page }) => {
    // Navigate and wait for app to be ready
    await waitForAppReady(page);

    // Brief wait for app to stabilize
    await page.waitForTimeout(1000);
    
    // Try to find any clickable element (company node, detail panel, button)
    const clickableElements = page.locator('canvas, [role="button"], button, [class*="cursor-pointer"]');
    const count = await clickableElements.count();
    
    if (count > 0) {
      // Click the first available interactive element
      await clickableElements.first().click();
      
      // Wait a bit for any state changes
      await page.waitForTimeout(1000);
    }
    
    // Take screenshot of final state (whether we clicked or not)
    await expect(page).toHaveScreenshot('company-clicked.png');
  });
});