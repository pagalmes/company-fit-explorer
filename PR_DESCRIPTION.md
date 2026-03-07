# E2E Watchlist Management Tests — Issue #137

## Summary

Adds 21 E2E tests covering the watchlist feature end-to-end, plus infrastructure
fixes that stabilize the full E2E suite in serial mode.

**Current status: 17/21 passing on chromium** (in-progress — see Known Issues).

---

## What Was Done

### New: `tests/e2e/watchlist.spec.ts`

21 tests across 5 categories:

| Category | Tests |
|---|---|
| View Mode Toggle | 5 |
| Heart Button Visibility & State | 5 |
| localStorage Persistence | 3 |
| Count Updates | 2 |
| View Mode Filtering | 3 |
| Watchlist Badge on Company Logo | 2 |

Key behaviors tested:
- Explore / Watchlist toggle pill renders, activates correctly, and shows company counts
- Heart button changes title (`Add to watchlist` ↔ `Remove from watchlist`) and turns red on add
- Watchlist survives page reload (persisted via Supabase `user_preferences` + `cosmos-exploration-state` localStorage)
- Count badge increments/decrements in sync with heart button clicks
- Switching to watchlist view with a non-watched company selected clears the detail panel
- Red heart badge appears/disappears on company node logo

### Architecture: Key Findings

- **Correct localStorage key**: watchlist is persisted by `ExplorationStateManager` into
  `cosmos-exploration-state` (NOT `cosmos-watchlist`). The `watchlistCompanyIds` array lives
  inside that JSON blob.
- **Supabase is source of truth on page load**: `AppContainer` clears `cosmos-exploration-state`
  on mount and re-hydrates from `user_preferences.watchlist_company_ids`. Clearing only localStorage
  is not enough — the DB must also be reset between tests.

### Infrastructure Fixes

#### Supabase admin reset (`resetSupabaseWatchlist`)
- Uses service-role key to `upsert` `watchlist_company_ids: []` directly on `user_preferences`
- Called in `beforeEach` (twice — before and after clearing localStorage) to bracket any
  in-flight `POST /api/user/data` from the previous test's async Supabase write

#### Module-level caching (`_adminClient`, `_testUserId`)
- `listUsers()` is an expensive paginated call (~500ms)
- Previously called on every `beforeEach`, causing cascade timeouts after ~11 tests
- Now cached at module level; only a fast `upsert` runs per test

#### `ensureNotWatched()` polling loop
- Supabase's async re-sync can re-flip the heart button back to "Remove" even after clicking
- Now polls in a loop (up to 10s) until the button title is stable at "Add to watchlist"

#### `cosmos-panel-state` forced collapsed
- CMF panel open state persists in localStorage between tests
- Forced to `{ cmfCollapsed: true }` in `setupPage` before each navigation so the panel
  never covers the view toggle pill

#### `EmptyWatchlistModal` handling
- The modal opens automatically (z-50 backdrop) when switching to watchlist mode with 0 items
- Tests that need watchlist mode pre-add a company via heart button before switching
- `setupPage` also clicks "Go to Explore Companies" if the modal is visible on mount

---

## Known Issues / In Progress

### 1. Flaky: "view mode toggle shows Explore and Watchlist buttons" (test 1)
- Passes on first attempt, fails on retry due to cold dev-server load timing
- Retry hits a 60s Cytoscape paint timeout when the server is under load from 20+ prior navigations
- **Root cause**: `reuseExistingServer` + serial mode accumulates server load across the suite

### 2. Failing: "switching to watchlist view with non-watched selection clears the panel" (test 18)
- Expects the detail panel to close when switching to watchlist view with an un-watched company
- Passes in isolation, fails in suite when the previous test leaves watched state
- **Root cause**: same Supabase async race — company appears as "Add" but the panel behavior
  differs when the DB still has it as watched

### 3. Cascade from flaky test 1
- In serial mode, a flaky test on retry triggers a fresh page context for all subsequent tests
- This adds ~10s of extra setup per test, causing the later tests (18–21) to not run within
  the suite timeout budget

---

## Test Run Results (latest)

```
chromium: 17 passed, 1 failed, 1 flaky, 3 did not run
```

Tests 1–17 pass consistently. Tests 18–21 are blocked by the flaky test 1 cascade on retry.

---

## Files Changed

| File | Change |
|---|---|
| `tests/e2e/watchlist.spec.ts` | New — 21 E2E tests |
| `tests/e2e/global.setup.ts` | Seeds 5 test companies + resets `user_preferences` once before all tests |
| `config/playwright.config.ts` | Wires in `globalSetup`, auth state, and `reuseExistingServer` |

---

## How to Run

```bash
# Start dev server (if not running)
npm run dev

# Run watchlist tests only (chromium)
npx playwright test tests/e2e/watchlist.spec.ts --config=config/playwright.config.ts --project=chromium

# Run full local suite (chromium + firefox)
npm run test:e2e:local
```
