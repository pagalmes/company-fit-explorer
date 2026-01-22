# Contributing to Company Fit Explorer

Thank you for your interest in contributing! We follow Test-Driven Development to ensure code quality.

## Getting Started

1. **Fork the repository**
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/company-fit-explorer.git
   cd company-fit-explorer
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Create a branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Test-Driven Development (TDD)

We follow strict TDD practices:

1. **Write failing test first** (Red phase)
2. **Implement minimum code to pass** (Green phase)
3. **Refactor while keeping tests green** (Refactor phase)
4. **Repeat**

**Example TDD workflow:**

```bash
# 1. Write test
touch src/utils/__tests__/newFeature.test.ts

# 2. Watch tests (they should fail)
npm test

# 3. Implement feature
# Edit src/utils/newFeature.ts

# 4. Verify test passes
npm run test:run

# 5. Refactor and ensure tests still pass
```

### Before Submitting

Run all validation checks:

```bash
# Run all tests
npm run test:run

# Run performance regression tests
npm run test:performance

# Run E2E tests
npm run test:e2e

# Check coverage (should be >85%)
npm run test:coverage

# Build project
npm run build
```

## Pull Request Process

1. **Ensure all tests pass**
2. **Update documentation** if needed
3. **Add tests** for new features
4. **Follow code style** (TypeScript, functional components)
5. **Write clear commit messages**
6. **Submit PR** with description of changes

### PR Checklist

- [ ] Tests added and passing
- [ ] Coverage maintained above 85%
- [ ] Performance tests pass
- [ ] E2E tests pass (if UI changed)
- [ ] Documentation updated
- [ ] No console errors or warnings
- [ ] Code follows existing patterns

## Code Style

### TypeScript

- Use TypeScript strict mode
- Define interfaces for all data structures
- Prefer functional components
- Use meaningful variable names

### React Components

```typescript
// ✅ Good
interface Props {
  company: Company;
  onSelect: (id: number) => void;
}

export const CompanyCard: React.FC<Props> = ({ company, onSelect }) => {
  // Component logic
};

// ❌ Avoid
export default function CompanyCard(props: any) {
  // ...
}
```

### Testing

```typescript
// ✅ Good - Descriptive test names
describe("CompanyCard", () => {
  it("should display company name and match score", () => {
    // Test implementation
  });

  it("should call onSelect when clicked", () => {
    // Test implementation
  });
});

// ❌ Avoid - Vague test names
describe("CompanyCard", () => {
  it("works", () => {
    // ...
  });
});
```

## Testing Guidelines

### Unit Tests

- Test individual functions and utilities
- Mock external dependencies
- Aim for 100% coverage of critical paths

### Component Tests

- Test rendering and user interactions
- Use React Testing Library
- Focus on user behavior, not implementation details

### Integration Tests

- Test complete user workflows
- Verify data flow through components
- Test state management

### Performance Tests

- Detect infinite loops in useEffect
- Monitor API call frequency
- Check render performance

### E2E Tests

- Test critical user journeys
- Visual regression testing
- Cross-browser compatibility

## Documentation

Update documentation when:

- Adding new features
- Changing existing behavior
- Adding new configuration options
- Fixing bugs that affect usage

**Files to update:**

- `README.md` - If user-facing changes
- `docs/01-GETTING_STARTED.md` - If setup changes
- `docs/04-DATA_STRUCTURES.md` - If data models change
- `docs/05-CUSTOMIZATION.md` - If customization options change
- Inline code comments - For complex logic

## Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```bash
feat(graph): add company filtering by industry
fix(watchlist): resolve cross-tab sync issue
docs(readme): update installation instructions
test(performance): add infinite loop detection
```

## Questions?

- Check [existing issues](https://github.com/your-repo/issues)
- Read [documentation](README.md)
- Join our [Discord server](https://discord.gg/nuj6GrVt) (if invite expired, open a GitHub issue)
- Ask in discussions

Thank you for contributing! 🎉
