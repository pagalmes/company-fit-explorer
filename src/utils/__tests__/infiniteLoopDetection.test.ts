import { renderHook, act } from '@testing-library/react';
import { useEffect, useState, useRef } from 'react';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

/**
 * Test utilities to detect infinite useEffect loops
 * Based on 2024 best practices for React testing
 */

// Mock console.error to catch React warnings about infinite loops
const originalConsoleError = console.error;
let consoleErrorSpy: any;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('Infinite Loop Detection Tests', () => {
  test('should detect infinite loop from unstable dependency object', () => {
    let renderCount = 0;
    
    const useInfiniteLoop = () => {
      renderCount++;
      const [count, setCount] = useState(0);
      
      // BAD: Object is recreated on every render, causing infinite loop
      const badDependency = { key: 'value' };
      
      useEffect(() => {
        // Prevent actual infinite loop in test by limiting renders
        if (renderCount <= 5) {
          setCount(prev => prev + 1);
        }
      }, [badDependency]); // This will cause excessive re-renders
      
      return count;
    };

    // Should cause excessive re-renders due to unstable dependency
    renderHook(() => useInfiniteLoop());
    expect(renderCount).toBeGreaterThan(3);
  });

  test('should detect infinite loop from missing dependencies', () => {
    let renderCount = 0;
    const useInfiniteLoop = () => {
      renderCount++;
      const [state, setState] = useState(0);
      
      useEffect(() => {
        if (renderCount <= 5) { // Prevent actual infinite loop in test
          setState(prev => prev + 1);
        }
      }); // Missing dependency array - causes effect to run on every render
      
      return state;
    };

    renderHook(() => useInfiniteLoop());
    
    // Should have caused excessive re-renders due to missing dependency array
    expect(renderCount).toBeGreaterThan(3);
  });

  test('should NOT trigger infinite loop with stable dependencies', () => {
    const useStableEffect = () => {
      const [count, setCount] = useState(0);
      const stableRef = useRef({ key: 'value' });
      
      useEffect(() => {
        // This should only run once
        setCount(1);
      }, [stableRef.current]); // Stable dependency
      
      return count;
    };

    const { result } = renderHook(() => useStableEffect());
    
    // Should not throw any errors
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(result.current).toBe(1);
  });

  test('should prevent infinite loop with empty dependency array', () => {
    let effectRunCount = 0;
    
    const useOnceEffect = () => {
      const [count, setCount] = useState(0);
      
      useEffect(() => {
        effectRunCount++;
        setCount(1);
      }, []); // Empty dependency array - should run only once
      
      return count;
    };

    const { result } = renderHook(() => useOnceEffect());
    
    expect(effectRunCount).toBe(1);
    expect(result.current).toBe(1);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});