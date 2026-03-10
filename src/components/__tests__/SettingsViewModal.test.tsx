import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const { mockGetSettings } = vi.hoisted(() => ({
  mockGetSettings: vi.fn().mockReturnValue({
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: 'test-key',
  }),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

vi.mock('../../utils/llm/service', () => ({
  llmService: {
    getSettings: mockGetSettings,
  },
}));

vi.mock('../../utils/logoProvider', () => ({
  getCompanyLogo: vi.fn().mockReturnValue('https://logo.example.com/anthropic.png'),
}));

import SettingsViewModal from '../SettingsViewModal';

describe('SettingsViewModal', { timeout: 5000 }, () => {
  beforeEach(() => {
    mockGetSettings.mockReturnValue({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      apiKey: 'test-key',
    });
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <SettingsViewModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal when isOpen is true', () => {
    render(<SettingsViewModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Current Settings')).toBeInTheDocument();
  });

  it('shows AI Provider section', () => {
    render(<SettingsViewModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('AI Provider')).toBeInTheDocument();
  });

  it('calls onClose when Close button clicked', () => {
    const onClose = vi.fn();
    render(<SettingsViewModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<SettingsViewModal isOpen={true} onClose={onClose} />);
    const backdrop = container.querySelector('.fixed.inset-0.bg-black');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(<SettingsViewModal isOpen={true} onClose={onClose} />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows keyboard shortcuts button when onShowKeyboardShortcuts provided', () => {
    render(
      <SettingsViewModal
        isOpen={true}
        onClose={vi.fn()}
        onShowKeyboardShortcuts={vi.fn()}
      />
    );
    expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument();
  });

  it('does not show keyboard shortcuts button when prop not provided', () => {
    render(<SettingsViewModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.queryByText(/keyboard shortcuts/i)).toBeNull();
  });

  it('calls onClose and onShowKeyboardShortcuts when shortcuts button clicked', () => {
    const onClose = vi.fn();
    const onShowKeyboardShortcuts = vi.fn();
    render(
      <SettingsViewModal
        isOpen={true}
        onClose={onClose}
        onShowKeyboardShortcuts={onShowKeyboardShortcuts}
      />
    );
    fireEvent.click(screen.getByText(/keyboard shortcuts/i).closest('button')!);
    expect(onClose).toHaveBeenCalled();
    expect(onShowKeyboardShortcuts).toHaveBeenCalled();
  });

  it('shows no provider message when provider is none', () => {
    mockGetSettings.mockReturnValue({ provider: 'none', model: '', apiKey: '' });
    render(<SettingsViewModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/no ai provider configured/i)).toBeInTheDocument();
  });
});
