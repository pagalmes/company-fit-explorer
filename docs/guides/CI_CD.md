# CI/CD Pipeline

This document describes the Continuous Integration and Continuous Deployment pipeline for the Cosmos project.

## Overview

The CI/CD pipeline ensures code quality through automated checks at two stages:

1. **Pre-commit (Local)** - Fast lint checks via `lint-staged`
2. **Pull Request (CI)** - Comprehensive quality gates via GitHub Actions

```
┌─────────────────────────────────────────────────────────────────┐
│                        Developer Workflow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   [Code Change] → [git commit] → [lint-staged] → [git push]     │
│                         │              │              │          │
│                         │         ~2 seconds          │          │
│                         │              │              │          │
│                         ▼              ▼              ▼          │
│                    ┌─────────────────────────────────────┐      │
│                    │         GitHub Actions CI           │      │
│                    ├─────────────────────────────────────┤      │
│                    │  Quality → Tests → Build            │      │
│                    │    │         │        │             │      │
│                    │    ▼         ▼        ▼             │      │
│                    │  ESLint   Vitest   Next.js          │      │
│                    │  TSC               Build            │      │
│                    └─────────────────────────────────────┘      │
│                                   │                              │
│                                   ▼                              │
│                         [Merge to main]                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Pre-Commit Hooks (Local)

Pre-commit hooks provide fast feedback during development. We use [lint-staged](https://github.com/okonet/lint-staged) to run ESLint only on staged files.

### What Runs

| Check | Command | Time |
|-------|---------|------|
| ESLint (staged files only) | `eslint --fix` | ~2s |

### Configuration

**`.husky/pre-commit`**:
```bash
npx lint-staged
```

**`package.json`**:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix"]
  }
}
```

### Skipping Pre-Commit (Not Recommended)

```bash
# Emergency only - use sparingly
git commit --no-verify -m "message"
```

## GitHub Actions CI

The CI pipeline runs on every push to `main`/`develop` and on pull requests to `main`.

### Pipeline Structure

```yaml
Jobs:
  quality:     # Fast feedback - runs first
    - ESLint
    - TypeScript type check

  test:        # Runs after quality passes
    - Unit tests (Vitest)
    - Coverage upload

  build:       # Runs after quality passes (parallel with test)
    - Next.js production build

  e2e:         # Disabled - see notes below
    - Playwright tests
```

### Job Details

#### 1. Quality Check

**Purpose**: Fast feedback on code quality issues

| Step | Command | Description |
|------|---------|-------------|
| ESLint | `npm run lint` | Linting all files |
| TypeScript | `npx tsc --noEmit` | Type checking without emit |

**Why first?** Quality issues are fast to detect and common. Running this first gives quick feedback before slower tests run.

#### 2. Unit Tests

**Purpose**: Verify application logic

| Step | Command | Description |
|------|---------|-------------|
| Validate setup | `npm run test:validate` | Ensure test config is correct |
| Run tests | `npm test` | All Vitest unit tests |
| Coverage | Codecov upload | Track test coverage |

**Note**: Uses `npm test` (not `npm run test:run`) to handle a known Vitest snapshot bug.

#### 3. Build

**Purpose**: Verify production build succeeds

| Step | Command | Description |
|------|---------|-------------|
| Build | `npm run build` | Next.js production build |

**Environment Variables**: The build job uses placeholder values for required env vars when secrets aren't configured:

```yaml
env:
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co' }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key' }}
  NEXT_PUBLIC_POSTHOG_KEY: ${{ secrets.NEXT_PUBLIC_POSTHOG_KEY || 'placeholder-key' }}
```

#### 4. E2E Tests (Disabled)

**Status**: Currently disabled due to cross-platform screenshot differences

**Why disabled?**
- Visual regression tests produce different screenshots on CI vs local machines
- Font rendering, anti-aliasing, and browser versions vary between environments
- Results in flaky tests that pass locally but fail in CI

**To run E2E locally**:
```bash
npm run test:e2e
```

**Re-enabling E2E**: See the commented job in `.github/workflows/ci.yml` for the full configuration.

## Workflow File

Located at: `.github/workflows/ci.yml`

### Triggers

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
```

### Caching

Node modules are cached using the built-in npm cache in `setup-node`:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
```

## Required Secrets

Configure these in GitHub repository settings → Secrets and variables → Actions:

| Secret | Required | Description |
|--------|----------|-------------|
| `CODECOV_TOKEN` | Optional | For coverage reports |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Supabase anonymous key |
| `NEXT_PUBLIC_POSTHOG_KEY` | Optional | PostHog analytics key |

**Note**: Build will succeed with placeholder values if secrets aren't configured.

## Branch Protection (Recommended)

To require CI to pass before merging:

1. Go to repository Settings → Branches
2. Add rule for `main` branch
3. Enable "Require status checks to pass before merging"
4. Select required checks:
   - `Quality Check`
   - `Unit Tests`
   - `Build`

## Troubleshooting

### CI Failing but Local Passes

1. **Lint differences**: CI runs on all files, pre-commit only on staged files
   ```bash
   npm run lint  # Run full lint locally
   ```

2. **TypeScript errors**: Ensure no type errors
   ```bash
   npx tsc --noEmit
   ```

3. **Environment variables**: Check if build needs specific env vars

### Tests Timing Out

- Unit tests have a 2-minute default timeout
- If tests are slow, check for:
  - Unhandled promises
  - Missing test cleanup
  - Database/network calls in unit tests

### Build Failing

1. Check for TypeScript errors: `npx tsc --noEmit`
2. Check for missing dependencies: `npm ci`
3. Check environment variables are set (or have fallbacks)

## Local CI Simulation

Run all CI checks locally before pushing:

```bash
# Quality checks
npm run lint
npx tsc --noEmit

# Tests
npm test

# Build
npm run build

# E2E (optional)
npm run test:e2e
```

## Related Documentation

- [Pre-Commit Hooks](../testing/pre-commit-hooks.md) - Local hook configuration
- [Testing Guide](./TESTING.md) - Complete testing strategy
- [Known Test Issues](../testing/known-test-issues.md) - Test troubleshooting
