import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import React, { useRef } from 'react'
import { useSwipeGesture } from '../useSwipeGesture'

function touch(x: number, y: number): Touch {
  return { clientX: x, clientY: y } as Touch
}

function fireTouch(el: HTMLElement, type: 'touchstart' | 'touchend', x: number, y: number) {
  const t = touch(x, y)
  fireEvent(el, new TouchEvent(type, {
    bubbles: true,
    touches: type === 'touchstart' ? [t] : [],
    changedTouches: [t],
  }))
}

// Component wrapper that forwards the ref from useSwipeGesture to a div
function SwipeTarget({ onSwipeRight, onSwipeLeft, threshold, velocityThreshold }: {
  onSwipeRight?: () => void
  onSwipeLeft?: () => void
  threshold?: number
  velocityThreshold?: number
}) {
  const ref = useSwipeGesture({ onSwipeRight, onSwipeLeft, threshold, velocityThreshold })
  return <div ref={ref} data-testid="target" />
}

describe('useSwipeGesture', () => {
  const onSwipeRight = vi.fn()
  const onSwipeLeft = vi.fn()

  beforeEach(() => {
    onSwipeRight.mockClear()
    onSwipeLeft.mockClear()
  })

  it('returns a ref (hook returns object with current)', () => {
    let capturedRef: React.RefObject<HTMLDivElement> | null = null
    function Capture() {
      capturedRef = useSwipeGesture<HTMLDivElement>({ onSwipeRight, onSwipeLeft })
      return null
    }
    render(<Capture />)
    expect(capturedRef).not.toBeNull()
    expect(capturedRef).toHaveProperty('current')
  })

  it('fires onSwipeRight for rightward swipe exceeding threshold', () => {
    const { getByTestId } = render(
      <SwipeTarget onSwipeRight={onSwipeRight} onSwipeLeft={onSwipeLeft} threshold={50} />
    )
    const el = getByTestId('target')
    act(() => {
      fireTouch(el, 'touchstart', 0, 0)
      fireTouch(el, 'touchend', 100, 0)
    })
    expect(onSwipeRight).toHaveBeenCalledTimes(1)
    expect(onSwipeLeft).not.toHaveBeenCalled()
  })

  it('fires onSwipeLeft for leftward swipe exceeding threshold', () => {
    const { getByTestId } = render(
      <SwipeTarget onSwipeRight={onSwipeRight} onSwipeLeft={onSwipeLeft} threshold={50} />
    )
    const el = getByTestId('target')
    act(() => {
      fireTouch(el, 'touchstart', 100, 0)
      fireTouch(el, 'touchend', 0, 0)
    })
    expect(onSwipeLeft).toHaveBeenCalledTimes(1)
    expect(onSwipeRight).not.toHaveBeenCalled()
  })

  it('does not fire for swipe below threshold and low velocity', () => {
    vi.useFakeTimers()
    const { getByTestId } = render(
      <SwipeTarget onSwipeRight={onSwipeRight} onSwipeLeft={onSwipeLeft} threshold={50} velocityThreshold={0.5} />
    )
    const el = getByTestId('target')
    act(() => {
      fireTouch(el, 'touchstart', 0, 0)
      // Advance 1000ms so velocity = 10px/1000ms = 0.01 px/ms < 0.5 threshold
      vi.advanceTimersByTime(1000)
      fireTouch(el, 'touchend', 10, 0)
    })
    expect(onSwipeRight).not.toHaveBeenCalled()
    expect(onSwipeLeft).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('does not fire when vertical movement exceeds horizontal', () => {
    const { getByTestId } = render(
      <SwipeTarget onSwipeRight={onSwipeRight} onSwipeLeft={onSwipeLeft} threshold={50} />
    )
    const el = getByTestId('target')
    act(() => {
      fireTouch(el, 'touchstart', 0, 0)
      fireTouch(el, 'touchend', 30, 100)
    })
    expect(onSwipeRight).not.toHaveBeenCalled()
    expect(onSwipeLeft).not.toHaveBeenCalled()
  })

  it('cleans up event listeners on unmount', () => {
    const { getByTestId, unmount } = render(
      <SwipeTarget onSwipeRight={onSwipeRight} onSwipeLeft={onSwipeLeft} />
    )
    const el = getByTestId('target')
    const removeSpy = vi.spyOn(el, 'removeEventListener')
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('touchend', expect.any(Function))
  })
})
