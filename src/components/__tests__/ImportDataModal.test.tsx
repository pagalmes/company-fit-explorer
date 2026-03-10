import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ImportDataModal from '../ImportDataModal';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  userId: 'user-123',
  userEmail: 'test@example.com',
  onImportSuccess: vi.fn(),
};

describe('ImportDataModal', { timeout: 5000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<ImportDataModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal when isOpen is true', () => {
    render(<ImportDataModal {...defaultProps} />);
    expect(screen.getByText('Import Companies Data')).toBeInTheDocument();
  });

  it('shows the user email in header', () => {
    render(<ImportDataModal {...defaultProps} userEmail="admin@test.com" />);
    expect(screen.getByText('for admin@test.com')).toBeInTheDocument();
  });

  it('calls onClose when X button clicked', () => {
    const onClose = vi.fn();
    render(<ImportDataModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: '' })); // X icon button
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Cancel button clicked', () => {
    const onClose = vi.fn();
    render(<ImportDataModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows file input accepting json/ts/js', () => {
    render(<ImportDataModal {...defaultProps} />);
    const input = screen.getByRole('button', { name: /import data/i });
    expect(input).toBeInTheDocument();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    expect(fileInput.accept).toMatch(/\.json/);
  });

  it('shows error when submitting without file', async () => {
    render(<ImportDataModal {...defaultProps} />);
    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /import data/i }).closest('form')!);
    });
    expect(screen.getByText('Please select a file')).toBeInTheDocument();
  });

  it('Import Data button is disabled when no file selected', () => {
    render(<ImportDataModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /import data/i })).toBeDisabled();
  });

  it('calls onClose on Escape key when open', () => {
    const onClose = vi.fn();
    render(<ImportDataModal {...defaultProps} onClose={onClose} />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows error when JSON parsing fails', async () => {
    render(<ImportDataModal {...defaultProps} />);

    // Simulate file selection with invalid JSON content
    const file = new File(['not-valid-json'], 'data.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: vi.fn().mockResolvedValue('not-valid-json') });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    fireEvent.change(fileInput);

    await act(async () => {
      fireEvent.submit(fileInput.closest('form')!);
    });

    await waitFor(() => {
      expect(screen.getByText(/invalid json format/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('calls onImportSuccess and onClose on successful import', async () => {
    const onImportSuccess = vi.fn();
    const onClose = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true }),
    }));

    render(<ImportDataModal {...defaultProps} onImportSuccess={onImportSuccess} onClose={onClose} />);

    const file = new File(['{"id":"x"}'], 'data.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: vi.fn().mockResolvedValue('{"id":"x"}') });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    fireEvent.change(fileInput);

    await act(async () => {
      fireEvent.submit(fileInput.closest('form')!);
    });

    await waitFor(() => {
      expect(onImportSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('shows server error message on failed import', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 'Permission denied' }),
    }));

    render(<ImportDataModal {...defaultProps} />);

    const file = new File(['{"id":"x"}'], 'data.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: vi.fn().mockResolvedValue('{"id":"x"}') });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    fireEvent.change(fileInput);

    await act(async () => {
      fireEvent.submit(fileInput.closest('form')!);
    });

    await waitFor(() => {
      expect(screen.getByText('Permission denied')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
