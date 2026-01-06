import { test, expect } from '@playwright/test';

/**
 * @testSuite Basic E2E Smoke Tests
 * @description Minimal tests to verify E2E infrastructure works
 * 
 * These tests ensure the application loads and basic functionality works
 * without getting into complex visual regression testing details.
 */

test.describe('Application Smoke Tests', () => {
  test('should load application successfully', async ({ page }) => {
    // Navigate to the application
    await page.goto('/explorer?skip-intro=true');

    // Wait for React app to load
    await page.waitForLoadState('networkidle');

    // Give app time to initialize
    await page.waitForTimeout(2000);
    
    // Verify the page title is correct
    await expect(page).toHaveTitle(/Company Fit Explorer/);
    
    // Wait for some content to appear (body should have loaded)
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Wait for JavaScript to execute and render content
    await page.waitForTimeout(3000);
    
    // Basic screenshot to verify visual state - this will show what's actually rendered
    await expect(page).toHaveScreenshot('app-loaded.png');
  });

  test('should allow company interaction', async ({ page }) => {
    await page.goto('/explorer?skip-intro=true');
    await page.waitForLoadState('networkidle');
    
    // Wait for the application to fully load
    await page.waitForTimeout(3000);
    
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