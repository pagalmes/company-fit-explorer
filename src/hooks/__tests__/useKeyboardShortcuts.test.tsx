import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts, isKeyCombination } from '../useKeyboardShortcuts';

const fireKeyDown = (key: string, options: Partial<KeyboardEventInit> = {}) => {
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...options }));
  });
};

describe('useKeyboardShortcuts', () => {
  it('calls action when matching key is pressed', () => {
    const action = vi.fn();
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'a', description: 'test', action }],
    }));
    fireKeyDown('a');
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('does not call action when enabled is false', () => {
    const action = vi.fn();
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'a', description: 'test', action }],
      enabled: false,
    }));
    fireKeyDown('a');
    expect(action).not.toHaveBeenCalled();
  });

  it('is case-insensitive for key matching', () => {
    const action = vi.fn();
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'A', description: 'test', action }],
    }));
    fireKeyDown('a');
    expect(action).toHaveBeenCalled();
  });

  it('does not call action when wrong key pressed', () => {
    const action = vi.fn();
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'a', description: 'test', action }],
    }));
    fireKeyDown('b');
    expect(action).not.toHaveBeenCalled();
  });

  it('only calls first matching shortcut (break after first match)', () => {
    const action1 = vi.fn();
    const action2 = vi.fn();
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [
        { key: 'a', description: 'first', action: action1 },
        { key: 'a', description: 'second', action: action2 },
      ],
    }));
    fireKeyDown('a');
    expect(action1).toHaveBeenCalledTimes(1);
    expect(action2).not.toHaveBeenCalled();
  });

  it('skips action when input is focused (requireNoInput default)', () => {
    const action = vi.fn();
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'a', description: 'test', action }],
    }));
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    });
    expect(action).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('fires action on input when requireNoInput is false', () => {
    const action = vi.fn();
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'a', description: 'test', action, requireNoInput: false }],
    }));
    const input = document.createElement('input');
    document.body.appendChild(input);
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    });
    expect(action).toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('requires ctrl modifier when specified', () => {
    const action = vi.fn();
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'k', description: 'test', action, modifiers: { ctrl: true } }],
    }));
    fireKeyDown('k'); // no ctrl → no action
    expect(action).not.toHaveBeenCalled();
    fireKeyDown('k', { ctrlKey: true }); // with ctrl → fires
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('requires shift modifier when specified', () => {
    const action = vi.fn();
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'k', description: 'test', action, modifiers: { shift: true } }],
    }));
    fireKeyDown('k', { shiftKey: true });
    expect(action).toHaveBeenCalled();
  });

  it('skips when ctrl is pressed but not required (no modifier shortcuts)', () => {
    const action = vi.fn();
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'a', description: 'test', action }],
    }));
    fireKeyDown('a', { ctrlKey: true }); // ctrl pressed but not required → skip
    expect(action).not.toHaveBeenCalled();
  });

  it('respects custom condition — skips when condition returns false', () => {
    const action = vi.fn();
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'a', description: 'test', action, condition: () => false }],
    }));
    fireKeyDown('a');
    expect(action).not.toHaveBeenCalled();
  });

  it('fires when condition returns true', () => {
    const action = vi.fn();
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'a', description: 'test', action, condition: () => true }],
    }));
    fireKeyDown('a');
    expect(action).toHaveBeenCalled();
  });

  it('cleans up event listener on unmount', () => {
    const action = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'a', description: 'test', action }],
    }));
    unmount();
    fireKeyDown('a');
    expect(action).not.toHaveBeenCalled();
  });

  it('updates shortcuts when they change (via ref)', () => {
    const action1 = vi.fn();
    const action2 = vi.fn();
    let shortcuts = [{ key: 'a', description: 'first', action: action1 }];

    const { rerender } = renderHook(() => useKeyboardShortcuts({ shortcuts }));

    // Change shortcuts
    shortcuts = [{ key: 'a', description: 'second', action: action2 }];
    rerender();

    fireKeyDown('a');
    expect(action2).toHaveBeenCalled();
    expect(action1).not.toHaveBeenCalled();
  });

  it('skips action when target is textarea', () => {
    const action = vi.fn();
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'a', description: 'test', action }],
    }));
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    act(() => {
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    });
    expect(action).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
  });
});

describe('isKeyCombination', () => {
  const makeEvent = (key: string, opts: Partial<KeyboardEventInit> = {}) =>
    new KeyboardEvent('keydown', { key, ...opts });

  it('returns true for matching key', () => {
    expect(isKeyCombination(makeEvent('a'), 'a')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isKeyCombination(makeEvent('A'), 'a')).toBe(true);
    expect(isKeyCombination(makeEvent('a'), 'A')).toBe(true);
  });

  it('returns false for non-matching key', () => {
    expect(isKeyCombination(makeEvent('b'), 'a')).toBe(false);
  });

  it('returns true for matching key + ctrl modifier', () => {
    expect(isKeyCombination(makeEvent('k', { ctrlKey: true }), 'k', { ctrl: true })).toBe(true);
  });

  it('returns false when ctrl required but not pressed', () => {
    expect(isKeyCombination(makeEvent('k'), 'k', { ctrl: true })).toBe(false);
  });

  it('returns true for matching key + shift modifier', () => {
    expect(isKeyCombination(makeEvent('k', { shiftKey: true }), 'k', { shift: true })).toBe(true);
  });

  it('returns true for matching key + alt modifier', () => {
    expect(isKeyCombination(makeEvent('k', { altKey: true }), 'k', { alt: true })).toBe(true);
  });

  it('returns false when alt required but not pressed', () => {
    expect(isKeyCombination(makeEvent('k'), 'k', { alt: true })).toBe(false);
  });

  it('returns true with no modifiers specified', () => {
    expect(isKeyCombination(makeEvent('x', { ctrlKey: true }), 'x')).toBe(true);
  });
});
