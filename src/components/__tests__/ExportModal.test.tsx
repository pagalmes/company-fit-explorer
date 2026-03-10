import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('../../lib/analytics', () => ({
  track: vi.fn(),
}));

import ExportModal from '../ExportModal';
import type { Company } from '../../types';

const makeCompany = (id: number, name: string): Company => ({
  id,
  name,
  logo: '',
  careerUrl: `https://${name.toLowerCase()}.com/careers`,
  matchScore: 85,
  industry: 'Tech',
  stage: 'Growth',
  location: 'SF',
  employees: '~500',
  remote: 'Hybrid',
  openRoles: 3,
  connections: [],
  connectionTypes: {},
  matchReasons: ['Great culture'],
  color: '#000',
  angle: 0,
  distance: 100,
});

const companies = [makeCompany(1, 'Stripe'), makeCompany(2, 'Plaid'), makeCompany(3, 'Brex')];

describe('ExportModal', { timeout: 5000 }, () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Stub download-related APIs
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:mock'),
      revokeObjectURL: vi.fn(),
    });
    // Mock anchor click to prevent jsdom navigation
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = document.createElementNS('http://www.w3.org/1999/xhtml', tag) as HTMLElement;
      if (tag === 'a') {
        Object.defineProperty(el, 'click', { value: vi.fn(), configurable: true });
      }
      return el;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ExportModal isOpen={false} onClose={vi.fn()} companies={companies} viewMode="explore" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal when isOpen is true', () => {
    render(<ExportModal isOpen={true} onClose={vi.fn()} companies={companies} viewMode="explore" />);
    expect(screen.getByText('Export Companies')).toBeInTheDocument();
  });

  it('shows company count', () => {
    render(<ExportModal isOpen={true} onClose={vi.fn()} companies={companies} viewMode="explore" />);
    expect(screen.getByText(/3 companies/)).toBeInTheDocument();
  });

  it('shows singular company when count is 1', () => {
    render(<ExportModal isOpen={true} onClose={vi.fn()} companies={[makeCompany(1, 'Stripe')]} viewMode="explore" />);
    expect(screen.getByText(/1 company/)).toBeInTheDocument();
  });

  it('shows viewMode in header', () => {
    render(<ExportModal isOpen={true} onClose={vi.fn()} companies={companies} viewMode="watchlist" />);
    expect(screen.getByText(/watchlist/i)).toBeInTheDocument();
  });

  it('lists company names in preview', () => {
    render(<ExportModal isOpen={true} onClose={vi.fn()} companies={companies} viewMode="explore" />);
    expect(screen.getByText('Stripe')).toBeInTheDocument();
    expect(screen.getByText('Plaid')).toBeInTheDocument();
    expect(screen.getByText('Brex')).toBeInTheDocument();
  });

  it('shows +N more for lists over 10 companies', () => {
    const many = Array.from({ length: 13 }, (_, i) => makeCompany(i + 1, `Co${i + 1}`));
    render(<ExportModal isOpen={true} onClose={vi.fn()} companies={many} viewMode="explore" />);
    expect(screen.getByText('+3 more')).toBeInTheDocument();
  });

  it('defaults to CSV format selected', () => {
    render(<ExportModal isOpen={true} onClose={vi.fn()} companies={companies} viewMode="explore" />);
    // CSV button should have the selected border class
    const csvButton = screen.getByText('CSV').closest('button');
    expect(csvButton?.className).toMatch(/border-blue-500/);
  });

  it('can select Markdown format', () => {
    render(<ExportModal isOpen={true} onClose={vi.fn()} companies={companies} viewMode="explore" />);
    fireEvent.click(screen.getByText('Markdown Table').closest('button')!);
    const mdButton = screen.getByText('Markdown Table').closest('button');
    expect(mdButton?.className).toMatch(/border-blue-500/);
  });

  it('can select JSON format', () => {
    render(<ExportModal isOpen={true} onClose={vi.fn()} companies={companies} viewMode="explore" />);
    fireEvent.click(screen.getByText('JSON').closest('button')!);
    const jsonButton = screen.getByText('JSON').closest('button');
    expect(jsonButton?.className).toMatch(/border-blue-500/);
  });

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn();
    render(<ExportModal isOpen={true} onClose={onClose} companies={companies} viewMode="explore" />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <ExportModal isOpen={true} onClose={onClose} companies={companies} viewMode="explore" />
    );
    const backdrop = container.querySelector('.fixed.inset-0.bg-black');
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes modal after export via timeout', async () => {
    const onClose = vi.fn();
    render(<ExportModal isOpen={true} onClose={onClose} companies={companies} viewMode="explore" />);
    await act(async () => {
      fireEvent.click(screen.getByText('Export'));
    });
    vi.advanceTimersByTime(300);
    expect(onClose).toHaveBeenCalled();
  });

  it('Export button is disabled when no companies', () => {
    render(<ExportModal isOpen={true} onClose={vi.fn()} companies={[]} viewMode="explore" />);
    expect(screen.getByText('Export').closest('button')).toBeDisabled();
  });

  it('shows all three format options', () => {
    render(<ExportModal isOpen={true} onClose={vi.fn()} companies={companies} viewMode="explore" />);
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('Markdown Table')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
  });
});
