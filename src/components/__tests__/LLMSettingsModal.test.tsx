import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const { mockGetSettings, mockUpdateSettings, mockClearSettings } = vi.hoisted(() => ({
  mockGetSettings: vi.fn().mockReturnValue({
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: '',
  }),
  mockUpdateSettings: vi.fn().mockResolvedValue(true),
  mockClearSettings: vi.fn(),
}));

vi.mock('../../utils/llm/service', () => ({
  llmService: {
    getSettings: mockGetSettings,
    updateSettings: mockUpdateSettings,
    clearSettings: mockClearSettings,
  },
}));

import LLMSettingsModal from '../LLMSettingsModal';

describe('LLMSettingsModal', { timeout: 5000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettings.mockReturnValue({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      apiKey: '',
    });
    mockUpdateSettings.mockResolvedValue(true);
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<LLMSettingsModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal title when isOpen is true', () => {
    render(<LLMSettingsModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('LLM Settings')).toBeInTheDocument();
  });

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn();
    render(<LLMSettingsModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(<LLMSettingsModal isOpen={true} onClose={onClose} />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<LLMSettingsModal isOpen={true} onClose={onClose} />);
    const backdrop = container.querySelector('.fixed.inset-0.bg-black');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows AI Provider label', () => {
    render(<LLMSettingsModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('AI Provider')).toBeInTheDocument();
  });

  it('shows Test Backend Connection button when provider selected', () => {
    render(<LLMSettingsModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Test Backend Connection')).toBeInTheDocument();
  });

  it('saves settings and calls onSettingsUpdated on success', async () => {
    const onSettingsUpdated = vi.fn();
    const onClose = vi.fn();
    render(<LLMSettingsModal isOpen={true} onClose={onClose} onSettingsUpdated={onSettingsUpdated} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Save Settings'));
    });
    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalled();
      expect(onSettingsUpdated).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('shows error message when save fails', async () => {
    mockUpdateSettings.mockResolvedValue(false);
    render(<LLMSettingsModal isOpen={true} onClose={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Save Settings'));
    });
    await waitFor(() => {
      expect(screen.getByText(/failed to save settings/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('clears settings and closes when provider is none', async () => {
    mockGetSettings.mockReturnValue({ provider: 'none', model: '', apiKey: '' });
    const onClose = vi.fn();
    render(<LLMSettingsModal isOpen={true} onClose={onClose} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Save Settings'));
    });
    expect(mockClearSettings).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows Connected after successful validation', async () => {
    render(<LLMSettingsModal isOpen={true} onClose={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Test Backend Connection'));
    });
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows error when validation fails', async () => {
    mockUpdateSettings.mockResolvedValue(false);
    render(<LLMSettingsModal isOpen={true} onClose={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Test Backend Connection'));
    });
    await waitFor(() => {
      expect(screen.getByText(/backend connection failed/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows Clear All Settings button', () => {
    render(<LLMSettingsModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Clear All Settings')).toBeInTheDocument();
  });

  it('calls clearSettings when Clear All Settings clicked', () => {
    render(<LLMSettingsModal isOpen={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Clear All Settings'));
    expect(mockClearSettings).toHaveBeenCalled();
  });

  it('shows None provider option', () => {
    render(<LLMSettingsModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('shows provider production setup notice', () => {
    render(<LLMSettingsModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Production Setup')).toBeInTheDocument();
  });
});
