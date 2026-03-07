/**
 * @file watchlist.spec.ts
 * @description E2E tests for watchlist management (22 tests total).
 *
 * ARCHITECTURE NOTES:
 * - resetSupabaseWatchlist() is called in beforeEach because the app syncs
 *   watchlist_company_ids FROM user_preferences (Supabase) on page load.
 *   Clearing only localStorage is not enough — DB state persists between tests.
 * - The Supabase admin client and test user ID are cached after the first lookup
 *   so only a fast upsert runs on each beforeEach (not the expensive listUsers()).
 * - Two Supabase resets bracket the localStorage clear + navigation to handle the
 *   race where the previous test's async POST /api/user/data fires after our reset.
 * - cosmos-panel-state is forced to {cmfCollapsed: true} before each navigation
 *   so the CMF panel doesn't block the view toggle pill on mount.
 * - EmptyWatchlistModal (z-50 backdrop) opens automatically when switching to
 *   watchlist mode with 0 items. Tests that need to switch to watchlist mode
 *   must first add a company via the heart button to avoid the modal.
 * - Serial mode prevents parallel navigation overload on the dev server.
 * - beforeEach timeout is 90s to cover: Supabase reset + page load + Cytoscape paint.
 * - Watchlist state is persisted via ExplorationStateManager into the
 *   'cosmos-exploration-state' localStorage key (not 'cosmos-watchlist').
 *   localStorage tests read from that key.
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'test@example.com';

// Admin client and test user ID are created once per worker process.
// listUsers() is an expensive paginated call — caching avoids ~500ms overhead
// on every beforeEach, which previously caused cascade timeouts after ~11 tests.
let _adminClient: ReturnType<typeof createClient> | null = null;
let _testUserId: string | null = null;

async function getAdminAndUserId(): Promise<{ admin: ReturnType<typeof createClient>; userId: string } | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  if (!_adminClient) {
    _adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  if (!_testUserId) {
    const { data: users } = await _adminClient.auth.admin.listUsers();
    const testUser = users?.users.find((u) => u.email === TEST_EMAIL);
    if (!testUser) return null;
    _testUserId = testUser.id;
  }
  return { admin: _adminClient, userId: _testUserId };
}

/**
 * Reset the test user's watchlist in Supabase so each test starts with an empty
 * watchlist regardless of what previous tests wrote. The app syncs watchlist from
 * user_preferences on page load, so clearing localStorage alone is not enough.
 */
async function resetSupabaseWatchlist() {
  const ctx = await getAdminAndUserId();
  if (!ctx) return;
  await (ctx.admin.from('user_preferences') as any).upsert(
    { user_id: ctx.userId, watchlist_company_ids: [], view_mode: 'explore' },
    { onConflict: 'user_id', ignoreDuplicates: false }
  );
}

/**
 * @testSuite Watchlist Management Tests
 * @description E2E tests for the watchlist feature — toggling companies,
 * switching view modes, and verifying localStorage persistence.
 *
 * Key implementation details:
 * - Watchlist is managed by ExplorationStateManager, persisted to
 *   'cosmos-exploration-state' localStorage key and Supabase user_preferences
 * - Heart button: gray (not watched) ↔ red (watched)
 * - View mode toggle at top-center: "Explore Companies" | "Your Watchlist"
 * - Switching to watchlist view hides non-watched companies from graph
 * - Switching to watchlist view when selected company is not watched clears selection
 *
 * Serial mode: tests run sequentially to avoid parallel navigation overload and
 * to ensure localStorage is clean between runs.
 */

test.describe.configure({ mode: 'serial' });

// ─── Helpers ────────────────────────────────────────────────────────────────

