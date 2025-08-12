import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  saveWatchlistToStorage,
  loadWatchlistFromStorage,
  clearWatchlistFromStorage,
  isStorageAvailable,
  getStorageInfo,
  dispatchStorageChange,
  getWatchlistStorageSize
} from '../watchlistStorage'

// Mock navigator.storage
const mockStorageEstimate = {
  estimate: vi.fn()
}

describe('watchlistStorage', () => {
  const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  }

  beforeEach(() => {
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    })

    // Mock navigator.storage
    Object.defineProperty(navigator, 'storage', {
      value: mockStorageEstimate,
      writable: true,
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('isStorageAvailable', () => {
    it('should return true when localStorage is available', () => {
      expect(isStorageAvailable()).toBe(true)
    })

    it('should return false when localStorage is not available', () => {
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      })

      expect(isStorageAvailable()).toBe(false)
    })

    it('should return false when localStorage throws error', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage not available')
      })

      expect(isStorageAvailable()).toBe(false)
    })

    it('should return false in server-side environment', () => {
      // Mock server-side environment
      const originalWindow = global.window
      // @ts-ignore
      delete global.window

      expect(isStorageAvailable()).toBe(false)

      global.window = originalWindow
    })
  })

  describe('getStorageInfo', () => {
    it('should return storage info when available', async () => {
      mockStorageEstimate.estimate.mockResolvedValue({
        usage: 1000,
        quota: 5000
      })

      const info = await getStorageInfo()

      expect(info).toEqual({
        used: 1000,
        available: 4000
      })
    })

    it('should return null when storage is not available', async () => {
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      })

      const info = await getStorageInfo()

      expect(info).toBeNull()
    })

    it('should return null when navigator.storage is not available', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      Object.defineProperty(navigator, 'storage', {
        value: undefined,
        writable: true,
      })

      const info = await getStorageInfo()

      expect(info).toBeNull()
      
      consoleSpy.mockRestore()
    })

    it('should handle storage estimate errors', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockStorageEstimate.estimate.mockRejectedValue(new Error('Estimate failed'))

      const info = await getStorageInfo()

      expect(info).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith('Could not estimate storage:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('saveWatchlistToStorage', () => {
    it('should save watchlist successfully', async () => {
      const companyIds = new Set([1, 2, 3])
      mockStorageEstimate.estimate.mockResolvedValue({
        usage: 1000,
        quota: 50000
      })

      const result = await saveWatchlistToStorage(companyIds)

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cmf-explorer-watchlist',
        expect.stringContaining('"companyIds":[1,2,3]')
      )
    })

    it('should save with userId when provided', async () => {
      const companyIds = new Set([1, 2, 3])
      const userId = 'user123'
      mockStorageEstimate.estimate.mockResolvedValue({
        usage: 1000,
        quota: 50000
      })

      const result = await saveWatchlistToStorage(companyIds, userId)

      expect(result.success).toBe(true)
      const setItemCall = mockLocalStorage.setItem.mock.calls[0]
      const savedData = JSON.parse(setItemCall[1])
      expect(savedData.userId).toBe(userId)
    })

    it('should return error when localStorage is not available', async () => {
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      })

      const companyIds = new Set([1, 2, 3])
      const result = await saveWatchlistToStorage(companyIds)

      expect(result.success).toBe(false)
      expect(result.error?.type).toBe('not_supported')
      expect(result.error?.message).toContain('localStorage is not available')
    })

    it('should handle quota exceeded error', async () => {
      const companyIds = new Set([1, 2, 3])
      const quotaError = new Error('Quota exceeded')
      quotaError.name = 'QuotaExceededError'
      
      mockLocalStorage.setItem.mockImplementation(() => {
        throw quotaError
      })

      const result = await saveWatchlistToStorage(companyIds)

      expect(result.success).toBe(false)
      expect(result.error?.type).toBe('quota_exceeded')
      expect(result.error?.message).toContain('Storage quota exceeded')
    })

    it('should handle security error (private mode)', async () => {
      const companyIds = new Set([1, 2, 3])
      const securityError = new Error('Security error')
      securityError.name = 'SecurityError'
      
      mockLocalStorage.setItem.mockImplementation(() => {
        throw securityError
      })

      const result = await saveWatchlistToStorage(companyIds)

      expect(result.success).toBe(false)
      expect(result.error?.type).toBe('security')
      expect(result.error?.message).toContain('Storage access denied')
    })

    it('should retry after cleanup on quota exceeded', async () => {
      const companyIds = new Set([1, 2, 3])
      const quotaError = new Error('Quota exceeded')
      quotaError.name = 'QuotaExceededError'
      
      let callCount = 0
      mockLocalStorage.setItem.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          throw quotaError
        }
        // Second call succeeds
      })

      // Mock some old keys for cleanup
      Object.keys = vi.fn().mockReturnValue([
        'cmf-explorer-old-data',
        'cmf-explorer-watchlist',
        'other-app-data'
      ])

      const result = await saveWatchlistToStorage(companyIds)

      expect(result.success).toBe(true)
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('cmf-explorer-old-data')
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(2)
    })

    it('should fail after max retries', async () => {
      const companyIds = new Set([1, 2, 3])
      const error = new Error('Persistent error')
      
      mockLocalStorage.setItem.mockImplementation(() => {
        throw error
      })

      const result = await saveWatchlistToStorage(companyIds)

      expect(result.success).toBe(false)
      expect(result.error?.type).toBe('unknown')
      expect(result.error?.message).toContain('Failed to save after 3 attempts')
    })

    it('should verify storage write', async () => {
      const companyIds = new Set([1, 2, 3])
      
      // Mock successful write but failed verification
      let getItemCallCount = 0
      mockLocalStorage.getItem.mockImplementation(() => {
        getItemCallCount++
        if (getItemCallCount === 1) {
          return 'different data' // Verification fails
        }
        return null
      })

      const result = await saveWatchlistToStorage(companyIds)

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('Storage verification failed')
    })

    it('should preemptively check storage quota', async () => {
      const companyIds = new Set(Array.from({ length: 1000 }, (_, i) => i)) // Large dataset
      
      mockStorageEstimate.estimate.mockResolvedValue({
        usage: 9900,
        quota: 10000 // Very little space available
      })

      const result = await saveWatchlistToStorage(companyIds)

      expect(result.success).toBe(false)
      expect(result.error?.type).toBe('quota_exceeded')
      expect(result.error?.message).toContain('exceeds available storage')
    })
  })

  describe('loadWatchlistFromStorage', () => {
    it('should load watchlist successfully', () => {
      const mockData = {
        userId: 'user123',
        companyIds: [1, 2, 3],
        lastUpdated: '2023-01-01T00:00:00.000Z',
        version: 1
      }
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockData))

      const result = loadWatchlistFromStorage('user123')

      expect(result.data).toEqual(new Set([1, 2, 3]))
      expect(result.error).toBeUndefined()
      expect(result.migrated).toBeUndefined()
    })

    it('should return empty set when no data exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const result = loadWatchlistFromStorage()

      expect(result.data).toEqual(new Set())
      expect(result.error).toBeUndefined()
    })

    it('should migrate legacy data format', () => {
      const legacyData = [1, 2, 3] // Old format: just array
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(legacyData))

      const result = loadWatchlistFromStorage('user123')

      expect(result.data).toEqual(new Set([1, 2, 3]))
      expect(result.migrated).toBe(true)
      expect(mockLocalStorage.setItem).toHaveBeenCalled() // Should save migrated data
    })

    it('should return empty set for different user', () => {
      const mockData = {
        userId: 'user123',
        companyIds: [1, 2, 3],
        lastUpdated: '2023-01-01T00:00:00.000Z',
        version: 1
      }
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockData))

      const result = loadWatchlistFromStorage('user456')

      expect(result.data).toEqual(new Set())
    })

    it('should handle invalid data structure', () => {
      const invalidData = { invalid: true }
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(invalidData))

      const result = loadWatchlistFromStorage()

      expect(result.data).toEqual(new Set())
      expect(result.error?.type).toBe('unknown')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('cmf-explorer-watchlist')
    })

    it('should handle JSON parse errors', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json')

      const result = loadWatchlistFromStorage()

      expect(result.data).toEqual(new Set())
      expect(result.error?.type).toBe('unknown')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('cmf-explorer-watchlist')
    })

    it('should handle storage not available', () => {
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      })

      const result = loadWatchlistFromStorage()

      expect(result.data).toEqual(new Set())
      expect(result.error?.type).toBe('not_supported')
    })

    it('should handle storage access errors', () => {
      const securityError = new Error('Storage access denied')
      securityError.name = 'SecurityError'
      
      mockLocalStorage.getItem.mockImplementation(() => {
        throw securityError
      })

      const result = loadWatchlistFromStorage()

      expect(result.data).toEqual(new Set())
      expect(result.error?.type).toBe('security')
    })
  })

  describe('clearWatchlistFromStorage', () => {
    it('should clear storage successfully', () => {
      const result = clearWatchlistFromStorage()

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('cmf-explorer-watchlist')
    })

    it('should handle storage not available', () => {
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      })

      const result = clearWatchlistFromStorage()

      expect(result.success).toBe(false)
      expect(result.error?.type).toBe('not_supported')
    })

    it('should handle clear errors', () => {
      const error = new Error('Clear failed')
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw error
      })

      const result = clearWatchlistFromStorage()

      expect(result.success).toBe(false)
      expect(result.error?.type).toBe('unknown')
    })
  })

  describe('dispatchStorageChange', () => {
    it('should dispatch custom event', () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')
      const testData = {
        userId: 'user123',
        companyIds: [1, 2, 3],
        lastUpdated: '2023-01-01T00:00:00.000Z',
        version: 1
      }

      dispatchStorageChange(testData)

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'watchlist-storage-change',
          detail: testData
        })
      )

      dispatchEventSpy.mockRestore()
    })

    it('should handle missing window gracefully', () => {
      const originalWindow = global.window
      // @ts-ignore
      delete global.window

      expect(() => dispatchStorageChange({
        companyIds: [1, 2, 3],
        lastUpdated: '2023-01-01T00:00:00.000Z',
        version: 1
      })).not.toThrow()

      global.window = originalWindow
    })
  })

  describe('getWatchlistStorageSize', () => {
    it('should return storage size', () => {
      const mockData = '{"companyIds":[1,2,3]}'
      mockLocalStorage.getItem.mockReturnValue(mockData)

      const size = getWatchlistStorageSize()

      expect(size).toBe(mockData.length * 2) // 2 bytes per character estimate
    })

    it('should return 0 when no data exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const size = getWatchlistStorageSize()

      expect(size).toBe(0)
    })

    it('should return 0 when storage not available', () => {
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      })

      const size = getWatchlistStorageSize()

      expect(size).toBe(0)
    })

    it('should handle storage errors', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      const size = getWatchlistStorageSize()

      expect(size).toBe(0)
    })
  })

  describe('error type detection', () => {
    it('should detect QuotaExceededError variations', async () => {
      const tests = [
        { name: 'QuotaExceededError', code: undefined },
        { name: 'NS_ERROR_DOM_QUOTA_REACHED', code: undefined },
        { name: 'Unknown', code: 22 },
        { name: 'Unknown', code: 1014 }
      ]

      for (const test of tests) {
        const error = new Error('Test error')
        error.name = test.name
        if (test.code) {
          (error as any).code = test.code
        }

        mockLocalStorage.setItem.mockImplementation(() => {
          throw error
        })

        const result = await saveWatchlistToStorage(new Set([1]))
        expect(result.error?.type).toBe('quota_exceeded')
      }
    })

    it('should detect SecurityError', async () => {
      const securityError = new Error('Security error')
      securityError.name = 'SecurityError'
      
      mockLocalStorage.setItem.mockImplementation(() => {
        throw securityError
      })

      const result = await saveWatchlistToStorage(new Set([1]))
      
      expect(result.error?.type).toBe('security')
      expect(result.error?.message).toContain('private mode')
    })

    it('should handle unknown errors', async () => {
      const unknownError = new Error('Unknown error')
      unknownError.name = 'UnknownError'
      
      mockLocalStorage.setItem.mockImplementation(() => {
        throw unknownError
      })

      const result = await saveWatchlistToStorage(new Set([1]))
      
      expect(result.error?.type).toBe('unknown')
      expect(result.error?.originalError).toBe(unknownError)
    })
  })
})