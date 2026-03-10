import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompanySelectionList, DetectedCompany } from '../CompanySelectionList';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

const makeCompany = (name: string, selected = false, isDuplicate = false): DetectedCompany => ({
  name,
  preview: { logo: `https://logo.example.com/${name}.png`, domain: `${name.toLowerCase()}.com` },
  selected,
  isDuplicate,
});

describe('CompanySelectionList', () => {
  it('renders the selection count', () => {
    const companies = [makeCompany('Stripe', true), makeCompany('Plaid', false)];
    render(
      <CompanySelectionList
        companies={companies}
        onToggleSelection={vi.fn()}
        onToggleSelectAll={vi.fn()}
      />
    );
    expect(screen.getByText(/1 of 2 companies selected/i)).toBeInTheDocument();
  });

  it('renders company names', () => {
    const companies = [makeCompany('Stripe'), makeCompany('Plaid')];
    render(
      <CompanySelectionList
        companies={companies}
        onToggleSelection={vi.fn()}
        onToggleSelectAll={vi.fn()}
      />
    );
    expect(screen.getByText('Stripe')).toBeInTheDocument();
    expect(screen.getByText('Plaid')).toBeInTheDocument();
  });

  it('renders company domains', () => {
    const companies = [makeCompany('Stripe')];
    render(
      <CompanySelectionList
        companies={companies}
        onToggleSelection={vi.fn()}
        onToggleSelectAll={vi.fn()}
      />
    );
    expect(screen.getByText('stripe.com')).toBeInTheDocument();
  });

  it('shows Select All button when not all selected', () => {
    const companies = [makeCompany('Stripe', false)];
    render(
      <CompanySelectionList
        companies={companies}
        onToggleSelection={vi.fn()}
        onToggleSelectAll={vi.fn()}
      />
    );
    expect(screen.getByText('Select All')).toBeInTheDocument();
  });

  it('shows Deselect All button when all selected', () => {
    const companies = [makeCompany('Stripe', true)];
    render(
      <CompanySelectionList
        companies={companies}
        onToggleSelection={vi.fn()}
        onToggleSelectAll={vi.fn()}
      />
    );
    expect(screen.getByText('Deselect All')).toBeInTheDocument();
  });

  it('calls onToggleSelectAll when Select All is clicked', () => {
    const onToggleSelectAll = vi.fn();
    const companies = [makeCompany('Stripe', false)];
    render(
      <CompanySelectionList
        companies={companies}
        onToggleSelection={vi.fn()}
        onToggleSelectAll={onToggleSelectAll}
      />
    );
    fireEvent.click(screen.getByText('Select All'));
    expect(onToggleSelectAll).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleSelection with correct index when checkbox is clicked', () => {
    const onToggleSelection = vi.fn();
    const companies = [makeCompany('Stripe', false), makeCompany('Plaid', false)];
    render(
      <CompanySelectionList
        companies={companies}
        onToggleSelection={onToggleSelection}
        onToggleSelectAll={vi.fn()}
      />
    );
    // selectButtons[0] = "Select All", [1] = first company (index 0), [2] = second company (index 1)
    const selectButtons = screen.getAllByRole('button', { name: /select/i });
    fireEvent.click(selectButtons[2]);
    expect(onToggleSelection).toHaveBeenCalledWith(1);
  });

  it('shows Already in graph badge for duplicates', () => {
    const companies = [makeCompany('Stripe', false, true)];
    render(
      <CompanySelectionList
        companies={companies}
        onToggleSelection={vi.fn()}
        onToggleSelectAll={vi.fn()}
      />
    );
    expect(screen.getAllByText('Already in graph').length).toBeGreaterThan(0);
  });

  it('does not call onToggleSelection for duplicate companies', () => {
    const onToggleSelection = vi.fn();
    const companies = [makeCompany('Stripe', false, true)];
    render(
      <CompanySelectionList
        companies={companies}
        onToggleSelection={onToggleSelection}
        onToggleSelectAll={vi.fn()}
      />
    );
    const alreadyInGraphBtn = screen.getByRole('button', { name: /already in graph/i });
    fireEvent.click(alreadyInGraphBtn);
    expect(onToggleSelection).not.toHaveBeenCalled();
  });

  it('shows no companies message for empty list', () => {
    render(
      <CompanySelectionList
        companies={[]}
        onToggleSelection={vi.fn()}
        onToggleSelectAll={vi.fn()}
      />
    );
    expect(screen.getByText('No companies detected')).toBeInTheDocument();
  });

  it('renders company logos', () => {
    const companies = [makeCompany('Stripe')];
    render(
      <CompanySelectionList
        companies={companies}
        onToggleSelection={vi.fn()}
        onToggleSelectAll={vi.fn()}
      />
    );
    const img = screen.getByAltText('Stripe logo');
    expect(img).toBeInTheDocument();
  });
});
