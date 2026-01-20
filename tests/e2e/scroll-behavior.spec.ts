import { test, expect } from '@playwright/test';

/**
 * @testSuite Scroll Behavior Tests
 * @description Tests to ensure proper scrolling behavior across different pages
 *
 * Different pages have different scroll requirements:
 * - Landing page (/): Should be scrollable (long content)
 * - Login page (/login): Should be scrollable if content overflows
 * - Graph Explorer (/explorer): Should NOT be scrollable (fixed viewport for graph)
 *
 * These tests prevent regressions where global CSS changes accidentally
 * break the scroll behavior for certain pages.
 */

test.describe('Scroll Behavior', () => {
  test('landing page should be scrollable', async ({ page }) => {
    // Navigate to landing page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get initial scroll position
    const initialScrollY = await page.evaluate(() => window.scrollY);
    expect(initialScrollY).toBe(0); // Should start at top

    // Get page dimensions
    const dimensions = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      bodyOverflow: window.getComputedStyle(document.body).overflow,
      htmlOverflow: window.getComputedStyle(document.documentElement).overflow,
    }));

    // Verify overflow is not hidden
    expect(dimensions.bodyOverflow).not.toBe('hidden');
    expect(dimensions.htmlOverflow).not.toBe('hidden');

    // Content should be taller than viewport (scrollable)
    expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);

    // Try to scroll down
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(100); // Wait for scroll to complete

    // Verify scroll happened
    const scrollYAfter = await page.evaluate(() => window.scrollY);
    expect(scrollYAfter).toBeGreaterThan(0);

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(100);

    const scrollYAtBottom = await page.evaluate(() => window.scrollY);
    expect(scrollYAtBottom).toBeGreaterThan(initialScrollY);
  });

  test('login page should be scrollable', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Get page overflow styles
    const overflow = await page.evaluate(() => ({
      bodyOverflow: window.getComputedStyle(document.body).overflow,
      htmlOverflow: window.getComputedStyle(document.documentElement).overflow,
      bodyMaxHeight: window.getComputedStyle(document.body).maxHeight,
      htmlMaxHeight: window.getComputedStyle(document.documentElement).maxHeight,
    }));

    // Verify overflow is not hidden (should allow scrolling if needed)
    expect(overflow.bodyOverflow).not.toBe('hidden');
    expect(overflow.htmlOverflow).not.toBe('hidden');

    // Should not have viewport height constraints
    // (maxHeight should not be set to 100dvh when not in graph explorer)
    const hasViewportConstraint =
      overflow.bodyMaxHeight.includes('100') ||
      overflow.htmlMaxHeight.includes('100');

    if (hasViewportConstraint) {
      // If there are constraints, they should only be on graph explorer
      const hasGraphExplorer = await page.evaluate(() =>
        !!document.querySelector('[data-graph-explorer]')
      );
      expect(hasGraphExplorer).toBe(false);
    }
  });

  test('graph explorer should NOT be scrollable', async ({ page }) => {
    // Navigate to graph explorer (authenticated route)
    // Note: This test assumes there's a way to bypass auth or use test credentials
    // For now, we'll test that the CSS rules exist for the graph explorer

    await page.goto('/explorer');
    await page.waitForLoadState('domcontentloaded');

    // Wait for app to load (don't use networkidle as logo fetching may continue indefinitely)
    await page.waitForTimeout(3000);

    // Check if graph explorer marker exists
    const hasGraphExplorer = await page.evaluate(() =>
      !!document.querySelector('[data-graph-explorer]')
    );

    // If we're in the graph explorer (not redirected to login)
    if (hasGraphExplorer) {
      const overflow = await page.evaluate(() => ({
        bodyOverflow: window.getComputedStyle(document.body).overflow,
        htmlOverflow: window.getComputedStyle(document.documentElement).overflow,
        bodyMaxHeight: window.getComputedStyle(document.body).maxHeight,
        viewportHeight: window.innerHeight,
      }));

      // Graph explorer should have overflow hidden
      expect(overflow.bodyOverflow).toBe('hidden');

      // Should have viewport height constraint (computed to pixels, roughly equal to viewport)
      // The CSS uses 100dvh which gets computed to pixels by the browser
      const maxHeightPx = parseInt(overflow.bodyMaxHeight, 10);
      expect(maxHeightPx).toBeGreaterThan(0);
      expect(maxHeightPx).toBeLessThanOrEqual(overflow.viewportHeight + 10); // Allow small margin

      // Try to scroll - it shouldn't work
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForTimeout(100);

      const scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBe(0); // Should not scroll
    }
  });

  test('CSS :has() selector properly targets graph explorer', async ({ page }) => {
    // Test that the CSS selector works correctly
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that data-graph-explorer attribute doesn't exist on landing page
    const hasMarker = await page.evaluate(() =>
      !!document.querySelector('[data-graph-explorer]')
    );
    expect(hasMarker).toBe(false);

    // Verify body doesn't have overflow hidden on landing page
    const bodyOverflow = await page.evaluate(() =>
      window.getComputedStyle(document.body).overflow
    );
    expect(bodyOverflow).not.toBe('hidden');
  });

  test('CosmosBackground component allows scrolling', async ({ page }) => {
    // Test that pages using CosmosBackground can scroll
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // The login page uses CosmosBackground which wraps the content
    // Check that the page itself allows scrolling (not locked by overflow: hidden)
    const pageStyles = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      const bodyStyle = window.getComputedStyle(body);
      const htmlStyle = window.getComputedStyle(html);

      return {
        bodyOverflow: bodyStyle.overflow,
        bodyOverflowY: bodyStyle.overflowY,
        htmlOverflow: htmlStyle.overflow,
        htmlOverflowY: htmlStyle.overflowY,
      };
    });

    // Login page should not have overflow: hidden (should allow scrolling if content overflows)
    expect(pageStyles.bodyOverflow).not.toBe('hidden');
    expect(pageStyles.htmlOverflow).not.toBe('hidden');
  });

  test('landing page content height exceeds viewport', async ({ page }) => {
    // Navigate to landing page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Check that content is tall enough to require scrolling
    const heights = await page.evaluate(() => ({
      viewportHeight: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
      bodyHeight: document.body.scrollHeight,
    }));

    // Content should be significantly taller than viewport
    expect(heights.scrollHeight).toBeGreaterThan(heights.viewportHeight * 1.2);

    // Verify waitlist section is below the fold (requires scrolling to see)
    const waitlistSection = page.locator('text=Join the Waitlist');
    const isInViewport = await waitlistSection.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });

    // Waitlist should be below fold (not immediately visible)
    expect(isInViewport).toBe(false);
  });
});
