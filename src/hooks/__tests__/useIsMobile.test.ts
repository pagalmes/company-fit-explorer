import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from '../useIsMobile'

function setViewport(width: number, hasTouch = false) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width })
  Object.defineProperty(window, 'ontouchstart', {
    writable: true, configurable: true,
    value: hasTouch ? () => {} : undefined,
  })
  Object.defineProperty(navigator, 'maxTouchPoints', {
    writable: true, configurable: true,
    value: hasTouch ? 5 : 0,
  })
}

describe('useIsMobile', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns true for narrow viewport (portrait mobile)', () => {
    setViewport(375, false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('returns false for desktop viewport without touch', () => {
    setViewport(1440, false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('returns true for touch device with landscape mobile width (< 1024)', () => {
    setViewport(812, true) // iPhone landscape
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('returns false for touch device with tablet/desktop width (>= 1024)', () => {
    setViewport(1024, true)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('updates when window is resized to mobile width', () => {
    setViewport(1440, false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    act(() => {
      setViewport(375, false)
      window.dispatchEvent(new Event('resize'))
    })

    expect(result.current).toBe(true)
  })

  it('updates when window is resized to desktop width', () => {
    setViewport(375, false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)

    act(() => {
      setViewport(1440, false)
      window.dispatchEvent(new Event('resize'))
    })

    expect(result.current).toBe(false)
  })

  it('handles orientation change event', () => {
    vi.useFakeTimers()
    setViewport(375, true)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)

    act(() => {
      setViewport(812, true)
      window.dispatchEvent(new Event('orientationchange'))
      vi.advanceTimersByTime(200) // wait for iOS delay
    })

    expect(result.current).toBe(true) // still mobile in landscape
    vi.useRealTimers()
  })

  it('cleans up event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    setViewport(1440, false)
    const { unmount } = renderHook(() => useIsMobile())
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function))
  })
})
