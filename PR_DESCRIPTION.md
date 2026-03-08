# Branch: test-coverage/memory-exhaustion-38 → fix/improve-test-coverage

## Issue #38 — Fix CompanyGraph.integration.test.tsx Memory Exhaustion

---

## Problem

`CompanyGraph.integration.test.tsx` crashed with `ERR_WORKER_OUT_OF_MEMORY` during vitest
**file collection** (before any test runs). The file was excluded in `vite.config.ts`.

```
Error: Worker terminated due to reaching memory limit: JS heap out of memory
Duration: ~15s (transform 72ms, setup 63ms, collect 126ms, tests 0ms)
```

`tests 0ms` = crash happens at module evaluation, not test execution.

---

## Root Cause Analysis

The crash was caused by an **infinite render loop triggered at module evaluation time** when the
Cytoscape mock interacted with CompanyGraph's `useEffect` chain. Two factors combined:

1. **`batch()` eager callback**: `vi.fn((callback: any) => { if (callback) callback(); })` fired
   synchronously during React rendering → triggered more effects → infinite loop.
2. **`mockReturnThis()` on `source`/`target`**: returning the collection itself (length:1) caused
   CompanyGraph's edge-processing effect to loop indefinitely.
3. **Unstable references**: test data defined inside `describe` was re-evaluated per test, causing
   extra useEffect triggers via CompanyGraph's `[cmf, companies, watchlistCompanyIds, viewMode]` deps.

---

## Fix

**Complete rewrite** of `CompanyGraph.integration.test.tsx` aligned with the stable working pattern
from `CompanyGraphInteraction.test.tsx`:

1. **Removed** `batch`, `startBatch`, `endBatch` from the Cytoscape mock entirely.
2. **Removed** `mockReturnThis()` on `source`/`target` (removed those methods entirely from collection mock).
3. **Moved all test data to module level** (`mockUserCMF`, `mockCompanies`, `watchlistCompanyIds`,
   `defaultProps`) — stable references prevent spurious useEffect re-runs.
4. **Fixed `ready()` mock** — just calls `callback()`, does not return `mockCy` (avoids circular ref).
5. **Passed complete props** (`viewMode`, `watchlistCompanyIds`, `hideCenter`, `onCMFToggle`) on every render.
6. **Fixed button selectors** — `ZoomControlsFAB` uses `aria-label` not `title`; FAB zoom in/out
   only render when `isOpen && !isMobile` (requires hover), so tests query the FAB group container
   instead of the hidden buttons.
7. **Re-enabled the file** in `vite.config.ts` (removed exclusion).

---

## Attempts Log

### Attempt 1 — Remove batch/startBatch/endBatch + fix ready() mock
*Status: Partial — stopped the specific batch loop, but OOM persisted.*

Removed `batch`, `startBatch`, `endBatch` from the mock and made `ready()` just call `callback()`.
OOM still occurred — root cause was broader (unstable refs + source/target mockReturnThis).

### Attempt 2 — Complete rewrite aligned with working CompanyGraphInteraction.test.tsx pattern
*Status: SUCCESS — all 12 tests pass, no OOM.*

Rewrote the entire test file from scratch: minimal mock, module-level data, all required props,
aria-label-based button queries. File now collects in <6s and all 342 unit tests pass.

---

## Files Changed

| File | Change |
|---|---|
| `src/components/__tests__/CompanyGraph.integration.test.tsx` | Complete rewrite — fix OOM |
| `vite.config.ts` | Re-enable previously excluded test file |

---

## How to Verify

```bash
npm test                    # must pass (342 tests, 0 failures)
npm run test:coverage       # must exit 0
```
