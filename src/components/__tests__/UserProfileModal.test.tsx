import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import UserProfileModal from '../UserProfileModal';
import type { UserCMF } from '../../types';

const mockCMF: UserCMF = {
  name: 'Alex Rivera',
  targetRole: 'Senior Software Engineer',
  targetCompanies: 'AI-focused startups',
  mustHaves: ['Remote work', 'Equity'],
  wantToHave: ['Flexible hours', 'Learning budget'],
  experience: ['5 years TypeScript', 'React expertise'],
};

describe('UserProfileModal', { timeout: 5000 }, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('closes after animation timeout', () => {
    const onClose = vi.fn();
    render(<UserProfileModal userCMF={mockCMF} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /back to cosmos/i }));
    vi.advanceTimersByTime(300);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders user name', () => {
    render(<UserProfileModal userCMF={mockCMF} onClose={vi.fn()} />);
    expect(screen.getByText('Alex Rivera')).toBeInTheDocument();
  });

  it('renders user initials avatar', () => {
    render(<UserProfileModal userCMF={mockCMF} onClose={vi.fn()} />);
    expect(screen.getByText('AR')).toBeInTheDocument();
  });

  it('renders target role', () => {
    render(<UserProfileModal userCMF={mockCMF} onClose={vi.fn()} />);
    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
  });

  it('renders target companies section', () => {
    render(<UserProfileModal userCMF={mockCMF} onClose={vi.fn()} />);
    expect(screen.getByText('AI-focused startups')).toBeInTheDocument();
  });

  it('renders must-haves list', () => {
    render(<UserProfileModal userCMF={mockCMF} onClose={vi.fn()} />);
    expect(screen.getByText('Remote work')).toBeInTheDocument();
    expect(screen.getByText('Equity')).toBeInTheDocument();
  });

  it('renders want-to-haves list', () => {
    render(<UserProfileModal userCMF={mockCMF} onClose={vi.fn()} />);
    expect(screen.getByText('Flexible hours')).toBeInTheDocument();
    expect(screen.getByText('Learning budget')).toBeInTheDocument();
  });

  it('renders experience list', () => {
    render(<UserProfileModal userCMF={mockCMF} onClose={vi.fn()} />);
    expect(screen.getByText('5 years TypeScript')).toBeInTheDocument();
    expect(screen.getByText('React expertise')).toBeInTheDocument();
  });

  it('does not render target companies section when empty', () => {
    const cmfNoCompanies = { ...mockCMF, targetCompanies: undefined };
    render(<UserProfileModal userCMF={cmfNoCompanies} onClose={vi.fn()} />);
    expect(screen.queryByText('Target Companies')).toBeNull();
  });

  it('does not render must-haves section when empty array', () => {
    const cmfNoMust = { ...mockCMF, mustHaves: [] };
    render(<UserProfileModal userCMF={cmfNoMust} onClose={vi.fn()} />);
    expect(screen.queryByText('Must-Haves')).toBeNull();
  });

  it('does not render want-to-haves section when empty array', () => {
    const cmfNoWant = { ...mockCMF, wantToHave: [] };
    render(<UserProfileModal userCMF={cmfNoWant} onClose={vi.fn()} />);
    expect(screen.queryByText('Want-to-Haves')).toBeNull();
  });

  it('does not render experience section when empty array', () => {
    const cmfNoExp = { ...mockCMF, experience: [] };
    render(<UserProfileModal userCMF={cmfNoExp} onClose={vi.fn()} />);
    expect(screen.queryByText('Experience')).toBeNull();
  });

  it('back button starts close animation', () => {
    const { container } = render(<UserProfileModal userCMF={mockCMF} onClose={vi.fn()} />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).not.toMatch(/animate-slide-out/);
    fireEvent.click(screen.getByRole('button', { name: /back to cosmos/i }));
    expect(root.className).toMatch(/animate-slide-out/);
  });
});
