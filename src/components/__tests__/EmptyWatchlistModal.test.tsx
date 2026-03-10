import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import EmptyWatchlistModal from '../EmptyWatchlistModal';

describe('EmptyWatchlistModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <EmptyWatchlistModal isOpen={false} onGoToExplore={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal content when isOpen is true', () => {
    render(<EmptyWatchlistModal isOpen={true} onGoToExplore={vi.fn()} />);
    expect(screen.getByText('Your watchlist is empty')).toBeInTheDocument();
  });

  it('renders the explore button', () => {
    render(<EmptyWatchlistModal isOpen={true} onGoToExplore={vi.fn()} />);
    expect(screen.getByRole('button', { name: /go to explore/i })).toBeInTheDocument();
  });

  it('calls onGoToExplore when button is clicked', () => {
    const onGoToExplore = vi.fn();
    render(<EmptyWatchlistModal isOpen={true} onGoToExplore={onGoToExplore} />);
    fireEvent.click(screen.getByRole('button', { name: /go to explore/i }));
    expect(onGoToExplore).toHaveBeenCalledTimes(1);
  });

  it('shows descriptive text about building watchlist', () => {
    render(<EmptyWatchlistModal isOpen={true} onGoToExplore={vi.fn()} />);
    expect(screen.getByText(/start exploring/i)).toBeInTheDocument();
  });
});
