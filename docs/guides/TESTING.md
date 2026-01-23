# Testing Guide - Cosmos

[![Tests](https://img.shields.io/badge/tests-212%20passing-brightgreen)](./TESTING.md)
[![Coverage](https://img.shields.io/badge/coverage-85%25-green)](./TESTING.md#coverage-reports)
[![TDD](https://img.shields.io/badge/development-TDD-blue)](./TESTING.md#test-driven-development-workflow)

## Overview

This project uses a comprehensive **multi-layer testing approach** with **206 unit tests plus 6 E2E visual regression tests** to ensure code quality and prevent regressions. Every critical function, component, user workflow, and **visual interaction** is protected by automated tests.

## Test Setup

### Testing Stack
**Unit & Integration Testing:**
- **Vitest**: Modern testing framework with native TypeScript support
- **React Testing Library**: Component testing utilities
- **@testing-library/user-event**: User interaction simulation
- **@testing-library/jest-dom**: Custom Jest matchers for DOM testing

**E2E & Visual Regression Testing:**
- **Playwright**: Cross-browser end-to-end testing
- **Visual Screenshots**: Automated screenshot comparison for UI regressions
- **Real Browser Testing**: Actual Cytoscape.js rendering validation

### Configuration
Tests are configured in `vite.config.ts` with:
- Global test utilities available without imports
- JSDOM environment for DOM testing
- Coverage reporting with v8 provider
- Custom setup file for mocks and global configurations

## Test Structure

### Unit Tests

#### Utility Functions (`src/utils/__tests__/`)
- **`index.test.ts`**: Tests for helper functions
  - Currency formatting
  - Company type formatting  
  - Avatar URL generation
- **`graphDataTransform.test.ts`**: Tests for graph visualization logic
  - Position calculations
  - Data transformations
  - Color coding logic
  - Cytoscape style generation

#### Type Safety (`src/types/__tests__/`)
- **`index.test.ts`**: TypeScript interface validation
  - UserCMF data structure validation
  - Company data structure validation
  - Data integrity helpers

### Component Tests

#### CompanyDetailPanel (`src/components/__tests__/CompanyDetailPanel.test.tsx`)
Comprehensive testing of the main UI component:
- **Rendering**: Correct display of company information
- **Interaction**: Click handlers and user interactions
- **State Management**: Selected vs unselected states
- **Data Integration**: Real company data handling
- **Accessibility**: ARIA labels and keyboard navigation
- **Error Handling**: Logo fallbacks and edge cases

#### CMFGraphExplorer (`src/components/__tests__/CMFGraphExplorer.test.tsx`)
Main graph container component testing:
- **State Management**: Company selection and hover coordination
- **Overlay Components**: CMF info display and legend rendering
- **Layout Structure**: Responsive design and component positioning
- **Connection Logic**: Highlighted connections state management

#### CompanyGraph Integration (`src/components/__tests__/CompanyGraph.integration.test.tsx`)
**🎯 CRITICAL EDGE HIGHLIGHTING TESTS** - Prevents visual interaction regressions:
- **Graph Initialization**: Proper component setup with edge connection data
- **Selection State**: Company selection triggering edge highlighting logic  
- **Hover Callbacks**: Mouse interactions for edge highlighting
- **Graph Controls**: Zoom/pan functionality affecting edge visibility
- **Data Integrity**: Connection relationships and edge highlighting accuracy

### Integration Tests (`src/__tests__/integration.test.tsx`)
End-to-end testing with real data:
- **Data Validation**: Complete dataset integrity checks
- **User Workflows**: Company selection and navigation flows
- **Career URL Functionality**: External link testing
- **Performance**: Render time validation
- **Edge Cases**: Empty states and error conditions

## Running Tests

### Unit & Integration Tests
```bash
# Run all unit tests
npm test

# Run tests once (CI mode)
npm run test:run

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### E2E Visual Regression Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run E2E with interactive UI
npm run test:e2e:ui

# Run E2E in headed mode (see browser)
npm run test:e2e:headed

# View E2E test results and screenshots
npx playwright show-report
```

### Coverage Reports
Coverage reports are generated in multiple formats:
- **Text**: Console output
- **HTML**: Browse `coverage/index.html`
- **JSON**: Machine-readable `coverage/coverage-final.json`

Coverage excludes:
- Node modules
- Test files
- Configuration files
- Main entry point
- Build output

## Test Categories & Documentation

### 1. **Utility Functions** (11 tests) 📍 `src/utils/__tests__/index.test.ts`
**What they protect:**
- ✅ Currency formatting with proper commas and symbols
- ✅ Company type capitalization and hyphen handling  
- ✅ Avatar URL generation with encoding
- ✅ Edge cases: empty strings, special characters, negative numbers

**Prevents:** Display bugs, broken formatting, invalid URLs

### 2. **Graph Transformations** (19 tests) 📍 `src/utils/__tests__/graphDataTransform.test.ts`
**What they protect:**
- ✅ Mathematical position calculations (angles, distances, zoom)
- ✅ Graph data structure transformations (nodes, edges, labels)
- ✅ Match score color coding (90%+ green, 80-89% yellow, <80% gray)
- ✅ Complete Cytoscape styling configurations

**Prevents:** Broken graph positioning, wrong colors, missing visual elements

### 3. **Type Safety** (10 tests) 📍 `src/types/__tests__/index.test.ts`
**What they protect:**
- ✅ UserCMF and Company interface validation
- ✅ Required field enforcement and data structure integrity
- ✅ URL validation, color hex codes, match score ranges
- ✅ Connection relationship consistency

**Prevents:** Runtime type errors, invalid data, missing required fields

### 4. **Component Logic** (42 tests) 
#### CompanyDetailPanel (16 tests) 📍 `src/components/__tests__/CompanyDetailPanel.test.tsx`
**What they protect:**
- ✅ Company rendering (list view, detail view, match scores)
- ✅ User interactions (clicks, navigation, button functionality)
- ✅ "View Jobs" career URL integration with external sites
- ✅ Related company connections and navigation flows
- ✅ Error handling (logo fallbacks, missing data scenarios)
- ✅ Accessibility compliance (ARIA labels, keyboard navigation)

#### CMFGraphExplorer (14 tests) 📍 `src/components/__tests__/CMFGraphExplorer.test.tsx`
**What they protect:**
- ✅ Graph container state management and overlay rendering
- ✅ Company selection coordination between graph and panel
- ✅ Highlighted connections logic and state synchronization
- ✅ Layout structure and responsive design components

#### **🎯 CompanyGraph Edge Highlighting (12 tests)** 📍 `src/components/__tests__/CompanyGraph.integration.test.tsx`
**CRITICAL VISUAL INTERACTION PROTECTION:**
- ✅ **Edge highlighting regression detection** - Core UX feature protection
- ✅ Company selection triggering visual state changes
- ✅ Hover interactions and edge connection highlighting  
- ✅ Graph controls (zoom/pan) affecting edge visibility
- ✅ Connection data integrity for accurate edge highlighting

**Prevents:** Broken user workflows, failed external links, accessibility violations, **broken edge highlighting**

### 5. **Integration Testing** (15 tests) 📍 `src/__tests__/integration.test.tsx`
**What they protect:**
- ✅ Complete dataset integrity (all 15 companies validated)
- ✅ End-to-end user workflows with real company data
- ✅ Career URL functionality for all external links
- ✅ Performance benchmarks and render time validation
- ✅ Cross-component state management and data consistency

**Prevents:** Data corruption, broken external integrations, performance regressions

### 6. **🎯 E2E Visual Regression Testing** (6 tests) 📍 `e2e/basic.spec.ts`
**CRITICAL VISUAL BEHAVIOR PROTECTION** - Tests that detect what unit tests cannot:
- ✅ **Real browser application loading** across Chrome, Firefox, Safari
- ✅ **Screenshot-based regression detection** for UI changes
- ✅ **Cross-browser consistency** validation
- ✅ **Interactive element verification** (clickable companies)
- ✅ **Visual state capture** with baseline comparison
- ✅ **Application smoke testing** ensuring core functionality works

**Prevents:** Visual regressions invisible to unit tests, browser-specific issues, application loading failures

## Quick Test Documentation Generator

Generate real-time test summary:
```bash
npm run docs:tests
```

Output example:
```
🧪 Test Documentation Summary
📁 src/utils/__tests__/index.test.ts - 11 tests
📁 src/components/__tests__/CompanyDetailPanel.test.tsx - 16 tests  
🎯 Total Tests: 206 unit tests + 6 E2E tests across 13 test files
```  

## Test-Driven Development Workflow

### 1. Write Failing Test
```typescript
it('should format company type correctly', () => {
  expect(formatCompanyType('late-stage')).toBe('Late Stage')
})
```

### 2. Implement Feature
```typescript
export const formatCompanyType = (type: string): string => {
  return type.replace(/-/g, ' ').split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
```

### 3. Verify Test Passes
```bash
npm test -- formatCompanyType
```

### 4. Refactor with Confidence
Tests ensure no regressions during refactoring.

## Mocking Strategy

### Cytoscape.js
Complex graph library is mocked in `src/test/setup.ts`:
```typescript
vi.mock('cytoscape', () => ({
  default: vi.fn(() => mockCytoscapeInstance)
}))
```

### Window APIs
Browser APIs mocked for testing:
```typescript
Object.defineProperty(window, 'open', {
  value: vi.fn(),
})
```

## Continuous Integration

GitHub Actions workflow (`.github/workflows/ci.yml`):
1. **Build Check**: TypeScript compilation
2. **Unit Tests**: All test suites
3. **Coverage**: Generate and upload reports
4. **Artifacts**: Store test results

## Best Practices

### Writing Tests
1. **Descriptive Names**: Clear test intent
2. **Arrange-Act-Assert**: Consistent structure  
3. **Single Responsibility**: One concept per test
4. **Real Data**: Use actual company dataset
5. **User-Centric**: Test from user perspective

### Maintaining Tests
1. **Update with Features**: Tests evolve with code
2. **Mock Judiciously**: Mock external dependencies only
3. **Test Edge Cases**: Handle errors and empty states
4. **Performance Aware**: Fast test execution

### Debugging Tests
```bash
# Run specific test file
npm test -- CompanyDetailPanel

# Run with verbose output
npm test -- --reporter=verbose

# Debug single test
npm test -- --run -t "should format currency"
```

## Coverage Goals

Current coverage targets:
- **Functions**: >90%
- **Lines**: >85%
- **Branches**: >80%
- **Statements**: >85%

Key areas covered:
- ✅ All utility functions
- ✅ Core business logic
- ✅ User interactions
- ✅ Data validation
- ✅ Error handling
- ✅ Real dataset integrity

## Future Enhancements

### Planned Test Additions
1. **E2E Tests**: Playwright for full user journeys
2. **Visual Regression**: Screenshot comparisons
3. **Performance Tests**: Lighthouse CI
4. **Load Tests**: Stress testing with large datasets

### Test Automation
1. **Pre-commit Hooks**: Run tests before commits
2. **PR Validation**: Automated test runs on pull requests
3. **Coverage Thresholds**: Prevent coverage degradation
4. **Parallel Execution**: Faster test runs

This comprehensive testing setup ensures that Cosmos maintains high quality and reliability as new features are added and existing functionality is modified.