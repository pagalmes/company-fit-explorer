/**
 * Performance test setup for detecting infinite loops and performance regressions
 * Based on 2024 React testing best practices
 */
import { vi, beforeEach, afterEach, beforeAll, afterAll, expect } from 'vitest';

// Global timeout to catch infinite loops in tests
let testStartTime: number;
const MAX_TEST_DURATION = 8000; // 8 seconds

beforeEach(() => {
  testStartTime = Date.now();
  
  // Set up global timeout for infinite loop detection
  const timeoutId = setTimeout(() => {
    const duration = Date.now() - testStartTime;
    throw new Error(`Test timeout after ${duration}ms - possible infinite loop detected`);
  }, MAX_TEST_DURATION);
  
  // Clear timeout when test completes
  afterEach(() => {
    clearTimeout(timeoutId);
  });
});

// Mock console.error to catch React warnings about infinite loops
const originalConsoleError = console.error;
const performanceWarnings: string[] = [];

beforeAll(() => {
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    
    // Detect React performance warnings
    if (
      message.includes('Maximum update depth exceeded') ||
      message.includes('Too many re-renders') ||
      message.includes('infinite') ||
      message.includes('useEffect') && message.includes('dependency')
    ) {
      performanceWarnings.push(message);
      
      // Fail test immediately on infinite loop warnings
      throw new Error(`Performance issue detected: ${message}`);
    }
    
    // Call original console.error for other warnings
    originalConsoleError.apply(console, args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  
  // Report any performance warnings found
  if (performanceWarnings.length > 0) {
    console.warn('Performance warnings detected during tests:', performanceWarnings);
  }
});

// Mock fetch to detect excessive API calls
let fetchCallCount = 0;
const originalFetch = global.fetch;

beforeEach(() => {
  fetchCallCount = 0;
  
  global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    fetchCallCount++;
    
    // Detect potential infinite API call loops
    if (fetchCallCount > 5) {
      throw new Error(`Excessive API calls detected: ${fetchCallCount} calls in single test`);
    }
    
    return originalFetch.call(global, input, init);
  }) as any;
});

afterEach(() => {
  global.fetch = originalFetch;
});

// Performance measurement utilities
export const measureRenderTime = (renderFn: () => void): number => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
};

export const expectNoInfiniteLoop = (fn: () => void, maxDuration = 1000) => {
  const start = Date.now();
  fn();
  const duration = Date.now() - start;
  
  if (duration > maxDuration) {
    throw new Error(`Function took ${duration}ms, possible infinite loop (max: ${maxDuration}ms)`);
  }
};

// Custom matcher for performance testing
expect.extend({
  toCompleteWithinTime(received: () => void, maxDuration: number) {
    const start = performance.now();
    received();
    const duration = performance.now() - start;
    
    const pass = duration <= maxDuration;
    
    return {
      message: () =>
        pass
          ? `Expected function to take more than ${maxDuration}ms but completed in ${duration}ms`
          : `Expected function to complete within ${maxDuration}ms but took ${duration}ms`,
      pass,
    };
  },
});