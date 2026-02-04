# Pre-Commit Hooks

## Overview

This project uses [Husky](https://typicode.github.io/husky/) with [lint-staged](https://github.com/okonet/lint-staged) for fast pre-commit checks. Heavy tests (unit, E2E, build) run in CI instead.

## What Runs on Commit

When you run `git commit`, only **ESLint** runs on staged `.ts` and `.tsx` files:

| Check | Scope | Time |
|-------|-------|------|
| ESLint with auto-fix | Staged files only | ~2 seconds |

This is intentionally minimal for fast developer iteration. Comprehensive checks run in CI.

## Configuration

### Husky Hook

**`.husky/pre-commit`**:
```bash
# Fast pre-commit hook - only lint staged files
# Full test suite runs in CI (see .github/workflows/ci.yml)
npx lint-staged
```

### lint-staged Config

**`package.json`**:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix"]
  }
}
```

## Usage

### Normal Commit

```bash
git add .
git commit -m "feat: Add new feature"
# ESLint runs on staged files (~2 seconds)
```

### Bypass Hook (Emergency Only)

```bash
git commit --no-verify -m "emergency: Hotfix"
```

> **Warning**: Bypassing hooks can introduce bugs. CI will still catch issues, but it's better to fix locally.

## Running Full Tests Locally

Before pushing, you may want to run the full test suite:

```bash
# Quick quality check
npm run lint           # Lint all files
npx tsc --noEmit       # Type check

# Full test suite
npm test               # Unit tests

# Build verification
npm run build          # Production build

# E2E tests (optional)
npm run test:e2e       # Playwright tests
```

### Run Everything

```bash
# Simulate CI locally
npm run lint && npx tsc --noEmit && npm test && npm run build
```

## Troubleshooting

### Hook Not Running

1. Verify husky is installed:
   ```bash
   ls -la .husky/pre-commit
   ```

2. Reinstall if needed:
   ```bash
   npm install
   npx husky install
   ```

3. Ensure hook is executable:
   ```bash
   chmod +x .husky/pre-commit
   ```

### ESLint Errors

If ESLint finds issues it can't auto-fix:

1. Read the error message
2. Fix manually
3. Stage the fix: `git add .`
4. Commit again

### lint-staged Stash Issues

If lint-staged has trouble with the git stash:

```bash
# Clear any stashed changes
git stash clear

# Try commit again
git commit -m "message"
```

## What Moved to CI?

Previously, pre-commit ran all these checks (taking several minutes):

| Check | Now Runs In |
|-------|-------------|
| ESLint | Pre-commit (staged only) |
| TypeScript | CI only |
| Unit Tests | CI only |
| Build | CI only |
| E2E Tests | CI only (disabled) |

This change reduced commit time from **minutes** to **~2 seconds**.

## CI Pipeline

The full test suite runs on GitHub Actions for:
- Pushes to `main` and `develop`
- Pull requests to `main`

See [CI/CD Documentation](../guides/CI_CD.md) for details.

## Best Practices

### Do

- Let lint-staged auto-fix issues
- Run `npm run lint` before pushing large changes
- Trust CI to catch comprehensive issues
- Keep commits small and focused

### Don't

- Use `--no-verify` regularly
- Ignore CI failures
- Push without checking CI status
- Disable the pre-commit hook

## Related Documentation

- [CI/CD Pipeline](../guides/CI_CD.md) - Full CI workflow documentation
- [Testing Guide](../guides/TESTING.md) - Complete testing strategy
