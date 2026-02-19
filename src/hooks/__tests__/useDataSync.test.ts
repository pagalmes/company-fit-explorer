import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDataSync, DataVersionTimestamps } from '../useDataSync'

function simulateVisibilityChange(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    writable: true,
    configurable: true,
  })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useDataSync', () => {
  const mockOnStaleData = vi.fn()
  const knownVersions: DataVersionTimestamps = {
    companyDataUpdatedAt: '2026-01-01T00:00:00Z',
    preferencesUpdatedAt: '2026-01-01T00:00:00Z',
  }

  beforeEach(() => {
    vi.useFakeTimers()
    mockOnStaleData.mockClear()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('visibility change behavior', () => {
    it('should call version endpoint when document becomes visible', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(knownVersions),
      })
      global.fetch = fetchMock

      renderHook(() =>
        useDataSync({
          knownVersions,
          onStaleData: mockOnStaleData,
          minCheckInterval: 0,
        })
      )

      await act(async () => {
        simulateVisibilityChange('visible')
        await vi.runAllTimersAsync()
      })

      expect(fetchMock).toHaveBeenCalledWith('/api/user/data/version')
    })

    it('should NOT call version endpoint when document becomes hidden', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(knownVersions),
      })
      global.fetch = fetchMock

      renderHook(() =>
        useDataSync({
          knownVersions,
          onStaleData: mockOnStaleData,
          minCheckInterval: 0,
        })
      )

      await act(async () => {
        simulateVisibilityChange('hidden')
        await vi.runAllTimersAsync()
      })

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should NOT call version endpoint when knownVersions is null', async () => {
      const fetchMock = vi.fn()
      global.fetch = fetchMock

      renderHook(() =>
        useDataSync({
          knownVersions: null,
          onStaleData: mockOnStaleData,
          minCheckInterval: 0,
        })
      )

      await act(async () => {
        simulateVisibilityChange('visible')
        await vi.runAllTimersAsync()
      })

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should NOT call version endpoint when enabled is false', async () => {
      const fetchMock = vi.fn()
      global.fetch = fetchMock

      renderHook(() =>
        useDataSync({
          knownVersions,
          onStaleData: mockOnStaleData,
          enabled: false,
          minCheckInterval: 0,
        })
      )

      await act(async () => {
        simulateVisibilityChange('visible')
        await vi.runAllTimersAsync()
      })

      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('staleness detection', () => {
    it('should call onStaleData when companyDataUpdatedAt differs', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            companyDataUpdatedAt: '2026-02-01T00:00:00Z',
            preferencesUpdatedAt: '2026-01-01T00:00:00Z',
          }),
      })

      renderHook(() =>
        useDataSync({
          knownVersions,
          onStaleData: mockOnStaleData,
          minCheckInterval: 0,
        })
      )

      await act(async () => {
        simulateVisibilityChange('visible')
        await vi.runAllTimersAsync()
      })

      expect(mockOnStaleData).toHaveBeenCalledTimes(1)
    })

    it('should call onStaleData when preferencesUpdatedAt differs', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            companyDataUpdatedAt: '2026-01-01T00:00:00Z',
            preferencesUpdatedAt: '2026-02-01T00:00:00Z',
          }),
      })

      renderHook(() =>
        useDataSync({
          knownVersions,
          onStaleData: mockOnStaleData,
          minCheckInterval: 0,
        })
      )

      await act(async () => {
        simulateVisibilityChange('visible')
        await vi.runAllTimersAsync()
      })

      expect(mockOnStaleData).toHaveBeenCalledTimes(1)
    })

    it('should NOT call onStaleData when timestamps match', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(knownVersions),
      })

      renderHook(() =>
        useDataSync({
          knownVersions,
          onStaleData: mockOnStaleData,
          minCheckInterval: 0,
        })
      )

      await act(async () => {
        simulateVisibilityChange('visible')
        await vi.runAllTimersAsync()
      })

      expect(mockOnStaleData).not.toHaveBeenCalled()
    })
  })

  describe('throttling', () => {
    it('should skip check if less than minCheckInterval since last check', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(knownVersions),
      })
      global.fetch = fetchMock

      renderHook(() =>
        useDataSync({
          knownVersions,
          onStaleData: mockOnStaleData,
          minCheckInterval: 10_000,
        })
      )

      // First check goes through
      await act(async () => {
        simulateVisibilityChange('visible')
        await vi.runAllTimersAsync()
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)

      // Advance only 5s — second check should be skipped
      await act(async () => {
        vi.advanceTimersByTime(5_000)
        simulateVisibilityChange('visible')
        await vi.runAllTimersAsync()
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('should allow check after minCheckInterval has elapsed', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(knownVersions),
      })
      global.fetch = fetchMock

      renderHook(() =>
        useDataSync({
          knownVersions,
          onStaleData: mockOnStaleData,
          minCheckInterval: 10_000,
        })
      )

      // First check
      await act(async () => {
        simulateVisibilityChange('visible')
        await vi.runAllTimersAsync()
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)

      // Advance past interval — second check should proceed
      await act(async () => {
        vi.advanceTimersByTime(11_000)
        simulateVisibilityChange('visible')
        await vi.runAllTimersAsync()
      })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('error handling', () => {
    it('should silently handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      renderHook(() =>
        useDataSync({
          knownVersions,
          onStaleData: mockOnStaleData,
          minCheckInterval: 0,
        })
      )

      await act(async () => {
        simulateVisibilityChange('visible')
        await vi.runAllTimersAsync()
      })

      expect(mockOnStaleData).not.toHaveBeenCalled()
    })

    it('should silently handle 401 responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      })

      renderHook(() =>
        useDataSync({
          knownVersions,
          onStaleData: mockOnStaleData,
          minCheckInterval: 0,
        })
      )

      await act(async () => {
        simulateVisibilityChange('visible')
        await vi.runAllTimersAsync()
      })

      expect(mockOnStaleData).not.toHaveBeenCalled()
    })

    it('should silently handle 500 responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })

      renderHook(() =>
        useDataSync({
          knownVersions,
          onStaleData: mockOnStaleData,
          minCheckInterval: 0,
        })
      )

      await act(async () => {
        simulateVisibilityChange('visible')
        await vi.runAllTimersAsync()
      })

      expect(mockOnStaleData).not.toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('should remove visibilitychange listener on unmount', async () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      const { unmount } = renderHook(() =>
        useDataSync({
          knownVersions,
          onStaleData: mockOnStaleData,
        })
      )

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      )
    })
  })

  describe('ref updates', () => {
    it('should use latest onStaleData callback when invoking', async () => {
      const firstCallback = vi.fn()
      const secondCallback = vi.fn()

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            companyDataUpdatedAt: '2026-02-01T00:00:00Z',
            preferencesUpdatedAt: '2026-01-01T00:00:00Z',
          }),
      })

      const { rerender } = renderHook(
        ({ onStaleData }) =>
          useDataSync({
            knownVersions,
            onStaleData,
            minCheckInterval: 0,
          }),
        { initialProps: { onStaleData: firstCallback } }
      )

      // Update callback before triggering
      rerender({ onStaleData: secondCallback })

      await act(async () => {
        simulateVisibilityChange('visible')
        await vi.runAllTimersAsync()
      })

      expect(firstCallback).not.toHaveBeenCalled()
      expect(secondCallback).toHaveBeenCalledTimes(1)
    })
  })
})
