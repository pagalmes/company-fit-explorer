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
| `src/components/__tests__/EmptyWatchlistModal.test.tsx` | EmptyWatchlistModal.tsx (0% → 100%) | ✅ |
| `src/components/__tests__/KeyboardShortcutsModal.test.tsx` | KeyboardShortcutsModal.tsx (0% → 100%) | ✅ |
| `src/components/__tests__/BatchImportPlaceholderModal.test.tsx` | BatchImportPlaceholderModal.tsx (0% → 100%) | ✅ |
| `src/components/__tests__/DeleteUserConfirmationModal.test.tsx` | DeleteUserConfirmationModal.tsx (0% → 100%) | ✅ |
| `src/components/__tests__/CompanySelectionList.test.tsx` | CompanySelectionList.tsx (0% → 100%) | ✅ |
| `src/components/__tests__/ZoomControlsFAB.test.tsx` | ZoomControlsFAB.tsx (0% → 97%) | ✅ |
| `src/components/__tests__/SettingsFAB.test.tsx` | SettingsFAB.tsx (0% → 98%) | ✅ |
| `src/components/__tests__/SpeedDialFAB.test.tsx` | SpeedDialFAB.tsx (0% → 94%) | ✅ |
| `src/components/__tests__/CosmosBackground.test.tsx` | CosmosBackground.tsx (0% → high) | ✅ |
| `src/components/__tests__/ImportDataModal.test.tsx` | ImportDataModal.tsx (0% → high) | ✅ |
| `src/components/__tests__/SettingsViewModal.test.tsx` | SettingsViewModal.tsx (0% → high) | ✅ |
| `src/components/__tests__/JobAlertsModal.test.tsx` | JobAlertsModal.tsx (44% → high) | ✅ |
| `src/components/__tests__/UserProfileModal.test.tsx` | UserProfileModal.tsx (4% → 100%) | ✅ |
| `src/components/__tests__/ExportModal.test.tsx` | ExportModal.tsx (18% → high) | ✅ |
| `src/components/__tests__/LLMSettingsModal.test.tsx` | LLMSettingsModal.tsx (0% → high) | ✅ |
| `src/utils/__tests__/companyRelocation.test.ts` | companyRelocation.ts (0% → high) | ✅ |
| `src/utils/__tests__/smartPositioning.test.ts` | smartPositioning.ts (0% → high) | ✅ |

### Config change
- Added `include: ['src/**']` to vitest coverage config — prevents `.next/` build artifacts
  from inflating the denominator

### Current coverage: **64% statements** (868 tests, 62 test files)

By directory:
- `src/components`: 61% (up from ~42%)
- `src/hooks`: 94%
- `src/utils`: 70%
- `src/utils/llm`: 92%
- `src/services`: 71%

### Why 85% was not reached
1. **`src/lib/` at 4.73%** — Supabase server-side auth. Not practical for unit tests.
2. **`src/data/` at 0%** — `companies.ts` is mocked globally by `tests/unit/setup.ts`.
3. **`AddCompanyModal.tsx` at 0%, 696 stmts** — Deep Supabase, LLM service, file processing deps.
4. **`CMFGraphExplorerNew.tsx` at 43%, 743 stmts** — Large orchestration component.

### What didn't work / notes
- `src/data/companies.ts` tests — the file is mocked by other tests via `vi.mock`, causing
  test isolation issues. Kept tests minimal.
- `src/lib/admin-auth.ts`, `supabase.ts` — Supabase server-side auth, not practical to unit test
- `companyAnimations.ts` — skipped: uses `requestAnimationFrame`/`setTimeout` loops (OOM/infinite
  loop risk). All new test suites use `{ timeout: 5000 }` to guard against this.
- `vi.mock` factory hoisting: use `vi.hoisted()` when mock factories reference module-level consts.
- `SettingsViewModal` / `LLMSettingsModal`: `llmService.getSettings()` called at component body
  level — must mock via `vi.hoisted()` before import.
- Hover state tests: `fireEvent.mouseEnter` requires `act()` wrapper to flush React state.
  FAB menu items use `role="menuitem"`, not `role="button"`.
