import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env.local') });

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: '../tests/e2e',
  /* Output directories for organized test artifacts */
  outputDir: '../tests/results',
  reporter: [['html', { outputFolder: '../tests/reports' }]],
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry failed tests - helps with inherent flakiness from auth verification timing */
  retries: process.env.CI ? 2 : 1,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Configure expect for screenshot comparisons */
  expect: {
    toHaveScreenshot: {
      // Allow up to 5% pixel difference for dynamic graph layouts
      // The Cytoscape graph has non-deterministic node positioning
      maxDiffPixelRatio: 0.05,
    },
  },
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  /*
   * Authentication Strategy:
   * We use a single setup project that authenticates and saves state to user.json.
   * All browser projects depend on this setup and share the same auth state.
   *
   * To avoid race conditions with parallel execution:
   * - Setup runs first (via dependencies)
   * - Each browser project uses isolated browser contexts
   * - The auth file is written atomically before tests start
   */
  projects: [
    // Setup project - runs authentication once before all tests
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: resolve(__dirname, '../tests/e2e/.auth/user.json'),
      },
      dependencies: ['setup'],
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: resolve(__dirname, '../tests/e2e/.auth/user.json'),
      },
      dependencies: ['setup'],
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: resolve(__dirname, '../tests/e2e/.auth/user.json'),
      },
      dependencies: ['setup'],
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for Next.js startup
  },
});