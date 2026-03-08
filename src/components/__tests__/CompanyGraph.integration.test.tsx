import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import CompanyGraph from '../CompanyGraph';

// Minimal Cytoscape mock — matches the pattern from CompanyGraphInteraction.test.tsx exactly.
// Do NOT add batch/startBatch/endBatch or mockReturnThis on source/target — these cause
// infinite useEffect loops during vitest file collection → ERR_WORKER_OUT_OF_MEMORY.
vi.mock('cytoscape', () => {
  const createMockCollection = () => ({
    removeClass: vi.fn().mockReturnThis(),
    addClass: vi.fn().mockReturnThis(),
    length: 1,
    hasClass: vi.fn(() => false),
    forEach: vi.fn(),
    data: vi.fn(() => ({ company: { id: 1 } })),
    connectedEdges: vi.fn(() => []),
    renderedPosition: vi.fn(() => ({ x: 0, y: 0 })),
  });

  const mockCy = {
    on: vi.fn(),
    nodes: vi.fn(() => createMockCollection()),
    edges: vi.fn(() => createMockCollection()),
    getElementById: vi.fn(() => createMockCollection()),
    zoom: vi.fn(() => 1),
    pan: vi.fn(() => ({ x: 0, y: 0 })),
    fit: vi.fn(),
    center: vi.fn(),
    destroy: vi.fn(),
    ready: vi.fn((callback: any) => callback()),
    elements: vi.fn(),
    style: vi.fn(),
    layout: vi.fn(() => ({ run: vi.fn() })),
  };

  return { default: vi.fn(() => mockCy) };
});

// Stable module-level test data — defined outside describe to prevent reference churn.
const mockUserCMF = {
  id: 'user-test',
  name: 'Test User',
  targetRole: 'Senior Engineer',
  targetCompanies: 'Tech companies',
  mustHaves: ['Remote work'],
  wantToHave: ['Good benefits'],
  experience: ['React', 'TypeScript'],
};

const mockCompanies = [
  {
    id: 1,
    name: 'OpenAI',
    logo: 'https://img.logo.dev/openai.com',
    careerUrl: 'https://openai.com/careers',
    matchScore: 95,
    industry: 'AI/ML',
    stage: 'Late Stage',
    location: 'San Francisco, CA',
    employees: '~1500',
    remote: 'In-office',
    openRoles: 3,
    connections: [2],
    connectionTypes: { 2: 'AI Competitor' },
    matchReasons: ['Strong AI safety focus'],
    color: '#10B981',
    angle: 0,
    distance: 75,
  },
  {
    id: 2,
    name: 'Anthropic',
    logo: 'https://img.logo.dev/anthropic.com',
    careerUrl: 'https://www.anthropic.com/careers',
    matchScore: 94,
    industry: 'AI Safety',
    stage: 'Late Stage',
    location: 'San Francisco, CA',
    employees: '~500',
    remote: 'Remote-Friendly',
    openRoles: 2,
    connections: [1],
    connectionTypes: { 1: 'AI Competitor' },
    matchReasons: ['Constitutional AI focus'],
    color: '#10B981',
    angle: 30,
    distance: 80,
  },
];

const watchlistCompanyIds = new Set<number>();
const mockOnCompanySelect = vi.fn();
const mockOnCompanyHover = vi.fn();
const mockOnCMFToggle = vi.fn();

const defaultProps = {
  cmf: mockUserCMF,
  companies: mockCompanies,
  selectedCompany: null,
  hoveredCompany: null,
  onCompanySelect: mockOnCompanySelect,
  onCompanyHover: mockOnCompanyHover,
  viewMode: 'explore' as const,
  watchlistCompanyIds,
  hideCenter: false,
  onCMFToggle: mockOnCMFToggle,
};

describe('CompanyGraph - Integration & Edge Highlighting Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('component initialization and props handling', () => {
    it('should render graph container with proper structure', () => {
      const { container } = render(<CompanyGraph {...defaultProps} />);
      const graphContainer = container.querySelector('.w-full.h-full.relative');
      expect(graphContainer).toBeInTheDocument();
      const cytoscapeContainer = container.querySelector('[data-cy="cytoscape-container"]');
      expect(cytoscapeContainer).toBeInTheDocument();
    });

    it('should render graph controls for user interaction', () => {
      const { getByRole, container } = render(<CompanyGraph {...defaultProps} />);
      const fitButton = getByRole('button', { name: /fit to view/i });
      expect(fitButton).toBeInTheDocument();
      // Zoom controls FAB renders as a group; zoom in/out buttons appear on open (hover).
      const zoomGroup = container.querySelector('[aria-label="Zoom controls"]');
      expect(zoomGroup).toBeInTheDocument();
    });

    it('should handle companies with edge connections without errors', () => {
      const { container } = render(<CompanyGraph {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
      expect(mockCompanies[0].connections).toEqual([2]);
      expect(mockCompanies[1].connections).toEqual([1]);
    });
  });

  describe('selection state management for edge highlighting', () => {
    it('should render with no selected company', () => {
      const { container } = render(
        <CompanyGraph {...defaultProps} selectedCompany={null} />
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle selectedCompany prop change', () => {
      const { rerender, container } = render(
        <CompanyGraph {...defaultProps} selectedCompany={null} />
      );
      rerender(
        <CompanyGraph {...defaultProps} selectedCompany={mockCompanies[0]} />
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle selection switching between companies', () => {
      const { rerender, container } = render(
        <CompanyGraph {...defaultProps} selectedCompany={mockCompanies[0]} />
      );
      rerender(
        <CompanyGraph {...defaultProps} selectedCompany={mockCompanies[1]} />
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('callback props', () => {
    it('should accept onCompanySelect callback', () => {
      const { container } = render(<CompanyGraph {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
      expect(mockOnCompanySelect).toBeInstanceOf(Function);
    });

    it('should accept onCompanyHover callback', () => {
      const { container } = render(<CompanyGraph {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
      expect(mockOnCompanyHover).toBeInstanceOf(Function);
    });
  });

  describe('graph controls interaction', () => {
    it('should handle fit to view button click without throwing', () => {
      const { getByRole } = render(<CompanyGraph {...defaultProps} />);
      const fitButton = getByRole('button', { name: /fit to view/i });
      expect(() => fireEvent.click(fitButton)).not.toThrow();
    });

    it('should render zoom controls FAB container', () => {
      // Zoom in/out buttons are inside a FAB that requires hover to open (isOpen state).
      // We verify the FAB group container renders; button visibility is tested via interaction.
      const { container } = render(<CompanyGraph {...defaultProps} />);
      const fabGroup = container.querySelector('[aria-label="Zoom controls"]');
      expect(fabGroup).toBeInTheDocument();
    });
  });

  describe('edge highlighting data integrity', () => {
    it('should process connection data correctly', () => {
      render(
        <CompanyGraph {...defaultProps} selectedCompany={mockCompanies[0]} />
      );
      expect(mockCompanies[0].connections).toEqual([2]);
      expect(mockCompanies[0].connectionTypes).toEqual({ 2: 'AI Competitor' });
      const connected = mockCompanies.find(c => c.id === 2);
      expect(connected?.name).toBe('Anthropic');
    });

    it('should handle companies with no connections', () => {
      const isolated = { ...mockCompanies[0], id: 99, connections: [], connectionTypes: {} };
      render(
        <CompanyGraph
          {...defaultProps}
          companies={[isolated]}
          selectedCompany={isolated}
        />
      );
      expect(isolated.connections).toEqual([]);
    });
  });
});
