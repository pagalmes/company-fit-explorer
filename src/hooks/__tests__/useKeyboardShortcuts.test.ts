import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts, isKeyCombination } from '../useKeyboardShortcuts'

function fireKey(key: string, modifiers: Partial<KeyboardEventInit> = {}, target?: EventTarget) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    ctrlKey: modifiers.ctrlKey ?? false,
    metaKey: modifiers.metaKey ?? false,
    shiftKey: modifiers.shiftKey ?? false,
    altKey: modifiers.altKey ?? false,
  })
  if (target) {
    Object.defineProperty(event, 'target', { value: target, configurable: true })
  }
  document.dispatchEvent(event)
  return event
}

describe('useKeyboardShortcuts', () => {
  const action = vi.fn()

  beforeEach(() => action.mockClear())
  afterEach(() => vi.restoreAllMocks())

  it('fires action when matching key is pressed', () => {
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'a', description: 'test', action }],
    }))
    fireKey('a')
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('does not fire for a different key', () => {
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'a', description: 'test', action }],
    }))
    fireKey('b')
    expect(action).not.toHaveBeenCalled()
  })

  it('does not fire when enabled=false', () => {
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'a', description: 'test', action }],
      enabled: false,
    }))
    fireKey('a')
    expect(action).not.toHaveBeenCalled()
  })

  it('respects ctrl modifier — fires only with ctrl held', () => {
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'k', description: 'test', action, modifiers: { ctrl: true } }],
    }))
    fireKey('k')
    expect(action).not.toHaveBeenCalled()
    fireKey('k', { ctrlKey: true })
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('respects shift modifier', () => {
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: '/', description: 'test', action, modifiers: { shift: true } }],
    }))
    fireKey('/', { shiftKey: true })
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('does not fire when unrelated modifier is held (no modifiers required)', () => {
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'a', description: 'test', action }],
    }))
    fireKey('a', { ctrlKey: true })
    expect(action).not.toHaveBeenCalled()
  })

  it('does not fire when input element is focused (requireNoInput default)', () => {
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'a', description: 'test', action }],
    }))
    const input = document.createElement('input')
    fireKey('a', {}, input)
    expect(action).not.toHaveBeenCalled()
  })

  it('fires when input focused if requireNoInput=false', () => {
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'a', description: 'test', action, requireNoInput: false }],
    }))
    const input = document.createElement('input')
    fireKey('a', {}, input)
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('does not fire when custom condition returns false', () => {
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'a', description: 'test', action, condition: () => false }],
    }))
    fireKey('a')
    expect(action).not.toHaveBeenCalled()
  })

  it('fires when custom condition returns true', () => {
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'a', description: 'test', action, condition: () => true }],
    }))
    fireKey('a')
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('only executes first matching shortcut', () => {
    const action2 = vi.fn()
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [
        { key: 'a', description: 'first', action },
        { key: 'a', description: 'second', action: action2 },
      ],
    }))
    fireKey('a')
    expect(action).toHaveBeenCalledTimes(1)
    expect(action2).not.toHaveBeenCalled()
  })

  it('removes event listener on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const { unmount } = renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'a', description: 'test', action }],
    }))
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('is case-insensitive for key matching', () => {
    renderHook(() => useKeyboardShortcuts({
      shortcuts: [{ key: 'A', description: 'test', action }],
    }))
    fireKey('a')
    expect(action).toHaveBeenCalledTimes(1)
  })
})

describe('isKeyCombination', () => {
  it('returns true for matching key with no modifiers', () => {
    const e = new KeyboardEvent('keydown', { key: 'a' })
    expect(isKeyCombination(e, 'a')).toBe(true)
  })

  it('returns false for non-matching key', () => {
    const e = new KeyboardEvent('keydown', { key: 'b' })
    expect(isKeyCombination(e, 'a')).toBe(false)
  })

  it('returns true for key + ctrl modifier', () => {
    const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })
    expect(isKeyCombination(e, 'k', { ctrl: true })).toBe(true)
  })

  it('returns false when required ctrl is missing', () => {
    const e = new KeyboardEvent('keydown', { key: 'k' })
    expect(isKeyCombination(e, 'k', { ctrl: true })).toBe(false)
  })

  it('is case-insensitive', () => {
    const e = new KeyboardEvent('keydown', { key: 'A' })
    expect(isKeyCombination(e, 'a')).toBe(true)
  })
})
