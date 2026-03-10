import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SettingsFAB } from '../SettingsFAB';

describe('SettingsFAB', () => {
  const defaultProps = {
    onSettings: vi.fn(),
    onExport: vi.fn(),
  };

  it('renders the settings button', () => {
    render(<SettingsFAB {...defaultProps} />);
    expect(screen.getByRole('button', { name: /^settings$/i })).toBeInTheDocument();
  });

  it('calls onSettings when main button is clicked', () => {
    const onSettings = vi.fn();
    render(<SettingsFAB {...defaultProps} onSettings={onSettings} />);
    fireEvent.click(screen.getByRole('button', { name: /^settings$/i }));
    expect(onSettings).toHaveBeenCalledTimes(1);
  });

  it('does not show export menu initially', () => {
    render(<SettingsFAB {...defaultProps} />);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('shows export menu on mouse enter', () => {
    render(<SettingsFAB {...defaultProps} />);
    const group = screen.getByRole('group', { name: /settings menu/i });
    act(() => {
      fireEvent.mouseEnter(group);
    });
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('calls onExport when export menuitem is clicked', () => {
    const onExport = vi.fn();
    render(<SettingsFAB {...defaultProps} onExport={onExport} />);
    const group = screen.getByRole('group', { name: /settings menu/i });
    act(() => {
      fireEvent.mouseEnter(group);
    });
    fireEvent.click(screen.getByRole('menuitem', { name: /export companies/i }));
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('hides export menu after clicking it', () => {
    render(<SettingsFAB {...defaultProps} />);
    const group = screen.getByRole('group', { name: /settings menu/i });
    act(() => {
      fireEvent.mouseEnter(group);
    });
    fireEvent.click(screen.getByRole('menuitem', { name: /export companies/i }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes menu on Escape key when open', () => {
    render(<SettingsFAB {...defaultProps} />);
    const group = screen.getByRole('group', { name: /settings menu/i });
    act(() => {
      fireEvent.mouseEnter(group);
    });
    expect(screen.getByRole('menu')).toBeInTheDocument();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes menu when clicking outside', () => {
    render(<SettingsFAB {...defaultProps} />);
    const group = screen.getByRole('group', { name: /settings menu/i });
    act(() => {
      fireEvent.mouseEnter(group);
    });
    expect(screen.getByRole('menu')).toBeInTheDocument();
    act(() => {
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('has accessible group label', () => {
    render(<SettingsFAB {...defaultProps} />);
    expect(screen.getByRole('group', { name: /settings menu/i })).toBeInTheDocument();
  });
});
