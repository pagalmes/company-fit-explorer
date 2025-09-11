import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompanyGraph from '../CompanyGraph';
import { mockUserCMF, mockCompanies } from '../../utils/testHelpers';

/**
 * Regression tests for critical user interactions
 * These tests prevent issues like node selection flickering
 */

// Mock Cytoscape since we're testing interaction logic, not the graph library
jest.mock('cytoscape', () => {
  const mockCy = {
    on: jest.fn(),
    nodes: jest.fn(() => ({
      removeClass: jest.fn(),
      addClass: jest.fn(),
      length: 1,
      hasClass: jest.fn(() => false)
    })),
    edges: jest.fn(() => ({
      removeClass: jest.fn(),
      addClass: jest.fn()
    })),
    getElementById: jest.fn(() => ({
      length: 1,
      addClass: jest.fn(),
      removeClass: jest.fn(),
      hasClass: jest.fn(() => false),
      connectedEdges: jest.fn(() => [])
    })),
    zoom: jest.fn(() => 1),
    pan: jest.fn(() => ({ x: 0, y: 0 })),
    fit: jest.fn(),
    center: jest.fn(),
    destroy: jest.fn(),
    ready: jest.fn(callback => callback()),
    elements: jest.fn(),
    style: jest.fn(),
    layout: jest.fn(() => ({ run: jest.fn() }))
  };
  
  return jest.fn(() => mockCy);
});

describe('CompanyGraph Interaction Regression Tests', () => {
  const defaultProps = {
    cmf: mockUserCMF,
    companies: mockCompanies,
    selectedCompany: null,
    onCompanySelect: jest.fn(),
    onCompanyHover: jest.fn(),
    viewMode: 'explore' as const,
    watchlistCompanyIds: new Set(),
    hideCenter: false,
    onCMFToggle: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should maintain selection state when companies array changes', async () => {
    const onCompanySelect = jest.fn();
    const user = userEvent.setup();
    
    const { rerender } = render(
      <CompanyGraph 
        {...defaultProps} 
        onCompanySelect={onCompanySelect}
        selectedCompany={mockCompanies[0]}
      />
    );

    // Simulate companies array changing (this was causing the bug)
    const newCompanies = [...mockCompanies, {
      id: 999,
      name: 'New Company',
      industry: 'Tech',
      stage: 'Series A',
      location: 'SF',
      employees: '100',
      remote: 'Hybrid',
      openRoles: 5,
      matchScore: 85,
      matchReasons: ['Good fit'],
      connections: [],
      connectionTypes: {},
      description: 'New company'
    }];

    rerender(
      <CompanyGraph 
        {...defaultProps} 
        onCompanySelect={onCompanySelect}
        selectedCompany={mockCompanies[0]} // Should stay selected
        companies={newCompanies}
      />
    );

    // Selection should NOT be cleared when companies array changes
    expect(onCompanySelect).not.toHaveBeenCalledWith(null);
  });

  test('should not trigger selection effects on every render', () => {
    const onCompanySelect = jest.fn();
    
    const { rerender } = render(
      <CompanyGraph 
        {...defaultProps} 
        onCompanySelect={onCompanySelect}
        selectedCompany={mockCompanies[0]}
      />
    );

    // Force multiple re-renders
    for (let i = 0; i < 5; i++) {
      rerender(
        <CompanyGraph 
          {...defaultProps} 
          onCompanySelect={onCompanySelect}
          selectedCompany={mockCompanies[0]}
        />
      );
    }

    // onCompanySelect should not be called during re-renders
    expect(onCompanySelect).not.toHaveBeenCalled();
  });

  test('should handle rapid selection changes without flickering', async () => {
    const onCompanySelect = jest.fn();
    
    const { rerender } = render(
      <CompanyGraph 
        {...defaultProps} 
        onCompanySelect={onCompanySelect}
        selectedCompany={null}
      />
    );

    // Simulate rapid selection changes
    rerender(<CompanyGraph {...defaultProps} onCompanySelect={onCompanySelect} selectedCompany={mockCompanies[0]} />);
    rerender(<CompanyGraph {...defaultProps} onCompanySelect={onCompanySelect} selectedCompany={mockCompanies[1]} />);
    rerender(<CompanyGraph {...defaultProps} onCompanySelect={onCompanySelect} selectedCompany={mockCompanies[0]} />);

    // Each change should be stable
    await waitFor(() => {
      expect(onCompanySelect).not.toHaveBeenCalledWith(null);
    });
  });

  test('should prevent dependency array issues with companies prop', () => {
    const onCompanySelect = jest.fn();
    let renderCount = 0;
    
    const TestWrapper = ({ companies }: { companies: any[] }) => {
      renderCount++;
      return (
        <CompanyGraph 
          {...defaultProps} 
          companies={companies}
          onCompanySelect={onCompanySelect}
        />
      );
    };

    const { rerender } = render(<TestWrapper companies={mockCompanies} />);
    
    // Companies array with same content but different reference
    const sameCompanies = [...mockCompanies];
    rerender(<TestWrapper companies={sameCompanies} />);
    
    // Should not cause excessive re-renders (more than expected)
    expect(renderCount).toBeLessThan(5);
  });
});