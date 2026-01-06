import { test as setup } from '@playwright/test';
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
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Wait for form to be ready
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  await emailInput.waitFor({ state: 'visible' });
  await passwordInput.waitFor({ state: 'visible' });

  // Clear and fill credentials using click + type for reliability
  await emailInput.click();
  await emailInput.fill(email);
  await passwordInput.click();
  await passwordInput.fill(password);

  // Click Sign In button and wait for navigation
  await Promise.all([
    page.waitForURL('/explorer', { timeout: 30000 }),
    page.click('button:has-text("Sign In")'),
  ]);

  // Wait for the app to initialize
  await page.waitForTimeout(3000);

  // Save the authenticated state
  await page.context().storageState({ path: authFile });
});
