# Scroll Behavior Testing

## Overview

This document describes the scroll behavior tests that ensure proper scrolling functionality across different pages of the application.

## Problem Context

The application has different scrolling requirements for different pages:

- **Scrollable pages**: Landing page, Login, Onboarding, etc.
- **Non-scrollable pages**: Graph Explorer (needs fixed viewport for interactive graph)

Previously, global CSS rules (`overflow: hidden` on `html` and `body`) were preventing ALL pages from scrolling, breaking the user experience on landing and login pages.

## Solution

### CSS Architecture

The solution uses CSS `:has()` selector to conditionally apply overflow constraints:

```css
/* Default: Allow scrolling on all pages */
body {
  /* No overflow:hidden */
}

/* Only prevent scrolling when graph explorer is present */
body:has([data-graph-explorer]) {
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
}
```

### Component Markers

The graph explorer component is marked with a `data-graph-explorer` attribute:

```tsx
// src/App.tsx (Graph Explorer)
<div className="App" data-graph-explorer>
  <AppContainer />
</div>
```

## Test Coverage

### Unit Tests

Location: `tests/unit/scroll-behavior.test.ts`

**What they test:**
1. ✅ CSS file structure is correct
2. ✅ No global `overflow:hidden` on html/body
3. ✅ Conditional `overflow:hidden` uses `:has([data-graph-explorer])`
4. ✅ Graph explorer component has `data-graph-explorer` attribute
5. ✅ CosmosBackground has `overflow-y-auto` (allows scrolling)
6. ✅ CSS includes documentation comments

**How to run:**
```bash
npm run test -- tests/unit/scroll-behavior.test.ts
```

### E2E Tests

Location: `tests/e2e/scroll-behavior.spec.ts`

**What they test:**
1. ✅ Landing page is scrollable (content height > viewport)
2. ✅ Landing page doesn't have `overflow:hidden`
3. ✅ Landing page can actually scroll (scrollY changes)
4. ✅ Login page allows scrolling
5. ✅ Login page doesn't have viewport height constraints
6. ✅ Graph explorer has `overflow:hidden` when authenticated
7. ✅ Graph explorer prevents scrolling (scrollY stays at 0)
8. ✅ `data-graph-explorer` attribute works correctly
9. ✅ CosmosBackground has `overflow-y:auto`
10. ✅ Landing page content requires scrolling to see waitlist

**How to run:**
```bash
npm run test:e2e -- scroll-behavior.spec.ts
```

## Prevention Strategy

These tests prevent future regressions by:

1. **Catching CSS changes** - Unit tests verify the CSS structure
2. **Catching runtime behavior** - E2E tests verify actual scrolling works
3. **Catching component changes** - Tests verify `data-graph-explorer` attribute exists
4. **Comprehensive coverage** - Tests cover all page types (scrollable and non-scrollable)

## When to Update Tests

Update these tests when:

- ✏️ Changing scroll behavior for any page
- ✏️ Adding new pages with different scroll requirements
- ✏️ Modifying the CSS scroll architecture
- ✏️ Changing the graph explorer component structure
- ✏️ Adding new fixed-viewport pages (like graph explorer)

## Common Issues

### Issue: All pages can't scroll

**Diagnosis:** Run unit tests to check if global `overflow:hidden` was added
```bash
npm run test -- tests/unit/scroll-behavior.test.ts
```

**Fix:** Remove global `overflow:hidden`, use conditional `:has()` selector

### Issue: Graph explorer scrolls (should be fixed)

**Diagnosis:** Check if `data-graph-explorer` attribute is present
```bash
npm run test:e2e -- scroll-behavior.spec.ts
```

**Fix:** Add `data-graph-explorer` to the graph explorer root component

### Issue: Landing/Login page can't scroll

**Diagnosis:** Run E2E tests to check actual scroll behavior
```bash
npm run test:e2e -- scroll-behavior.spec.ts --grep "landing page"
```

**Fix:**
1. Check CosmosBackground has `overflow-y-auto`
2. Check no global `overflow:hidden` on body/html
3. Check content height exceeds viewport

## Architecture Decisions

### Why `:has()` selector?

- ✅ Cleaner than JavaScript-based solutions
- ✅ No runtime overhead
- ✅ Works with SSR/SSG
- ✅ Supported in all modern browsers (2024+)
- ✅ Self-documenting (clear intent in CSS)

### Why `data-graph-explorer` attribute?

- ✅ Semantic HTML (describes purpose)
- ✅ Easy to test
- ✅ Doesn't pollute className
- ✅ Can be used for other purposes (analytics, debugging)

### Why separate E2E and unit tests?

- ✅ **Unit tests**: Fast, catch structural issues early
- ✅ **E2E tests**: Verify actual browser behavior
- ✅ **Together**: Comprehensive coverage with good performance

## Maintenance

### Monthly Health Check

Run all scroll tests to ensure no regressions:

```bash
# Unit tests (fast)
npm run test -- tests/unit/scroll-behavior.test.ts

# E2E tests (slower, but comprehensive)
npm run test:e2e -- scroll-behavior.spec.ts
```

### Before Deploying CSS Changes

Always run scroll behavior tests before deploying changes to:
- `src/styles/index.css`
- `src/components/CosmosBackground.tsx`
- `src/App.tsx`
- `app/layout.tsx`

```bash
npm run test -- scroll-behavior && npm run test:e2e -- scroll-behavior
```
