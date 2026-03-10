import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen, act } from '@testing-library/react';
import KeyboardShortcutsModal from '../KeyboardShortcutsModal';

describe('KeyboardShortcutsModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <KeyboardShortcutsModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal when isOpen is true', () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('renders all shortcut categories', () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('List Navigation')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  it('renders keyboard keys as kbd elements', () => {
    const { container } = render(
      <KeyboardShortcutsModal isOpen={true} onClose={vi.fn()} />
    );
    const kbds = container.querySelectorAll('kbd');
    expect(kbds.length).toBeGreaterThan(0);
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <KeyboardShortcutsModal isOpen={true} onClose={onClose} />
    );
    // The backdrop is the first fixed div after the outer wrapper
    const backdrop = container.querySelector('.fixed.inset-0.bg-black');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsModal isOpen={true} onClose={onClose} />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose on Escape when isOpen is false', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsModal isOpen={false} onClose={onClose} />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('cleans up Escape listener on unmount', () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <KeyboardShortcutsModal isOpen={true} onClose={onClose} />
    );
    unmount();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows Esc instruction in footer', () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/press/i)).toBeInTheDocument();
    expect(screen.getByText(/to close/i)).toBeInTheDocument();
  });
});
