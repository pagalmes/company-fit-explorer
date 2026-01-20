#!/usr/bin/env bash

# Pre-commit test suite
# Runs all tests to ensure code quality before committing
# Exit codes: 0 = success, 1 = failure

set -e  # Exit on first error

echo "🧪 Running pre-commit test suite..."
echo ""

# Track overall status
FAILED=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored status
print_status() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ $2${NC}"
  else
    echo -e "${RED}✗ $2${NC}"
    FAILED=1
  fi
}

# Function to run a test suite
run_test() {
  local name=$1
  local command=$2

  echo -e "${BLUE}▶ Running $name...${NC}"

  if eval "$command" > /dev/null 2>&1; then
    print_status 0 "$name passed"
  else
    print_status 1 "$name failed"
    echo -e "${YELLOW}  Run '$command' to see details${NC}"
  fi
  echo ""
}

# 1. Lint check
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}1. Linting${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
run_test "ESLint" "npm run lint"

# 2. TypeScript type checking (already part of build, but can be explicit)
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}2. Type Checking${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
run_test "TypeScript" "npx tsc --noEmit"

# 3. Unit tests (Vitest)
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}3. Unit Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
run_test "Vitest (unit tests)" "npm run test:run"

# 4. Scroll behavior tests (critical)
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}4. Scroll Behavior Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
run_test "Scroll behavior (unit)" "npm run test:run -- tests/unit/scroll-behavior.test.ts"

# 5. Build check
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}5. Build Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
run_test "Next.js build" "npm run build"

# 6. E2E tests (optional - can be slow, so make it skippable)
if [ "$SKIP_E2E" != "true" ]; then
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}6. E2E Tests${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  run_test "Critical interactions" "npm run test:critical"
  run_test "Scroll behavior (E2E)" "npx playwright test tests/e2e/scroll-behavior.spec.ts --config=config/playwright.config.ts"
else
  echo -e "${YELLOW}⊘ Skipping E2E tests (SKIP_E2E=true)${NC}"
  echo -e "${YELLOW}  To run E2E tests: unset SKIP_E2E or SKIP_E2E=false${NC}"
  echo ""
fi

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed! Ready to commit.${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed. Please fix before committing.${NC}"
  echo -e "${YELLOW}💡 Tip: Run the failing test command to see details${NC}"
  echo -e "${YELLOW}💡 Tip: To skip E2E tests, use: SKIP_E2E=true git commit${NC}"
  exit 1
fi
