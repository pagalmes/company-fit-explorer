import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useWatchlist } from '../useWatchlist'

// Mock analytics
vi.mock('../../lib/analytics', () => ({ track: vi.fn() }))

// Mock watchlistStorage
vi.mock('../../utils/watchlistStorage', () => ({
  saveWatchlistToStorage: vi.fn().mockResolvedValue({ success: true }),
  loadWatchlistFromStorage: vi.fn().mockReturnValue({ data: new Set<number>() }),
  clearWatchlistFromStorage: vi.fn().mockReturnValue({ success: true }),
  dispatchStorageChange: vi.fn(),
}))

import {
  saveWatchlistToStorage,
  loadWatchlistFromStorage,
  clearWatchlistFromStorage,
  dispatchStorageChange,
} from '../../utils/watchlistStorage'
import { track } from '../../lib/analytics'

const mockSave = saveWatchlistToStorage as ReturnType<typeof vi.fn>
const mockLoad = loadWatchlistFromStorage as ReturnType<typeof vi.fn>
const mockClear = clearWatchlistFromStorage as ReturnType<typeof vi.fn>
const mockDispatch = dispatchStorageChange as ReturnType<typeof vi.fn>
const mockTrack = track as ReturnType<typeof vi.fn>

const companies = [
  {
    id: 1, name: 'OpenAI', logo: '', careerUrl: '', matchScore: 95,
    industry: 'AI', stage: 'Late', location: 'SF', employees: '1000',
    remote: 'Hybrid', openRoles: 3, connections: [], connectionTypes: {},
    matchReasons: [], color: '#000', angle: 0, distance: 80,
  },
  {
    id: 2, name: 'Anthropic', logo: '', careerUrl: '', matchScore: 88,
    industry: 'AI', stage: 'Growth', location: 'SF', employees: '500',
    remote: 'Remote', openRoles: 5, connections: [], connectionTypes: {},
    matchReasons: [], color: '#fff', angle: 0, distance: 60,
  },
]

function render() {
  return renderHook(() => useWatchlist({ companies }))
}