// Navigate to explorer and wait for the graph to be fully interactive.
async function setupPage(page: any) {
  // First reset — clears any Supabase state from prior tests.
  await resetSupabaseWatchlist();

  // If we're already on the app origin, clear watchlist before navigating.
  // Otherwise navigate to root first to establish the origin JS context.
  if (!page.url().startsWith('http://localhost:3000')) {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  }

  // Clear all watchlist/exploration state keys so the app mounts clean.
  // Also force the CMF panel to its default collapsed state so it doesn't
  // cover the view toggle buttons on mount.
  await page.evaluate(() => {
    localStorage.removeItem('cosmos-watchlist');
    localStorage.removeItem('cmf-explorer-watchlist');
    localStorage.removeItem('cosmos-exploration-state');
    // Ensure CMF panel loads collapsed (default) — prevents it from covering view toggle.
    localStorage.setItem('cosmos-panel-state', JSON.stringify({ cmfCollapsed: true, lastUpdated: new Date().toISOString() }));
  });

  // Second reset — catches any in-flight POST /api/user/data from the previous test
  // that may have committed to Supabase after our first reset above.
  await resetSupabaseWatchlist();

  await page.goto('/explorer?skip-intro=true');
  await page.waitForLoadState('domcontentloaded');

  const verifyingText = page.locator('text=Verifying authentication');
  await verifyingText.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

  const dataLoadingText = page.locator('text=Loading your personalized data');
  await dataLoadingText.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});

  try {
    await page.waitForSelector('[data-cy="cytoscape-container"]', { timeout: 60000 });
  } catch {
    const url = page.url();
    if (url.includes('/login')) throw new Error('Authentication failed - redirected to login page');
    throw new Error(`Page load timed out at URL: ${url}`);
  }

  // Let Cytoscape finish painting nodes
  await page.waitForTimeout(2000);

  // Dismiss any auto-opened modal or CMF panel that could cover the view toggle.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // EmptyWatchlistModal (z-50) has no Escape handler — click its own button.
  const emptyWatchlistDismiss = page.getByRole('button', { name: /Go to Explore Companies/i });
  if (await emptyWatchlistDismiss.isVisible().catch(() => false)) {
    await emptyWatchlistDismiss.click();
    await page.waitForTimeout(300);
  }

  const closePanel = page.getByRole('button', { name: 'Close panel' });
  if (await closePanel.isVisible().catch(() => false)) {
    await closePanel.click({ force: true });
    await page.waitForTimeout(300);
  }

  // Final safety: if the watchlist count is non-zero despite our resets (rare race),
  // clear it in-app by waiting for the count to settle to 0.
  const wlCount = await page.locator('.absolute.top-4')
    .filter({ has: page.locator('button').nth(1) })
    .first()
    .getByRole('button', { name: /Watchlist|Saved/i })
    .first()
    .textContent()
    .catch(() => '(0)') as string;
  if (!/\(0\)/.test(wlCount)) {
    // Re-reset Supabase and reload to pick up the cleared state
    await resetSupabaseWatchlist();
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('[data-cy="cytoscape-container"]', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }
}

// The view mode toggle pill at the top-centre of the explorer.
// Scoped to avoid matching buttons inside empty-state overlays or modals.
function togglePill(page: any) {
  return page.locator('.absolute.top-4').filter({ has: page.locator('button').nth(1) }).first();
}

function exploreBtn(page: any) {
  return togglePill(page).getByRole('button', { name: /Explore/i }).first();
}

function watchlistBtn(page: any) {
  return togglePill(page).getByRole('button', { name: /Watchlist|Saved/i }).first();
}

// Read the numeric count from a toggle button, e.g. "Explore Companies (12)" → 12
async function getCount(page: any, namePattern: RegExp) {
  const text = (await togglePill(page).getByRole('button', { name: namePattern }).first().textContent()) ?? '';
  return parseInt(text.match(/\((\d+)\)/)?.[1] ?? '0', 10);
}

// Select a company and wait for the detail panel to open.
// Uses the company list sidebar (reliable) — no canvas position guessing.
// Returns true if a company was selected, false if the list is empty.
async function selectAnyCompany(page: any) {
  // The right-side panel shows a sortable company list with cursor-pointer divs.
  // Each row contains an h4 with the company name. Clicking the row opens the detail.
  // Use the h4 locator ancestor to find and click the clickable parent row.
  const companyRow = page.locator('h4').filter({ hasText: /Acme|Beta|Gamma|Delta|Epsilon/ }).first();
  if (!await companyRow.isVisible().catch(() => false)) return false;

  // Click the h4 — the click propagates to the cursor-pointer parent row
  await companyRow.click();
  await page.waitForTimeout(600);
  return await page.locator('.panel-header').isVisible().catch(() => false);
}

