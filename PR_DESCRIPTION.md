# Branch: test-coverage/coverage-gaps → fix/improve-test-coverage

## Goal: Increase statement coverage from ~15% to 85%

## Progress Log

### Baseline
- Overall: **14.99%** (src/ + app/ + .next/ mixed)
- After scoping to `src/` only (added `include: ['src/**']` to coverage config): **~46%**

### New test files added

| File | Target | Coverage |
|---|---|---|
| `src/utils/__tests__/logoProvider.test.ts` | logoProvider.ts (14% → 100%) | ✅ |
| `src/utils/__tests__/logoMigration.test.ts` | logoMigration.ts (15% → 100%) | ✅ |
| `src/utils/__tests__/companySuggestions.test.ts` | companySuggestions.ts (0% → 97%) | ✅ |
| `src/utils/__tests__/companyValidation.test.ts` | companyValidation.ts (0% → 90%) | ✅ |
| `src/utils/__tests__/migrateLegacyState.test.ts` | migrateLegacyState.ts (0% → 87%) | ✅ |
| `src/utils/__tests__/watchlistStorage.test.ts` | watchlistStorage.ts (16% → high) | ✅ |
| `src/utils/__tests__/storageCache.test.ts` | storageCache.ts (66% → 82%) | ✅ |
| `src/utils/__tests__/companyStateManager.test.ts` | companyStateManager.ts (11% → 78%) | ✅ |
| `src/hooks/__tests__/useKeyboardShortcuts.test.tsx` | useKeyboardShortcuts.ts (27% → 100%) | ✅ |
| `src/hooks/__tests__/useFirstTimeExperience.test.ts` | useFirstTimeExperience.ts (0% → 100%) | ✅ |
| `src/utils/llm/__tests__/service.test.ts` | llm/service.ts (38% → 87%) | ✅ |
| `src/utils/__tests__/companyAnalysis.test.ts` | companyAnalysis.ts (0% → 81%) | ✅ |
| `src/utils/__tests__/userProfileCreation.test.ts` | userProfileCreation.ts (7% → 96%) | ✅ |
| `src/data/__tests__/companies.test.ts` | companies.ts data exports | ✅ |

### Config change
- Added `include: ['src/**']` to vitest coverage config — prevents `.next/` build artifacts
  from inflating the denominator

### Current coverage (after merging hook tests from ci-branch-protection-137): **TBD**

### Remaining gaps
1. `src/lib/` — 4.73% (Supabase/auth — hard, needs heavy mocking)
2. `src/components/` — ~40% (large modal components at 0%)

### What didn't work / notes
- `src/data/companies.ts` tests — the file is mocked by other tests via `vi.mock`, causing
  test isolation issues. Kept tests minimal.
- `src/lib/admin-auth.ts`, `supabase.ts` — Supabase server-side auth, not practical to unit test
  without significant infrastructure mocking
