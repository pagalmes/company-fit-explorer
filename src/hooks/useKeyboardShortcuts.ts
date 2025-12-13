import { useEffect, useCallback, useRef } from 'react';

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
  /** Modifier keys required (default: none) */
  modifiers?: {
    ctrl?: boolean;
    meta?: boolean; // Cmd on Mac, Win on Windows
    shift?: boolean;
    alt?: boolean;
  };
  /** Prevent default browser behavior (default: true) */
  preventDefault?: boolean;
  /** Only trigger when no input is focused (default: true) */
  requireNoInput?: boolean;
  /** Custom condition to check before executing (default: always true) */
  condition?: () => boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  /** Enable/disable all shortcuts (default: true) */
  enabled?: boolean;
}

/**
 * Hook for managing keyboard shortcuts in a centralized way
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     {
 *       key: 'a',
 *       description: 'Add company',
 *       action: () => setShowModal(true),
 *     },
 *     {
 *       key: '/',
 *       description: 'Focus search',
 *       action: () => searchRef.current?.focus(),
 *     },
 *   ],
 * });
 * ```
 */
export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // Check if user is typing in an input/textarea/contenteditable
    const isInputFocused =
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target instanceof HTMLElement && e.target.isContentEditable);

    for (const shortcut of shortcutsRef.current) {
      // Check if key matches
      if (e.key.toLowerCase() !== shortcut.key.toLowerCase()) continue;

      // Check modifiers
      const modifiers = shortcut.modifiers || {};
      if (modifiers.ctrl && !e.ctrlKey) continue;
      if (modifiers.meta && !e.metaKey) continue;
      if (modifiers.shift && !e.shiftKey) continue;
      if (modifiers.alt && !e.altKey) continue;

      // If no modifiers required, make sure none are pressed
      if (!modifiers.ctrl && !modifiers.meta && !modifiers.shift && !modifiers.alt) {
        if (e.ctrlKey || e.metaKey || e.altKey) continue;
      }

      // Check if input should be focused
      const requireNoInput = shortcut.requireNoInput !== false;
      if (requireNoInput && isInputFocused) continue;

      // Check custom condition
      if (shortcut.condition && !shortcut.condition()) continue;

      // Prevent default if needed
      const preventDefault = shortcut.preventDefault !== false;
      if (preventDefault) {
        e.preventDefault();
      }

      // Execute action
      shortcut.action();
      break; // Only execute first matching shortcut
    }
  }, [enabled]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Helper function to check if a key combination is pressed
 */
export function isKeyCombination(
  e: KeyboardEvent,
  key: string,
  modifiers?: { ctrl?: boolean; meta?: boolean; shift?: boolean; alt?: boolean }
): boolean {
  if (e.key.toLowerCase() !== key.toLowerCase()) return false;

  const mods = modifiers || {};
  return (
    (!mods.ctrl || e.ctrlKey) &&
    (!mods.meta || e.metaKey) &&
    (!mods.shift || e.shiftKey) &&
    (!mods.alt || e.altKey)
  );
}
