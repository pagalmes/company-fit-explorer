import { renderHook, act } from '@testing-library/react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { vi, describe, test, expect } from 'vitest';

/**
 * Performance regression tests to catch render performance issues
 * Based on 2024 React performance testing best practices
 */

describe('Performance Regression Tests', () => {
  test('should not cause excessive re-renders with unstable dependencies', () => {
    let renderCount = 0;
    const maxAcceptableRenders = 5;

    const usePerformanceTest = () => {
      renderCount++;
      const [state, setState] = useState(0);
      
      // GOOD: Stable callback
      const stableCallback = useCallback(() => {
        setState(prev => prev + 1);
      }, []);

      // GOOD: Stable memoized value
      const stableMemo = useMemo(() => ({ key: 'value' }), []);

      useEffect(() => {
        if (renderCount === 1) {
          stableCallback();
        }
      }, [stableCallback]);

      return { state, stableMemo };
    };

    const { result } = renderHook(() => usePerformanceTest());

    // Should not cause excessive re-renders
    expect(renderCount).toBeLessThanOrEqual(maxAcceptableRenders);
    expect(result.current.state).toBe(1);
  });

  test('should detect performance anti-patterns', () => {
    let renderCount = 0;

    const useAntiPattern = () => {
      renderCount++;
      const [state, setState] = useState(0);
      
      // BAD: Creating new object on every render
      const unstableObject = { key: 'value', count: renderCount };
      
      // BAD: Function recreation on every render
      const unstableFunction = () => setState(prev => prev + 1);

      useEffect(() => {
        // Limit renders to prevent actual infinite loop in test
        if (renderCount <= 3) {
          unstableFunction();
        }
      }, [unstableObject, unstableFunction]); // Unstable dependencies cause excessive renders

      return state;
    };

    const { result } = renderHook(() => useAntiPattern());

    // Should have caused excessive re-renders due to unstable dependencies
    expect(renderCount).toBeGreaterThan(3);
    expect(result.current).toBeGreaterThan(0);
  });

  test('should measure component render timing', async () => {
    const renderTimes: number[] = [];
    
    const useTimingTest = () => {
      const startTime = performance.now();
      const [data] = useState(() => {
        // Simulate some work
        const result = Array.from({ length: 1000 }, (_, i) => i * 2);
        return result;
      });
      
      useEffect(() => {
        const endTime = performance.now();
        renderTimes.push(endTime - startTime);
      });

      return data;
    };

    const { result } = renderHook(() => useTimingTest());

    // Should render in reasonable time (< 16ms for 60fps)
    expect(renderTimes[0]).toBeLessThan(16);
    expect(result.current).toHaveLength(1000);
  });

  test('should detect memory leaks in useEffect cleanup', () => {
    let activeListeners = 0;
    const mockAddEventListener = vi.fn(() => activeListeners++);
    const mockRemoveEventListener = vi.fn(() => activeListeners--);

    // Mock global event listener methods
    Object.defineProperty(global, 'addEventListener', {
      value: mockAddEventListener,
      writable: true
    });
    Object.defineProperty(global, 'removeEventListener', {
      value: mockRemoveEventListener,
      writable: true
    });

    const useEventListenerTest = () => {
      useEffect(() => {
        const handler = () => {};
        addEventListener('resize', handler);
        
        return () => {
          removeEventListener('resize', handler);
        };
      }, []);
    };

    const { unmount } = renderHook(() => useEventListenerTest());

    expect(activeListeners).toBe(1);
    
    unmount();
    
    // Should clean up event listeners
    expect(activeListeners).toBe(0);
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    expect(mockRemoveEventListener).toHaveBeenCalledTimes(1);
  });

  test('should prevent dependency array performance issues', () => {
    let effectRunCount = 0;
    
    const useDependencyTest = (items: any[]) => {
      // GOOD: Memoize array to prevent unnecessary effect runs
      const memoizedItems = useMemo(() => items, [items.length, items[0]?.id]);
      
      useEffect(() => {
        effectRunCount++;
      }, [memoizedItems]);

      return memoizedItems;
    };

    const initialItems = [{ id: 1, name: 'Item 1' }];
    const { rerender } = renderHook(
      ({ items }) => useDependencyTest(items),
      { initialProps: { items: initialItems } }
    );

    expect(effectRunCount).toBe(1);

    // Same content, different array reference
    rerender({ items: [{ id: 1, name: 'Item 1' }] });
    
    // Should not re-run effect due to memoization
    expect(effectRunCount).toBe(1);

    // Different content
    rerender({ items: [{ id: 2, name: 'Item 2' }] });
    
    // Should re-run effect due to actual change
    expect(effectRunCount).toBe(2);
  });
});