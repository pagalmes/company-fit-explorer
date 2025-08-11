# Test Organization

This directory contains all tests for the Company Fit Explorer project, organized following 2025 React TypeScript best practices.

## Directory Structure

```
tests/
├── unit/                 # Unit test configuration and setup
│   └── setup.ts         # Vitest/Jest setup file
├── integration/         # Integration tests
│   └── integration.test.tsx
└── e2e/                 # End-to-end tests using Playwright
    ├── basic.spec.ts
    └── *-snapshots/     # Screenshot test baselines
```

## Test Types

- **Unit Tests**: Located in `src/components/__tests__/`, `src/utils/__tests__/`, etc.
- **Integration Tests**: Located in `tests/integration/`  
- **E2E Tests**: Located in `tests/e2e/`

## Running Tests

```bash
# Unit tests
npm run test:run

# Integration tests  
npm run test:run tests/integration

# E2E tests
npm run test:e2e

# All tests
npm run test:run && npm run test:e2e
```

This structure provides clear separation of concerns and follows modern React TypeScript testing practices.