describe('useWatchlist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLoad.mockReturnValue({ data: new Set<number>() })
    mockSave.mockResolvedValue({ success: true })
    mockClear.mockReturnValue({ success: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('initializes with empty state while loading', async () => {
    const { result } = render()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.companyIds.size).toBe(0)
    expect(result.current.error).toBeNull()
    expect(result.current.watchlistCompanies).toHaveLength(0)
  })

  it('loads stored company IDs on mount', async () => {
    mockLoad.mockReturnValue({ data: new Set([1]) })
    const { result } = render()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.companyIds.has(1)).toBe(true)
    expect(result.current.watchlistCompanies).toHaveLength(1)
    expect(result.current.watchlistCompanies[0].name).toBe('OpenAI')
  })

  it('addToWatchlist adds a company and saves', async () => {
    const { result } = render()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.addToWatchlist(1)
    })

    expect(result.current.companyIds.has(1)).toBe(true)
    expect(mockSave).toHaveBeenCalledWith(expect.any(Set), undefined)
    expect(mockTrack).toHaveBeenCalledWith('company_added_to_watchlist', { company_id: 1 })
  })

  it('addToWatchlist is a no-op if company already in watchlist', async () => {
    mockLoad.mockReturnValue({ data: new Set([1]) })
    const { result } = render()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.addToWatchlist(1)
    })

    expect(mockSave).not.toHaveBeenCalled()
  })

  it('removeFromWatchlist removes a company and saves', async () => {
    mockLoad.mockReturnValue({ data: new Set([1, 2]) })
    const { result } = render()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.removeFromWatchlist(1)
    })

    expect(result.current.companyIds.has(1)).toBe(false)
    expect(result.current.companyIds.has(2)).toBe(true)
    expect(mockTrack).toHaveBeenCalledWith('company_removed_from_watchlist', { company_id: 1 })
  })

  it('removeFromWatchlist is a no-op if company not in watchlist', async () => {
    const { result } = render()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.removeFromWatchlist(99)
    })

    expect(mockSave).not.toHaveBeenCalled()
  })

  it('toggleWatchlist adds when not in watchlist', async () => {
    const { result } = render()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.toggleWatchlist(1)
    })

    expect(result.current.companyIds.has(1)).toBe(true)
  })

  it('toggleWatchlist removes when in watchlist', async () => {
    mockLoad.mockReturnValue({ data: new Set([1]) })
    const { result } = render()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.toggleWatchlist(1)
    })

    expect(result.current.companyIds.has(1)).toBe(false)
  })

  it('isInWatchlist returns correct boolean', async () => {
    mockLoad.mockReturnValue({ data: new Set([1]) })
    const { result } = render()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isInWatchlist(1)).toBe(true)
    expect(result.current.isInWatchlist(2)).toBe(false)
  })

  it('clearWatchlist empties the list and calls storage clear', async () => {
    mockLoad.mockReturnValue({ data: new Set([1, 2]) })
    const { result } = render()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.clearWatchlist()
    })

    expect(result.current.companyIds.size).toBe(0)
    expect(mockClear).toHaveBeenCalled()
  })

  it('stats reflect current watchlist companies', async () => {
    mockLoad.mockReturnValue({ data: new Set([1, 2]) })
    const { result } = render()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.stats.totalCompanies).toBe(2)
    expect(result.current.stats.excellentMatches).toBe(1) // only OpenAI has >=90
    expect(result.current.stats.totalOpenRoles).toBe(8) // 3 + 5
    expect(result.current.stats.lastActivity).not.toBeNull()
  })

  it('stats.lastActivity is null when watchlist is empty', async () => {
    const { result } = render()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.stats.lastActivity).toBeNull()
  })

  it('handles storage load error and sets error state', async () => {
    mockLoad.mockReturnValue({
      data: new Set<number>(),
      error: { type: 'unknown', message: 'parse error' },
    })
    const { result } = render()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBe('parse error')
  })

  it('calls onError callback when storage load fails', async () => {
    const storageError = { type: 'unknown' as const, message: 'fail' }
    mockLoad.mockReturnValue({ data: new Set<number>(), error: storageError })
    const onError = vi.fn()
    const { result } = renderHook(() => useWatchlist({ companies, onError }))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(onError).toHaveBeenCalledWith(storageError)
  })

  it('reacts to watchlist-storage-change custom event', async () => {
    // Capture the actual handler registered by the hook
    let capturedHandler: ((e: Event) => void) | null = null
    const origAdd = window.addEventListener.bind(window)
    const addSpy = vi.spyOn(window, 'addEventListener').mockImplementation((type, handler, ...args) => {
      if (type === 'watchlist-storage-change') {
        capturedHandler = handler as (e: Event) => void
      }
      return origAdd(type, handler as EventListenerOrEventListenerObject, ...args)
    })

    const { result } = render()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(capturedHandler).not.toBeNull()

    await act(() => {
      capturedHandler!(
        new CustomEvent('watchlist-storage-change', {
          detail: { companyIds: [1, 2] },
        })
      )
    })

    expect(result.current.companyIds.has(1)).toBe(true)
    expect(result.current.companyIds.has(2)).toBe(true)
    addSpy.mockRestore()
  })

  it('cleans up event listeners on unmount', async () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render()
    await waitFor(() => expect(loadWatchlistFromStorage).toHaveBeenCalled())
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('watchlist-storage-change', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('storage', expect.any(Function))
  })

  it('dispatches storage change event after successful save', async () => {
    const { result } = render()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.addToWatchlist(1)
    })

    expect(mockDispatch).toHaveBeenCalled()
  })

  it('handles save failure gracefully', async () => {
    mockSave.mockResolvedValue({
      success: false,
      error: { type: 'quota_exceeded', message: 'quota full' },
    })
    const { result } = render()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.addToWatchlist(1)
    })

    expect(result.current.error).toBe('quota full')
  })
})
