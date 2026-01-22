# Testing Summary

## Quick Reference

### Run All Tests
```bash
npm run test:all
```

### Fast Commit (Skip E2E)
```bash
SKIP_E2E=true git commit -m "message"
```

### Individual Test Suites
```bash
npm run lint                    # Linting
npx tsc --noEmit               # Type checking
npm run test:run               # Unit tests
npm run test:scroll            # Scroll behavior (unit + E2E)
npm run test:e2e               # All E2E tests
npm run test:critical          # Critical interactions
npm run build                  # Build verification
```

## Test Files Location

```
tests/
├── unit/
│   └── scroll-behavior.test.ts       # Scroll CSS/component structure tests
├── e2e/
│   ├── basic.spec.ts                 # Basic smoke tests
│   ├── critical-interactions.spec.ts # Critical user flows
│   └── scroll-behavior.spec.ts       # Scroll E2E behavior tests
└── integration/
    └── integration.test.tsx          # Integration tests

src/
└── **/__tests__/                     # Component unit tests
```

## Pre-Commit Hook

**Automatically runs on every commit:**
1. ✅ Linting (ESLint)
2. ✅ Type checking (TypeScript)
3. ✅ Unit tests (Vitest)
4. ✅ Scroll behavior tests
5. ✅ Build verification
6. ✅ E2E tests (optional, can skip)

**Skip E2E for faster commits:**
```bash
SKIP_E2E=true git commit -m "message"
```

**Bypass hook (emergency only):**
```bash
git commit --no-verify -m "message"
```

See [Pre-Commit Hooks Documentation](./pre-commit-hooks.md) for full details.

## Scroll Behavior Tests

Special tests to prevent scroll regressions:

**Why they exist:**
- Landing page, login, onboarding need to scroll
- Graph explorer needs fixed viewport (no scroll)
- CSS changes can break this behavior

**Run them:**
```bash
npm run test:scroll
```

See [Scroll Behavior Testing Documentation](./scroll-behavior-testing.md) for details.

## CI/CD

The same tests run in CI/CD pipelines to ensure consistency between local and remote environments.

## Test Coverage

- **Unit tests**: 300+ tests covering utilities, components, services
- **E2E tests**: Critical user interactions, scroll behavior, basic smoke tests
- **Integration tests**: Full app integration tests
- **Performance tests**: Regression detection for performance

## When Tests Fail

1. **Read the error message** - It tells you what failed
2. **Run the specific test** - Use the command shown in the error
3. **Fix the issue** - Update code or tests as needed
4. **Run all tests** - Ensure nothing else broke
5. **Commit** - Tests will run automatically

## Best Practices

✅ **DO:**
- Run tests before committing large changes
- Use `SKIP_E2E=true` for quick iterations
- Fix failing tests immediately
- Add tests for new features
- Keep commits small and focused

❌ **DON'T:**
- Use `--no-verify` regularly
- Ignore failing tests
- Commit broken code
- Skip tests manually without good reason

## Troubleshooting

### Tests Won't Run
```bash
chmod +x .husky/pre-commit
chmod +x scripts/pre-commit-tests.sh
```

### Tests Too Slow
```bash
SKIP_E2E=true git commit -m "message"
```

### Specific Test Failing
```bash
# Run just that test to see details
npm run test:run -- path/to/test.test.ts
```

## Documentation

- [Pre-Commit Hooks](./pre-commit-hooks.md) - Full pre-commit documentation
- [Scroll Behavior Testing](./scroll-behavior-testing.md) - Scroll test details
