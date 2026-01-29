import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.join(__dirname, '.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Check for required environment variables
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Missing test credentials! Please set E2E_TEST_EMAIL and E2E_TEST_PASSWORD in your .env.local file.'
    );
  }

  // Navigate to login page
  // Note: Avoid 'networkidle' - it's unreliable, especially on webkit
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // Wait for form to be ready with explicit element checks
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  const signInButton = page.locator('button:has-text("Sign In")');

  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await passwordInput.waitFor({ state: 'visible', timeout: 15000 });
  await signInButton.waitFor({ state: 'visible', timeout: 15000 });

  // Clear and fill credentials using click + type for reliability
  await emailInput.click();
  await emailInput.fill(email);
  await passwordInput.click();
  await passwordInput.fill(password);

  // Click Sign In button and wait for navigation
  await Promise.all([
    page.waitForURL('/explorer', { timeout: 30000 }),
    signInButton.click(),
  ]);

  // Wait for the app to fully initialize - verify we're actually authenticated
  // by checking for an element that only appears when logged in
  await page.waitForSelector('[data-cy="cytoscape-container"]', { timeout: 30000 });

  // Verify we're not stuck on "Verifying authentication..."
  const verifyingText = page.locator('text=Verifying authentication');
  await expect(verifyingText).not.toBeVisible({ timeout: 10000 });

  // Save the authenticated state
  await page.context().storageState({ path: authFile });
});
