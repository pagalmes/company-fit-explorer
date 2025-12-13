/* eslint-disable react-hooks/exhaustive-deps */
import { renderHook } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, test, expect } from 'vitest';

/**
 * Tests to detect common React dependency array bugs that cause excessive re-renders
 * These tests validate our ability to catch the specific issues we encountered in production
 * Note: ESLint warnings are intentionally disabled as this file tests problematic patterns
 */
describe('Dependency Array Bug Detection', () => {
  test('should detect when array dependencies cause unnecessary re-renders', () => {
    let effectRunCount = 0;
    
    // Simulate the CompanyGraph selection effect bug
    const useTestHook = (selectedCompany: any, companies: any[]) => {
      useEffect(() => {
        effectRunCount++;
        if (selectedCompany) {
          // This simulates the selection highlighting logic
        }
      }, [selectedCompany, companies]); // BUG: companies array causes re-runs
    };

    const companies = [{ id: 1, name: 'Company 1' }];
    const { rerender } = renderHook(
      ({ selected, comps }) => useTestHook(selected, comps),
      {
        initialProps: { selected: { id: 1 }, comps: companies }
      }
    );

    const initialRunCount = effectRunCount;
    
    // Simulate companies array being recreated with same content (common React pattern)
    const newCompanies = [{ id: 1, name: 'Company 1' }];
    rerender({ selected: { id: 1 }, comps: newCompanies });
    
    // The bug: effect runs again even though selection didn't change
    expect(effectRunCount).toBeGreaterThan(initialRunCount);
    expect(effectRunCount).toBe(2); // Should be 1, but is 2 due to companies array instability
  });

  test('should demonstrate correct dependency array usage prevents excessive re-renders', () => {
    let effectRunCount = 0;
    
    // Simulate the FIXED version - only primitive values in dependencies
    const useTestHook = (selectedCompanyId: number | null, companies: any[]) => {
      useEffect(() => {
        effectRunCount++;
        if (selectedCompanyId) {
          // Logic can access companies but doesn't depend on the array reference
        }
      }, [selectedCompanyId]); // FIXED: Only primitive value in dependencies
    };

    const companies = [{ id: 1, name: 'Company 1' }];
    const { rerender } = renderHook(
      ({ selectedId, comps }) => useTestHook(selectedId, comps),
      {
        initialProps: { selectedId: 1, comps: companies }
      }
    );

    const initialRunCount = effectRunCount;
    
    // Simulate companies array being recreated with same content (common React pattern)
    const newCompanies = [{ id: 1, name: 'Company 1' }];
    rerender({ selectedId: 1, comps: newCompanies }); // Same selectedId, different companies array
    
    // Fixed: effect doesn't run again when companies array changes
    expect(effectRunCount).toBe(initialRunCount);
  });

  test('should detect function recreation causing re-renders', () => {
    let effectRunCount = 0;
    
    // Simulate the AppContainer markAsVisited function bug
    const useTestHook = (hasChecked: boolean, callback: () => void) => {
      useEffect(() => {
        effectRunCount++;
        if (hasChecked) {
          // Some initialization logic
        }
      }, [hasChecked, callback]); // BUG: callback function causes re-runs
    };

    const { rerender } = renderHook(
      ({ checked, fn }) => useTestHook(checked, fn),
      {
        initialProps: { 
          checked: true, 
          fn: () => {} // New function instance each time
        }
      }
    );

    const initialRunCount = effectRunCount;
    
    // Simulate component re-render creating new function instance
    rerender({ 
      checked: true, 
      fn: () => {} // Different function instance with same behavior
    });
    
    // The bug: effect runs again due to function recreation
    expect(effectRunCount).toBeGreaterThan(initialRunCount);
    expect(effectRunCount).toBe(2); // Should be 1, but is 2 due to function instability
  });

  test('should demonstrate stable function reference pattern', () => {
    let effectRunCount = 0;
    
    // Simulate the FIXED version without function in dependencies
    const useTestHook = (hasChecked: boolean, callback: () => void) => {
      useEffect(() => {
        effectRunCount++;
        if (hasChecked) {
          // Function can still be called, just not in dependencies
          callback();
        }
      }, [hasChecked]); // FIXED: Only primitive values in dependencies
    };

    const { rerender } = renderHook(
      ({ checked, fn }) => useTestHook(checked, fn),
      {
        initialProps: { 
          checked: true, 
          fn: () => {}
        }
      }
    );

    const initialRunCount = effectRunCount;
    
    // Simulate component re-render creating new function instance
    rerender({ 
      checked: true, 
      fn: () => {} // Different function instance
    });
    
    // Fixed: effect doesn't run when function changes
    expect(effectRunCount).toBe(initialRunCount);
    expect(effectRunCount).toBe(1); // Correctly stays at 1
  });
});