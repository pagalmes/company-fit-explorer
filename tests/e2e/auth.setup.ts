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

  // Fill in credentials
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Click Sign In button
  await page.click('button:has-text("Sign In")');

  // Wait for redirect to explorer page
  await page.waitForURL('/explorer', { timeout: 15000 });

  // Wait for the app to initialize
  await page.waitForTimeout(3000);

  // Save the authenticated state
  await page.context().storageState({ path: authFile });
});
