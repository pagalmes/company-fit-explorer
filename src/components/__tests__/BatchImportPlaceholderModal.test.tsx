import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BatchImportPlaceholderModal } from '../BatchImportPlaceholderModal';

describe('BatchImportPlaceholderModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <BatchImportPlaceholderModal isOpen={false} onClose={vi.fn()} type="paste" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders paste modal content when type is paste', () => {
    render(<BatchImportPlaceholderModal isOpen={true} onClose={vi.fn()} type="paste" />);
    expect(screen.getByText('Paste Company List')).toBeInTheDocument();
    expect(screen.getByText(/pasting a list/i)).toBeInTheDocument();
  });

  it('renders screenshot modal content when type is screenshot', () => {
    render(<BatchImportPlaceholderModal isOpen={true} onClose={vi.fn()} type="screenshot" />);
    expect(screen.getByText('Import from Screenshot')).toBeInTheDocument();
    expect(screen.getByText(/upload a screenshot/i)).toBeInTheDocument();
  });

  it('shows coming soon badge', () => {
    render(<BatchImportPlaceholderModal isOpen={true} onClose={vi.fn()} type="paste" />);
    expect(screen.getByText('Coming Soon')).toBeInTheDocument();
  });

  it('calls onClose when Got it button is clicked', () => {
    const onClose = vi.fn();
    render(<BatchImportPlaceholderModal isOpen={true} onClose={onClose} type="paste" />);
    fireEvent.click(screen.getByText('Got it'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <BatchImportPlaceholderModal isOpen={true} onClose={onClose} type="paste" />
    );
    const backdrop = container.querySelector('.absolute.inset-0.bg-black\\/50');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders dialog with correct accessibility attributes', () => {
    render(<BatchImportPlaceholderModal isOpen={true} onClose={vi.fn()} type="paste" />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});
