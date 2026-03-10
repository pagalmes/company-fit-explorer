import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import JobAlertsModal from '../JobAlertsModal';
import type { Company } from '../../types';

const mockCompany: Company = {
  id: 1,
  name: 'Stripe',
  logo: '',
  careerUrl: 'https://stripe.com/jobs',
  matchScore: 90,
  industry: 'Fintech',
  stage: 'Late Stage',
  location: 'SF',
  employees: '~8000',
  remote: 'Hybrid',
  openRoles: 5,
  connections: [],
  connectionTypes: {},
  matchReasons: [],
  color: '#6772E5',
  angle: 45,
  distance: 120,
};

describe('JobAlertsModal', { timeout: 5000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch to return key terms quickly
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ keyTerms: ['software engineer', 'backend engineer'] }),
    }));
    // Mock clipboard
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <JobAlertsModal isOpen={false} onClose={vi.fn()} company={mockCompany} targetRole="Engineer" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal header when isOpen is true', async () => {
    render(
      <JobAlertsModal isOpen={true} onClose={vi.fn()} company={mockCompany} targetRole="Engineer" />
    );
    expect(screen.getByText('Setup Job Alerts')).toBeInTheDocument();
  });

  it('shows company name in header', () => {
    render(
      <JobAlertsModal isOpen={true} onClose={vi.fn()} company={mockCompany} targetRole="Engineer" />
    );
    expect(screen.getByText(/Stripe/)).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <JobAlertsModal isOpen={true} onClose={onClose} company={mockCompany} targetRole="Engineer" />
    );
    fireEvent.click(screen.getByRole('button', { name: /close modal/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(
      <JobAlertsModal isOpen={true} onClose={onClose} company={mockCompany} targetRole="Engineer" />
    );
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows loading spinner initially', () => {
    render(
      <JobAlertsModal isOpen={true} onClose={vi.fn()} company={mockCompany} targetRole="Engineer" />
    );
    expect(document.querySelector('.animate-spin')).not.toBeNull();
  });

  it('shows alert queries after loading', async () => {
    render(
      <JobAlertsModal isOpen={true} onClose={vi.fn()} company={mockCompany} targetRole="Engineer" />
    );
    await waitFor(() => {
      expect(screen.queryByText(/animate-spin/)).toBeNull();
      expect(screen.getByText('Google Alert')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows instructions for setting up Google Alerts', () => {
    render(
      <JobAlertsModal isOpen={true} onClose={vi.fn()} company={mockCompany} targetRole="Engineer" />
    );
    expect(screen.getByText(/how to setup google alerts/i)).toBeInTheDocument();
  });

  it('has link to Open Google Alerts', () => {
    render(
      <JobAlertsModal isOpen={true} onClose={vi.fn()} company={mockCompany} targetRole="Engineer" />
    );
    const link = screen.getByText('Open Google Alerts').closest('a');
    expect(link).toHaveAttribute('href', 'https://www.google.com/alerts');
  });

  it('has link to LinkedIn job search', () => {
    render(
      <JobAlertsModal isOpen={true} onClose={vi.fn()} company={mockCompany} targetRole="Engineer" />
    );
    const link = screen.getByText('Setup LinkedIn Job Alert').closest('a');
    expect(link).toHaveAttribute('href', 'https://www.linkedin.com/jobs/search');
  });

  it('copies query to clipboard when Copy button clicked', async () => {
    render(
      <JobAlertsModal isOpen={true} onClose={vi.fn()} company={mockCompany} targetRole="Engineer" />
    );
    await waitFor(() => screen.getByText('Google Alert'), { timeout: 3000 });
    fireEvent.click(screen.getByText('Copy').closest('button')!);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('shows Copied! after clipboard write', async () => {
    render(
      <JobAlertsModal isOpen={true} onClose={vi.fn()} company={mockCompany} targetRole="Engineer" />
    );
    await waitFor(() => screen.getByText('Google Alert'), { timeout: 3000 });
    await act(async () => {
      fireEvent.click(screen.getByText('Copy').closest('button')!);
    });
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('falls back gracefully when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    render(
      <JobAlertsModal isOpen={true} onClose={vi.fn()} company={mockCompany} targetRole="Engineer" />
    );
    // Should not throw and should eventually stop loading
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).toBeNull();
    }, { timeout: 3000 });
  });
});
