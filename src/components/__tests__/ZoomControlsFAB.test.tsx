import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ZoomControlsFAB } from '../ZoomControlsFAB';

describe('ZoomControlsFAB', () => {
  const defaultProps = {
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onFitToView: vi.fn(),
  };

  it('renders the fit to view button', () => {
    render(<ZoomControlsFAB {...defaultProps} />);
    expect(screen.getByRole('button', { name: /fit to view/i })).toBeInTheDocument();
  });

  it('calls onFitToView when main button is clicked', () => {
    const onFitToView = vi.fn();
    render(<ZoomControlsFAB {...defaultProps} onFitToView={onFitToView} />);
    fireEvent.click(screen.getByRole('button', { name: /fit to view/i }));
    expect(onFitToView).toHaveBeenCalledTimes(1);
  });

  it('does not show zoom menu initially', () => {
    render(<ZoomControlsFAB {...defaultProps} />);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('shows zoom menu on mouse enter', () => {
    render(<ZoomControlsFAB {...defaultProps} />);
    const group = screen.getByRole('group', { name: /zoom controls/i });
    act(() => {
      fireEvent.mouseEnter(group);
    });
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('shows zoom in and zoom out menuitem buttons on hover', () => {
    render(<ZoomControlsFAB {...defaultProps} />);
    const group = screen.getByRole('group', { name: /zoom controls/i });
    act(() => {
      fireEvent.mouseEnter(group);
    });
    expect(screen.getByRole('menuitem', { name: /zoom in/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /zoom out/i })).toBeInTheDocument();
  });

  it('calls onZoomIn when zoom in button is clicked', () => {
    const onZoomIn = vi.fn();
    render(<ZoomControlsFAB {...defaultProps} onZoomIn={onZoomIn} />);
    const group = screen.getByRole('group', { name: /zoom controls/i });
    act(() => {
      fireEvent.mouseEnter(group);
    });
    fireEvent.click(screen.getByRole('menuitem', { name: /zoom in/i }));
    expect(onZoomIn).toHaveBeenCalledTimes(1);
  });

  it('calls onZoomOut when zoom out button is clicked', () => {
    const onZoomOut = vi.fn();
    render(<ZoomControlsFAB {...defaultProps} onZoomOut={onZoomOut} />);
    const group = screen.getByRole('group', { name: /zoom controls/i });
    act(() => {
      fireEvent.mouseEnter(group);
    });
    fireEvent.click(screen.getByRole('menuitem', { name: /zoom out/i }));
    expect(onZoomOut).toHaveBeenCalledTimes(1);
  });

  it('does not show zoom menu in mobile mode', () => {
    render(<ZoomControlsFAB {...defaultProps} isMobile={true} />);
    const group = screen.getByRole('group', { name: /zoom controls/i });
    act(() => {
      fireEvent.mouseEnter(group);
    });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('has accessible group label', () => {
    render(<ZoomControlsFAB {...defaultProps} />);
    expect(screen.getByRole('group', { name: /zoom controls/i })).toBeInTheDocument();
  });
});