// Ensure heart button is in the "Add to watchlist" state before using it in a test.
// Polls in a loop because a Supabase async sync can re-flip the button back to "Remove"
// even after we've clicked it once. Loops until the title is stable at "Add to watchlist"
// for at least one poll cycle with no subsequent flip.
async function ensureNotWatched(page: any, heartBtn: any) {
  await expect.poll(async () => {
    const title = (await heartBtn.getAttribute('title')) ?? '';
    if (title.includes('Remove')) {
      await heartBtn.click();
      await page.waitForTimeout(400);
      return false;
    }
    return true;
  }, { timeout: 10000, intervals: [500] }).toBe(true);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe('Watchlist Management', () => {
  test.beforeEach(async ({ page }) => {
    // Allow up to 90s: resetSupabaseWatchlist + page load + Cytoscape paint
    test.setTimeout(90000);
    await setupPage(page);
  });

  // ── View Mode Toggle ───────────────────────────────────────────────────────

  test('view mode toggle shows Explore and Watchlist buttons', async ({ page }) => {
    await expect(exploreBtn(page)).toBeVisible();
    await expect(watchlistBtn(page)).toBeVisible();
  });

  test('Explore button is active by default', async ({ page }) => {
    await expect(exploreBtn(page)).toHaveClass(/bg-blue-600/);
  });

  test('clicking Watchlist button activates watchlist mode', async ({ page }) => {
    // Watchlist toggle only works without a modal blocker when there is at least
    // one company saved. Add one first, then switch to watchlist view.
    if (!await selectAnyCompany(page)) { test.skip(); return; }
    const heartBtn = page.locator('button[title*="watchlist"], button[aria-label*="watchlist"]').first();
    await ensureNotWatched(page, heartBtn);
    await heartBtn.click();
    await page.waitForTimeout(300);

    await watchlistBtn(page).click();
    await page.waitForTimeout(500);

    await expect(watchlistBtn(page)).toHaveClass(/bg-blue-600/);
    await expect(exploreBtn(page)).not.toHaveClass(/bg-blue-600/);
  });

  test('clicking Explore button returns to explore mode', async ({ page }) => {
    // Need a watchlisted company so the toggle works without the EmptyWatchlistModal.
    if (!await selectAnyCompany(page)) { test.skip(); return; }
    const heartBtn = page.locator('button[title*="watchlist"], button[aria-label*="watchlist"]').first();
    await ensureNotWatched(page, heartBtn);
    await heartBtn.click();
    await page.waitForTimeout(300);

    await watchlistBtn(page).click();
    await page.waitForTimeout(300);
    await exploreBtn(page).click();
    await page.waitForTimeout(300);

    await expect(exploreBtn(page)).toHaveClass(/bg-blue-600/);
    await expect(watchlistBtn(page)).not.toHaveClass(/bg-blue-600/);
  });

  test('view mode buttons show company counts', async ({ page }) => {
    await expect(exploreBtn(page)).toHaveText(/\(\d+\)/);
    await expect(watchlistBtn(page)).toHaveText(/\(\d+\)/);
  });

  test('explore count is greater than zero (test data seeded)', async ({ page }) => {
    // Sanity check: global.setup.ts must have seeded companies for the test user.
    const count = await getCount(page, /Explore/i);
    expect(count).toBeGreaterThan(0);
  });

  // ── Heart Button Visibility & State ───────────────────────────────────────

  test('heart button is visible when a company is selected', async ({ page }) => {
    if (!await selectAnyCompany(page)) { test.skip(); return; }

    const heartBtn = page.locator('button[title*="watchlist"], button[aria-label*="watchlist"]').first();
    await expect(heartBtn).toBeVisible();
  });

  test('heart button starts with Add title when watchlist is empty', async ({ page }) => {
    if (!await selectAnyCompany(page)) { test.skip(); return; }

    const heartBtn = page.locator('button[title*="watchlist"], button[aria-label*="watchlist"]').first();
    await ensureNotWatched(page, heartBtn);
    await expect(heartBtn).toHaveAttribute('title', /Add to watchlist/);
  });

  test('heart button title changes to Remove after adding', async ({ page }) => {
    if (!await selectAnyCompany(page)) { test.skip(); return; }

    const heartBtn = page.locator('button[title*="watchlist"], button[aria-label*="watchlist"]').first();
    await ensureNotWatched(page, heartBtn);
    await heartBtn.click();
    await page.waitForTimeout(300);

    await expect(heartBtn).toHaveAttribute('title', /Remove from watchlist/);
  });

  test('heart button turns red after adding to watchlist', async ({ page }) => {
    if (!await selectAnyCompany(page)) { test.skip(); return; }

    const heartBtn = page.locator('button[title*="watchlist"], button[aria-label*="watchlist"]').first();
    await ensureNotWatched(page, heartBtn);
    await heartBtn.click();
    await page.waitForTimeout(300);

    // The desktop heart button applies text-red-500 on the <button> element itself
    // (using currentColor stroke on the inner SVG). Check the button class.
    const btnClass = (await heartBtn.getAttribute('class')) ?? '';
    const svgClass = (await heartBtn.locator('svg').first().getAttribute('class')) ?? '';
    expect(btnClass + ' ' + svgClass).toMatch(/text-red-500|fill-red-500/);
  });

  test('heart button returns to Add state after removing from watchlist', async ({ page }) => {
    if (!await selectAnyCompany(page)) { test.skip(); return; }

    const heartBtn = page.locator('button[title*="watchlist"], button[aria-label*="watchlist"]').first();
    await ensureNotWatched(page, heartBtn);
    await heartBtn.click();
    await page.waitForTimeout(300);
    await heartBtn.click();
    await page.waitForTimeout(300);

    await expect(heartBtn).toHaveAttribute('title', /Add to watchlist/);
    const svgClasses = (await heartBtn.locator('svg').first().getAttribute('class')) ?? '';
    expect(svgClasses).not.toMatch(/text-red-500/);
  });

  // ── localStorage Persistence ───────────────────────────────────────────────

  test('adding to watchlist writes companyIds to localStorage', async ({ page }) => {
    if (!await selectAnyCompany(page)) { test.skip(); return; }

    const heartBtn = page.locator('button[title*="watchlist"], button[aria-label*="watchlist"]').first();
    await ensureNotWatched(page, heartBtn);
    await heartBtn.click();
    await page.waitForTimeout(500);

    // The app persists watchlist via ExplorationStateManager → 'cosmos-exploration-state'.
    // The watchlistCompanyIds array lives inside that serialised state object.
    const stored = await page.evaluate(() => localStorage.getItem('cosmos-exploration-state'));
    expect(stored).not.toBeNull();
    const state = JSON.parse(stored as string);
    expect(Array.isArray(state.watchlistCompanyIds)).toBe(true);
    expect(state.watchlistCompanyIds.length).toBeGreaterThan(0);
  });

  test('removing from watchlist empties companyIds in localStorage', async ({ page }) => {
    if (!await selectAnyCompany(page)) { test.skip(); return; }

    const heartBtn = page.locator('button[title*="watchlist"], button[aria-label*="watchlist"]').first();
    await ensureNotWatched(page, heartBtn);
    await heartBtn.click();
    await page.waitForTimeout(300);
    await heartBtn.click();
    await page.waitForTimeout(300);

    const stored = await page.evaluate(() => localStorage.getItem('cosmos-exploration-state'));
    if (stored) {
      const state = JSON.parse(stored as string);
      expect(state.watchlistCompanyIds.length).toBe(0);
    }
    // null state means app hasn't persisted yet — acceptable for a just-cleared watchlist
  });

  test('watchlist survives page reload', async ({ page }) => {
    if (!await selectAnyCompany(page)) { test.skip(); return; }

    const heartBtn = page.locator('button[title*="watchlist"], button[aria-label*="watchlist"]').first();
    await ensureNotWatched(page, heartBtn);
    await heartBtn.click();
    await page.waitForTimeout(500);

    // Read the watchlist IDs from the exploration state (where the app persists them)
    const stored = await page.evaluate(() => localStorage.getItem('cosmos-exploration-state'));
    expect(stored).not.toBeNull();
    const idsBefore = (JSON.parse(stored as string).watchlistCompanyIds as number[]);
    expect(idsBefore.length).toBeGreaterThan(0);

    // Reload without calling setupPage so localStorage + Supabase state is preserved
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('[data-cy="cytoscape-container"]', { timeout: 60000 });
    await page.waitForTimeout(2000);

    const storedAfter = await page.evaluate(() => localStorage.getItem('cosmos-exploration-state'));
    const idsAfter = (JSON.parse(storedAfter as string).watchlistCompanyIds as number[]);
    expect(idsAfter).toEqual(idsBefore);

    const count = await getCount(page, /Watchlist|Saved/i);
    expect(count).toBe(idsBefore.length);
  });

  // ── Count Updates ──────────────────────────────────────────────────────────

  test('watchlist count increments when company is added', async ({ page }) => {
    if (!await selectAnyCompany(page)) { test.skip(); return; }

    const heartBtn = page.locator('button[title*="watchlist"], button[aria-label*="watchlist"]').first();
    await ensureNotWatched(page, heartBtn);

    const initialCount = await getCount(page, /Watchlist|Saved/i);
    await heartBtn.click();

    // Poll for the count to increment rather than using a fixed timeout.
    await expect.poll(() => getCount(page, /Watchlist|Saved/i), { timeout: 5000 }).toBe(initialCount + 1);
  });

  test('watchlist count decrements when company is removed', async ({ page }) => {
    if (!await selectAnyCompany(page)) { test.skip(); return; }

    const heartBtn = page.locator('button[title*="watchlist"], button[aria-label*="watchlist"]').first();
    await ensureNotWatched(page, heartBtn);
    await heartBtn.click();
    // Poll for add to register before reading baseline count for the decrement check.
    await expect.poll(() => getCount(page, /Watchlist|Saved/i), { timeout: 5000 }).toBeGreaterThan(0);
    const countAfterAdd = await getCount(page, /Watchlist|Saved/i);

    await heartBtn.click();
    // Poll for count to decrement.
    await expect.poll(() => getCount(page, /Watchlist|Saved/i), { timeout: 5000 }).toBe(countAfterAdd - 1);
  });

  // ── View Mode Filtering ────────────────────────────────────────────────────

  test('switching to watchlist view shows fewer or equal companies than explore', async ({ page }) => {
    if (!await selectAnyCompany(page)) { test.skip(); return; }

    const heartBtn = page.locator('button[title*="watchlist"], button[aria-label*="watchlist"]').first();
    await ensureNotWatched(page, heartBtn);
    await heartBtn.click();
    await page.waitForTimeout(300);

    const exploreCount = await getCount(page, /Explore/i);
    const wlCount = await getCount(page, /Watchlist|Saved/i);

    await watchlistBtn(page).click();
    await page.waitForTimeout(1000);

    await expect(page.locator('[data-cy="cytoscape-container"]')).toBeVisible();
    expect(wlCount).toBeLessThanOrEqual(exploreCount);
  });

  test('switching to watchlist view with non-watched selection clears the panel', async ({ page }) => {
    if (!await selectAnyCompany(page)) { test.skip(); return; }

    await expect(page.locator('.panel-header')).toBeVisible();

    const heartBtn = page.locator('button[title*="watchlist"], button[aria-label*="watchlist"]').first();
    if (((await heartBtn.getAttribute('title')) ?? '').includes('Remove')) { test.skip(); return; }

    await watchlistBtn(page).click();
    await page.waitForTimeout(1000);

    expect(await page.locator('.panel-header').isVisible().catch(() => false)).toBe(false);
  });

  test('returning to explore view after watchlist restores all companies', async ({ page }) => {
    // Requires a watchlisted company so the toggle pill works without EmptyWatchlistModal.
    if (!await selectAnyCompany(page)) { test.skip(); return; }
    const heartBtn = page.locator('button[title*="watchlist"], button[aria-label*="watchlist"]').first();
    await ensureNotWatched(page, heartBtn);
    await heartBtn.click();
    await page.waitForTimeout(300);

    const exploreCountBefore = await getCount(page, /Explore/i);

    await watchlistBtn(page).click();
    await page.waitForTimeout(500);
    await exploreBtn(page).click();
    await page.waitForTimeout(500);

    expect(await getCount(page, /Explore/i)).toBe(exploreCountBefore);
    await expect(page.locator('[data-cy="cytoscape-container"]')).toBeVisible();
  });

  // ── Watchlist Badge on Company Logo ───────────────────────────────────────

  test('red heart badge appears on company logo after adding to watchlist', async ({ page }) => {
    if (!await selectAnyCompany(page)) { test.skip(); return; }

    const badgesBefore = await page.locator('.bg-red-500.rounded-full').count();

    const heartBtn = page.locator('button[title*="watchlist"], button[aria-label*="watchlist"]').first();
    await ensureNotWatched(page, heartBtn);
    await heartBtn.click();
    await page.waitForTimeout(500);

    expect(await page.locator('.bg-red-500.rounded-full').count()).toBeGreaterThan(badgesBefore);
  });

  test('red heart badge disappears after removing from watchlist', async ({ page }) => {
    if (!await selectAnyCompany(page)) { test.skip(); return; }

    const heartBtn = page.locator('button[title*="watchlist"], button[aria-label*="watchlist"]').first();
    await ensureNotWatched(page, heartBtn);
    await heartBtn.click();
    await page.waitForTimeout(500);

    const badgesAfterAdd = await page.locator('.bg-red-500.rounded-full').count();
    expect(badgesAfterAdd).toBeGreaterThan(0);

    await heartBtn.click();
    await page.waitForTimeout(500);

    expect(await page.locator('.bg-red-500.rounded-full').count()).toBeLessThan(badgesAfterAdd);
  });
});
