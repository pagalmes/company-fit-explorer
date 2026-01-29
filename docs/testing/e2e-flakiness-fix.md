# E2E Test Flakiness Fix (January 2026)

This document describes the investigation and fix for flaky E2E tests, particularly on WebKit/Safari.

## Problem

E2E tests were failing intermittently, especially on WebKit, with timeout errors like:

```
Test timeout of 30000ms exceeded.
Error: page.waitForLoadState: Test timeout of 30000ms exceeded.
```

## Root Causes Identified

### 1. Wrong Dev Server (Environment Issue)

The initial investigation revealed that a different project's dev server was running on port 3000. When Playwright tried to navigate to `/login`, it hit the wrong application, returning 404 errors.

**Symptom:** Screenshot showed "404 - This page could not be found"

**Fix:** Ensure the correct dev server is running before E2E tests. Playwright's `webServer` config will start the server automatically if port 3000 is free.

### 2. `networkidle` Wait Strategy (Main Flakiness Cause)

The tests used `waitForLoadState('networkidle')` which waits until there are no network connections for 500ms. This is **officially discouraged by Playwright** and is particularly unreliable on WebKit.

**Why it fails:**
- PostHog analytics keeps polling/sending events
- Background network activity never fully stops
- WebKit handles network connections differently than Chromium

**Evidence from Playwright docs:**
> "Don't use this method for testing, rely on web assertions to assess readiness instead."

**Related issues:**
- [GitHub #19835](https://github.com/microsoft/playwright/issues/19835) - Infinite waiting with `networkidle`
- [GitHub #24403](https://github.com/microsoft/playwright/issues/24403) - WebKit is particularly flaky

### 3. Screenshot Pixel Differences

The Cytoscape.js graph has non-deterministic node positioning. Each render places nodes in slightly different positions, causing 1-5% pixel differences in screenshots.

## Solution Applied

### Replace `networkidle` with Element Visibility Checks

**Before (flaky):**
```typescript
await page.goto('/explorer?skip-intro=true');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);
```

**After (reliable):**
```typescript
await page.goto('/explorer?skip-intro=true');
await page.waitForLoadState('domcontentloaded');
await page.waitForSelector('[data-cy="cytoscape-container"]', { timeout: 30000 });
await page.waitForTimeout(1000);
```

**Why this works:**
1. `domcontentloaded` fires when HTML is parsed (fast, reliable)
2. `waitForSelector` confirms the app has rendered the graph container
3. Brief timeout allows animations to settle

### Increase Screenshot Diff Threshold

In `config/playwright.config.ts`:

```typescript
expect: {
  toHaveScreenshot: {
    // Allow up to 5% pixel difference for dynamic graph layouts
    maxDiffPixelRatio: 0.05,
  },
},
```

## Files Changed

| File | Change |
|------|--------|
| `tests/e2e/critical-interactions.spec.ts` | Replace `networkidle` with `domcontentloaded` + element selector |
| `tests/e2e/basic.spec.ts` | Same fix |
| `config/playwright.config.ts` | Increase `maxDiffPixelRatio` from 0.2% to 5% |
| `tests/e2e/basic.spec.ts-snapshots/*` | Updated screenshots for all 3 browsers |

Note: `scroll-behavior.spec.ts` already had this fix applied in commit `e64952e`.

## Git History Reference

Previous attempts to fix E2E flakiness:

| Commit | Description |
|--------|-------------|
| `1a8000f` | "Eliminate e2e test flakiness - achieve 100% pass rate" - Fixed listener setup order |
| `0f6cb67` | "Fix E2E test failures" - Added networkidle to auth setup |
| `e64952e` | "Update scroll behavior E2E tests for reliability" - First use of `domcontentloaded` |

## Remaining Known Issues

### Parallel Execution Race Conditions

When running all 40 tests in parallel with 6 workers, authentication state can sometimes not propagate correctly, causing "Verifying authentication..." to hang.

**Workaround:** Tests pass consistently when run individually or in smaller batches.

**Note:** E2E tests are disabled in CI (see `.github/workflows/ci.yml` lines 40-52) due to cross-platform screenshot differences. Run locally with `npm run test:e2e`.

## Best Practices for Future E2E Tests

1. **Never use `networkidle`** - Use `domcontentloaded` + element selectors instead
2. **Wait for specific elements** - Use `data-cy` attributes as test anchors
3. **Keep screenshot thresholds reasonable** - Dynamic content needs higher tolerance
4. **Test in isolation first** - Verify tests pass individually before full suite
5. **Check port 3000** - Ensure no other dev servers are running

## Useful Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:critical

# Update screenshots
npx playwright test --update-snapshots --config=config/playwright.config.ts

# Run with UI for debugging
npm run test:e2e:ui

# Skip E2E in pre-commit
SKIP_E2E=true git commit -m "message"
```

## References

- [Playwright waitForLoadState docs](https://playwright.dev/docs/api/class-page#page-wait-for-load-state)
- [BrowserStack guide on waitForLoadState](https://www.browserstack.com/guide/playwright-waitforloadstate)
- [Checkly - Waits and Timeouts in Playwright](https://www.checklyhq.com/docs/learn/playwright/waits-and-timeouts/)
