import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteUserConfirmationModal } from '../DeleteUserConfirmationModal';

describe('DeleteUserConfirmationModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    userEmail: 'test@example.com',
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <DeleteUserConfirmationModal {...defaultProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal when isOpen is true', () => {
    render(<DeleteUserConfirmationModal {...defaultProps} />);
    expect(screen.getByText('Delete User Account')).toBeInTheDocument();
  });

  it('displays the user email', () => {
    render(<DeleteUserConfirmationModal {...defaultProps} userEmail="user@test.com" />);
    expect(screen.getByText('user@test.com')).toBeInTheDocument();
  });

  it('shows warning about irreversible action', () => {
    render(<DeleteUserConfirmationModal {...defaultProps} />);
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it('shows consequences list', () => {
    render(<DeleteUserConfirmationModal {...defaultProps} />);
    expect(screen.getByText(/authentication credentials/i)).toBeInTheDocument();
    expect(screen.getByText(/watchlist and preferences/i)).toBeInTheDocument();
  });

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn();
    render(<DeleteUserConfirmationModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<DeleteUserConfirmationModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when Delete User button is clicked', () => {
    const onConfirm = vi.fn();
    render(<DeleteUserConfirmationModal {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('Delete User'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows Deleting... when isDeleting is true', () => {
    render(<DeleteUserConfirmationModal {...defaultProps} isDeleting={true} />);
    expect(screen.getByText('Deleting...')).toBeInTheDocument();
    expect(screen.queryByText('Delete User')).toBeNull();
  });

  it('disables buttons when isDeleting is true', () => {
    render(<DeleteUserConfirmationModal {...defaultProps} isDeleting={true} />);
    const cancelButton = screen.getByText('Cancel');
    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(cancelButton).toBeDisabled();
    expect(closeButton).toBeDisabled();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <DeleteUserConfirmationModal {...defaultProps} onClose={onClose} />
    );
    const backdrop = container.querySelector('.absolute.inset-0.bg-black\\/50');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
