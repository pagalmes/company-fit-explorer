import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  saveRemovedCompaniesToStorage,
  loadRemovedCompaniesFromStorage,
  clearRemovedCompaniesStorage,
  removeFromRemovedCompanies
} from '../removedCompaniesStorage'

describe('removedCompaniesStorage', () => {
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
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('saveRemovedCompaniesToStorage', () => {
    it('should save company IDs successfully', () => {
      const companyIds = new Set([1, 2, 3])
      
      saveRemovedCompaniesToStorage(companyIds)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cmf-explorer-removed-companies',
        JSON.stringify([1, 2, 3])
      )
    })

    it('should save empty set successfully', () => {
      const companyIds = new Set<number>()
      
      saveRemovedCompaniesToStorage(companyIds)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cmf-explorer-removed-companies',
        JSON.stringify([])
      )
    })

    it('should handle localStorage setItem errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Storage quota exceeded')
      mockLocalStorage.setItem.mockImplementation(() => {
        throw error
      })

      const companyIds = new Set([1, 2, 3])
      
      expect(() => saveRemovedCompaniesToStorage(companyIds)).not.toThrow()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save removed companies to localStorage:', error)
      
      consoleSpy.mockRestore()
    })

    it('should handle QuotaExceededError', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const quotaError = new Error('Quota exceeded')
      quotaError.name = 'QuotaExceededError'
      
      mockLocalStorage.setItem.mockImplementation(() => {
        throw quotaError
      })

      const companyIds = new Set([1, 2, 3])
      
      expect(() => saveRemovedCompaniesToStorage(companyIds)).not.toThrow()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save removed companies to localStorage:', quotaError)
      
      consoleSpy.mockRestore()
    })

    it('should handle SecurityError (private mode)', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const securityError = new Error('Security error')
      securityError.name = 'SecurityError'
      
      mockLocalStorage.setItem.mockImplementation(() => {
        throw securityError
      })

      const companyIds = new Set([1, 2, 3])
      
      expect(() => saveRemovedCompaniesToStorage(companyIds)).not.toThrow()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save removed companies to localStorage:', securityError)
      
      consoleSpy.mockRestore()
    })
  })

  describe('loadRemovedCompaniesFromStorage', () => {
    it('should load company IDs successfully', () => {
      const storedIds = [1, 2, 3]
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedIds))
      
      const result = loadRemovedCompaniesFromStorage()
      
      expect(result).toEqual(new Set([1, 2, 3]))
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('cmf-explorer-removed-companies')
    })

    it('should return empty set when no stored data exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      const result = loadRemovedCompaniesFromStorage()
      
      expect(result).toEqual(new Set())
    })

    it('should return empty set when stored data is empty string', () => {
      mockLocalStorage.getItem.mockReturnValue('')
      
      const result = loadRemovedCompaniesFromStorage()
      
      expect(result).toEqual(new Set())
    })

    it('should handle localStorage getItem errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Storage access denied')
      mockLocalStorage.getItem.mockImplementation(() => {
        throw error
      })

      const result = loadRemovedCompaniesFromStorage()
      
      expect(result).toEqual(new Set())
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load removed companies from localStorage:', error)
      
      consoleSpy.mockRestore()
    })

    it('should handle JSON parse errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockLocalStorage.getItem.mockReturnValue('invalid json')

      const result = loadRemovedCompaniesFromStorage()
      
      expect(result).toEqual(new Set())
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load removed companies from localStorage:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should handle corrupted data gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockLocalStorage.getItem.mockReturnValue('{"corrupted": true}')

      const result = loadRemovedCompaniesFromStorage()
      
      expect(result).toEqual(new Set())
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load removed companies from localStorage:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should handle SecurityError (private mode)', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const securityError = new Error('Security error')
      securityError.name = 'SecurityError'
      
      mockLocalStorage.getItem.mockImplementation(() => {
        throw securityError
      })

      const result = loadRemovedCompaniesFromStorage()
      
      expect(result).toEqual(new Set())
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load removed companies from localStorage:', securityError)
      
      consoleSpy.mockRestore()
    })
  })

  describe('clearRemovedCompaniesStorage', () => {
    it('should clear storage successfully', () => {
      clearRemovedCompaniesStorage()

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('cmf-explorer-removed-companies')
    })

    it('should handle localStorage removeItem errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Storage access denied')
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw error
      })

      expect(() => clearRemovedCompaniesStorage()).not.toThrow()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to clear removed companies from localStorage:', error)
      
      consoleSpy.mockRestore()
    })

    it('should handle SecurityError during clear', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const securityError = new Error('Security error')
      securityError.name = 'SecurityError'
      
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw securityError
      })

      expect(() => clearRemovedCompaniesStorage()).not.toThrow()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to clear removed companies from localStorage:', securityError)
      
      consoleSpy.mockRestore()
    })
  })

  describe('removeFromRemovedCompanies', () => {
    it('should remove company ID successfully', () => {
      const existingIds = [1, 2, 3]
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingIds))
      
      removeFromRemovedCompanies(2)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cmf-explorer-removed-companies',
        JSON.stringify([1, 3])
      )
    })

    it('should handle removing non-existent company ID', () => {
      const existingIds = [1, 2, 3]
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingIds))
      
      removeFromRemovedCompanies(4)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cmf-explorer-removed-companies',
        JSON.stringify([1, 2, 3])
      )
    })

    it('should handle empty storage when removing', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      removeFromRemovedCompanies(1)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cmf-explorer-removed-companies',
        JSON.stringify([])
      )
    })

    it('should handle load errors during remove', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const loadError = new Error('Load failed')
      mockLocalStorage.getItem.mockImplementation(() => {
        throw loadError
      })

      expect(() => removeFromRemovedCompanies(1)).not.toThrow()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load removed companies from localStorage:', loadError)
      // The function will continue and try to save, which will also fail due to the load error
      
      consoleSpy.mockRestore()
    })

    it('should handle save errors during remove', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const existingIds = [1, 2, 3]
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingIds))
      
      const saveError = new Error('Save failed')
      mockLocalStorage.setItem.mockImplementation(() => {
        throw saveError
      })

      expect(() => removeFromRemovedCompanies(2)).not.toThrow()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save removed companies to localStorage:', saveError)
      // The outer try-catch will catch any error from the inner operations
      
      consoleSpy.mockRestore()
    })
  })

  describe('edge cases and data integrity', () => {
    it('should handle large dataset without errors', () => {
      const largeSet = new Set(Array.from({ length: 1000 }, (_, i) => i))
      
      expect(() => saveRemovedCompaniesToStorage(largeSet)).not.toThrow()
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cmf-explorer-removed-companies',
        expect.stringContaining('999')
      )
    })

    it('should maintain data integrity across save/load cycle', () => {
      const originalIds = new Set([5, 10, 15, 20])
      const serialized = JSON.stringify(Array.from(originalIds))
      
      mockLocalStorage.getItem.mockReturnValue(serialized)
      
      const loaded = loadRemovedCompaniesFromStorage()
      
      expect(loaded).toEqual(originalIds)
    })

    it('should handle undefined localStorage gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Simulate environment without localStorage
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      })

      expect(() => saveRemovedCompaniesToStorage(new Set([1, 2]))).not.toThrow()
      expect(() => loadRemovedCompaniesFromStorage()).not.toThrow()
      expect(() => clearRemovedCompaniesStorage()).not.toThrow()
      expect(() => removeFromRemovedCompanies(1)).not.toThrow()
      
      const result = loadRemovedCompaniesFromStorage()
      expect(result).toEqual(new Set())
      
      consoleSpy.mockRestore()
    })
  })
})