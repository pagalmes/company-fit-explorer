# Known Test Issues

## CompanyGraph.integration.test.tsx - Memory Exhaustion

**Status**: Excluded from test suite (December 2024)

**File**: `src/components/__tests__/CompanyGraph.integration.test.tsx`

### Issue
This test file causes JavaScript heap out of memory errors during the test collection phase (before any tests execute). The worker process exhausts memory and crashes with error code `ERR_WORKER_OUT_OF_MEMORY`.

### Symptoms
```
Error: Worker terminated due to reaching memory limit: JS heap out of memory
Duration: ~15s (transform 72ms, setup 63ms, collect 126ms, tests 0ms)
```

Note: `tests 0ms` indicates the crash happens during file collection, not test execution.

### Root Cause
The test file creates an infinite loop when the Cytoscape mock interacts with the CompanyGraph component during test file loading. Possible causes:
- Object/Set references being recreated causing infinite useEffect loops
- Cytoscape mock not properly handling component lifecycle during collection
- Memory leak in mock setup that compounds during file evaluation

### Attempted Fixes
1. ✅ Moved `watchlistCompanyIds` Set outside defaultProps to use stable reference
2. ✅ Moved mock functions outside to prevent recreation
3. ✅ Updated Cytoscape mock to match working CompanyGraphInteraction.test.tsx
4. ✅ Added missing props (viewMode, watchlistCompanyIds, hideCenter, onCMFToggle)
5. ❌ Increased worker memory limit to 2048MB (still crashed)
6. ❌ Used `pool: 'forks'` with `singleFork: true`
7. ❌ Used `pool: 'threads'` with `singleThread: true`
8. ❌ Set `isolate: false`

### Test Coverage
CompanyGraph component has test coverage from:
- **CompanyGraphInteraction.test.tsx** (4 tests passing) - Tests interaction logic, state management, and regression scenarios

The integration test file provided additional coverage for:
- UI elements (zoom controls, fit to view button)
- Graph container structure
- Edge highlighting integration
- Connection data processing

### Recommendation
Future work should:
1. Investigate why CompanyGraphInteraction.test.tsx works but CompanyGraph.integration.test.tsx doesn't
2. Consider rewriting integration tests to match the working pattern
3. Add missing integration test coverage to CompanyGraphInteraction.test.tsx
4. Profile memory usage during test collection to identify exact leak source

### How to Re-enable
Remove the exclusion from `vite.config.ts`:
```typescript
exclude: [
  '**/node_modules/**',
  '**/tests/e2e/**',
  // Remove this line:
  // '**/CompanyGraph.integration.test.tsx',
],
```

Then investigate and fix the root cause before committing.
