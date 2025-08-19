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
    await page.goto('/');
    
    // Wait for React app to load by checking for the view mode toggle which is always present
    await page.waitForSelector('text=Explore Companies', { timeout: 10000 });
    
    // Verify key UI elements are present
    await expect(page.locator('text=Explore Companies')).toBeVisible();
    await expect(page.locator('text=Watchlist')).toBeVisible();
    
    // Basic screenshot to verify visual state
    await expect(page).toHaveScreenshot('app-loaded.png');
  });

  test('should allow company interaction', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Explore Companies', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Find and click any company in the list
    const companyElements = await page.locator('[class*="cursor-pointer"]').first();
    if (await companyElements.count() > 0) {
      await companyElements.click();
      
      // Wait a bit for any state changes
      await page.waitForTimeout(500);
      
      // Take screenshot of interaction state
      await expect(page).toHaveScreenshot('company-clicked.png');
    }
  });
});