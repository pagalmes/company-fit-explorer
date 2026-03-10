import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SpeedDialFAB } from '../SpeedDialFAB';

// Ensure window.innerWidth is desktop by default (> 768px)
const defaultProps = {
  onAddCompany: vi.fn(),
  onPasteList: vi.fn(),
  onScreenshotImport: vi.fn(),
};

describe('SpeedDialFAB', { timeout: 5000 }, () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main Add Company button on desktop', () => {
    render(<SpeedDialFAB {...defaultProps} />);
    expect(screen.getByRole('button', { name: /add company/i })).toBeInTheDocument();
  });

  it('does not show action menu initially', () => {
    render(<SpeedDialFAB {...defaultProps} />);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('shows action menu on mouse enter (desktop)', () => {
    render(<SpeedDialFAB {...defaultProps} />);
    const group = screen.getByRole('group', { name: /quick actions menu/i });
    act(() => { fireEvent.mouseEnter(group); });
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('shows Paste Company List and Import from Screenshot on hover', () => {
    render(<SpeedDialFAB {...defaultProps} />);
    const group = screen.getByRole('group', { name: /quick actions menu/i });
    act(() => { fireEvent.mouseEnter(group); });
    expect(screen.getByRole('menuitem', { name: /paste company list/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /import from screenshot/i })).toBeInTheDocument();
  });

  it('calls onAddCompany when main button clicked on desktop', () => {
    const onAddCompany = vi.fn();
    render(<SpeedDialFAB {...defaultProps} onAddCompany={onAddCompany} />);
    fireEvent.click(screen.getByRole('button', { name: /add company/i }));
    expect(onAddCompany).toHaveBeenCalledTimes(1);
  });

  it('calls onPasteList when Paste action clicked', () => {
    const onPasteList = vi.fn();
    render(<SpeedDialFAB {...defaultProps} onPasteList={onPasteList} />);
    const group = screen.getByRole('group', { name: /quick actions menu/i });
    act(() => { fireEvent.mouseEnter(group); });
    fireEvent.click(screen.getByRole('menuitem', { name: /paste company list/i }));
    expect(onPasteList).toHaveBeenCalledTimes(1);
  });

  it('calls onScreenshotImport when Screenshot action clicked', () => {
    const onScreenshotImport = vi.fn();
    render(<SpeedDialFAB {...defaultProps} onScreenshotImport={onScreenshotImport} />);
    const group = screen.getByRole('group', { name: /quick actions menu/i });
    act(() => { fireEvent.mouseEnter(group); });
    fireEvent.click(screen.getByRole('menuitem', { name: /import from screenshot/i }));
    expect(onScreenshotImport).toHaveBeenCalledTimes(1);
  });

  it('closes menu after action clicked', () => {
    render(<SpeedDialFAB {...defaultProps} />);
    const group = screen.getByRole('group', { name: /quick actions menu/i });
    act(() => { fireEvent.mouseEnter(group); });
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: /paste company list/i }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes menu on Escape key', () => {
    render(<SpeedDialFAB {...defaultProps} />);
    const group = screen.getByRole('group', { name: /quick actions menu/i });
    act(() => { fireEvent.mouseEnter(group); });
    expect(screen.getByRole('menu')).toBeInTheDocument();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('toggles menu on main button click in mobile mode', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
    render(<SpeedDialFAB {...defaultProps} />);
    // Trigger resize to update mobile state
    act(() => { fireEvent(window, new Event('resize')); });
    const mainBtn = screen.getByRole('button', { name: /quick actions menu/i });
    act(() => { fireEvent.click(mainBtn); });
    expect(screen.getByRole('menu')).toBeInTheDocument();
    act(() => { fireEvent.click(mainBtn); });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('has accessible group label', () => {
    render(<SpeedDialFAB {...defaultProps} />);
    expect(screen.getByRole('group', { name: /quick actions menu/i })).toBeInTheDocument();
  });
});
