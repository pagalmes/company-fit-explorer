# Pre-Commit Hooks

## Overview

This project uses [Husky](https://typicode.github.io/husky/) to run automated tests before every commit. This ensures code quality and prevents broken code from being committed.

## What Gets Tested

When you run `git commit`, the following tests run automatically:

### 1. **Linting** (ESLint)
- Checks code style and potential errors
- Command: `npm run lint`

### 2. **Type Checking** (TypeScript)
- Verifies TypeScript types are correct
- Command: `npx tsc --noEmit`

### 3. **Unit Tests** (Vitest)
- Runs all unit tests
- Command: `npm run test:run`

### 4. **Scroll Behavior Tests** (Critical)
- Ensures scroll/non-scroll behavior isn't broken
- Command: `npm run test:run -- tests/unit/scroll-behavior.test.ts`

### 5. **Build Verification** (Next.js)
- Ensures the application builds successfully
- Command: `npm run build`

### 6. **E2E Tests** (Playwright) - Optional
- Critical interactions test
- Scroll behavior E2E test
- **Can be skipped** with `SKIP_E2E=true` (see below)

## Running Tests Manually

### Run All Tests (Same as Pre-Commit)
```bash
npm run test:all
# or
npm run test:pre-commit
```

### Run All Tests (Skip E2E - Faster)
```bash
npm run test:pre-commit:fast
# or
SKIP_E2E=true npm run test:all
```

### Run Only Scroll Tests
```bash
npm run test:scroll
```

### Run Individual Test Suites
```bash
# Linting
npm run lint

# Type checking
npx tsc --noEmit

# Unit tests
npm run test:run

# E2E tests
npm run test:e2e

# Critical interactions
npm run test:critical

# Scroll behavior (unit only)
npm run test:run -- tests/unit/scroll-behavior.test.ts

# Scroll behavior (E2E only)
npm run test:e2e:scroll

# Build
npm run build
```

## Committing Code

### Normal Commit (All Tests)
```bash
git add .
git commit -m "feat: Add new feature"
# All tests run automatically
```

### Fast Commit (Skip E2E Tests)
If you're in a hurry and E2E tests are slow:

```bash
git add .
SKIP_E2E=true git commit -m "feat: Add new feature"
# Runs linting, type checking, unit tests, and build only
```

### Bypass Hooks (NOT RECOMMENDED)
Only use this in emergencies:

```bash
git commit --no-verify -m "emergency: Hotfix"
```

⚠️ **Warning**: Bypassing hooks can introduce bugs. Use sparingly and run tests manually afterward.

## What Happens When Tests Fail?

If any test fails:

1. **Commit is blocked** - Changes won't be committed
2. **Error summary shows** - You'll see which tests failed
3. **Fix the issues** - Run the failing test command to see details
4. **Try again** - Once fixed, commit again

Example output:

```
🧪 Running pre-commit test suite...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Linting
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶ Running ESLint...
✓ ESLint passed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. Type Checking
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶ Running TypeScript...
✗ TypeScript failed
  Run 'npx tsc --noEmit' to see details

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✗ Some tests failed. Please fix before committing.
💡 Tip: Run the failing test command to see details
💡 Tip: To skip E2E tests, use: SKIP_E2E=true git commit
```

## Troubleshooting

### Hook Not Running

If the hook doesn't run when you commit:

1. Check husky is installed:
   ```bash
   ls -la .husky/pre-commit
   ```

2. Ensure the hook is executable:
   ```bash
   chmod +x .husky/pre-commit
   chmod +x scripts/pre-commit-tests.sh
   ```

3. Reinstall husky:
   ```bash
   npm install
   npx husky install
   ```

### Tests Taking Too Long

**Solution 1**: Skip E2E tests
```bash
SKIP_E2E=true git commit -m "message"
```

**Solution 2**: Run tests manually first
```bash
# Run tests before staging changes
npm run test:pre-commit:fast

# If they pass, commit with --no-verify
git commit --no-verify -m "message"
```

**Solution 3**: Commit smaller changes more frequently
- Smaller commits = faster tests
- Easier to debug when tests fail

### E2E Tests Failing Locally

E2E tests might fail if:
- Browser automation is blocked
- Ports are in use
- Database isn't set up

**Quick fix**:
```bash
SKIP_E2E=true git commit -m "message"
```

Then run E2E tests separately:
```bash
npm run test:e2e
```

## Customizing the Hook

### Modify Test Script

Edit `scripts/pre-commit-tests.sh` to:
- Add new test suites
- Change test order
- Adjust output formatting
- Add conditional logic

### Modify Hook Behavior

Edit `.husky/pre-commit` to:
- Change environment variables
- Add additional checks
- Run different scripts

## Best Practices

### ✅ DO
- Run tests manually before committing large changes
- Use `SKIP_E2E=true` for quick iterations
- Fix failing tests immediately
- Keep commits focused and small
- Add new tests to the pre-commit script

### ❌ DON'T
- Use `--no-verify` regularly
- Commit broken code "just to save it" (use `git stash` instead)
- Ignore failing tests
- Commit without running tests manually first on large changes
- Remove the pre-commit hook

## CI/CD Integration

The same test suite runs on:
- **Pre-commit** (local, via Husky)
- **CI/CD** (GitHub Actions, etc.)

This ensures:
- Consistency between local and remote
- No surprises in CI
- Faster CI runs (most issues caught locally)

## Disabling Hooks (Temporary)

For development/debugging only:

```bash
# Disable all git hooks temporarily
git config core.hooksPath /dev/null

# Re-enable hooks
git config --unset core.hooksPath
```

## Summary

The pre-commit hook helps maintain code quality by:
- ✅ Preventing broken code from being committed
- ✅ Catching issues early (before CI/CD)
- ✅ Maintaining consistent code style
- ✅ Ensuring tests pass
- ✅ Verifying builds succeed

Use `SKIP_E2E=true` for faster commits during development, but always run full tests before pushing to production.
