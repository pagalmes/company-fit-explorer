# Known Test Issues

## CompanyGraph Integration Tests - Memory Exhaustion

**Status**: Excluded from unit test suite (January 2025)

**Affected Files**:
- `src/components/__tests__/CompanyGraph.integration.test.tsx`
- `src/components/__tests__/CompanyGraphInteraction.test.tsx` (also affected)

### Issue
ANY test file that renders CompanyGraph causes JavaScript heap out of memory errors **when run as part of the full test suite**. Tests pass in isolation but fail when run with other tests.

### Root Cause Discovery (Issue #38 Investigation)
After extensive investigation, we discovered:

1. **The "working" test also fails**: `CompanyGraphInteraction.test.tsx` was thought to work, but it also causes memory exhaustion when run with the full suite
2. **Not a mock issue**: Even with simplified mocks matching the "working" pattern, memory exhaustion occurs
3. **Not a heap size issue**: Even with 8GB heap (`--max-old-space-size=8192`), tests still crash
4. **Test isolation problem**: The issue is how CompanyGraph interacts with vitest's test runner across multiple test files

### Technical Analysis
CompanyGraph's architecture makes it fundamentally difficult to unit test:
- **Multiple complex useEffect hooks** with dependencies on `cmf`, `companies`, `watchlistCompanyIds`, `viewMode`
- **Cytoscape instance lifecycle** - creation, updates, and cleanup across test renders
- **Memory accumulation** - Graph transformations and mock interactions leak memory between tests
- **Worker process limits** - Vitest's worker processes can't handle the accumulated memory pressure

### Attempted Fixes (Issue #38)
1. ❌ Removed circular reference in Cytoscape mock `ready()` method
2. ❌ Consolidated nested test suites to reduce render count
3. ❌ Created minimal single-test file - still failed
4. ❌ Increased heap size to 8GB - still failed
5. ❌ Matched mock structure to "working" test exactly - still failed

### Current Test Coverage
CompanyGraph is tested via:
- **E2E Tests** (`tests/e2e/critical-interactions.spec.ts`) - Full integration testing in real browser
- **Component interaction tests** - Limited unit tests that avoid full graph lifecycle

### Recommendation

**Use E2E tests for CompanyGraph integration testing.** The component's complexity (Cytoscape integration, multiple useEffects, graph lifecycle) makes it better suited for end-to-end testing where:
- Real browser provides proper isolation
- No mock complications
- True integration with actual Cytoscape library
- Better reflects production behavior

### For Future Consideration

If unit testing is still desired:
1. **Refactor CompanyGraph** to separate concerns (graph logic, rendering, state)
2. **Use vitest.workspace.ts** to run CompanyGraph tests in isolated worker
3. **Add better cleanup** in component useEffect returns
4. **Consider shallow rendering** to avoid full Cytoscape initialization

### How Tests Are Currently Excluded

In `vite.config.ts`:
```typescript
exclude: [
  '**/node_modules/**',
  '**/tests/e2e/**',
  '**/CompanyGraph.integration.test.tsx',  // Excluded due to memory exhaustion
],
```

Note: `CompanyGraphInteraction.test.tsx` runs but may cause issues if more tests are added to the suite.
