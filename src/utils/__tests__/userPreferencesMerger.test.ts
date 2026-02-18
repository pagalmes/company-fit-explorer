import { describe, it, expect } from 'vitest'
import { mergeUserPreferences } from '../userPreferencesMerger'

describe('mergeUserPreferences', () => {
  describe('watchlist priority', () => {
    it('should use table data when both sources have data', () => {
      const result = mergeUserPreferences(
        { watchlistCompanyIds: [1, 2] },
        { watchlist_company_ids: [3, 4] }
      )
      expect(result.watchlistCompanyIds).toEqual([3, 4])
    })

    it('should fall back to profile when table is empty', () => {
      const result = mergeUserPreferences(
        { watchlistCompanyIds: [1, 2] },
        { watchlist_company_ids: [] }
      )
      expect(result.watchlistCompanyIds).toEqual([1, 2])
    })

    it('should fall back to profile when table prefs are null', () => {
      const result = mergeUserPreferences(
        { watchlistCompanyIds: [1, 2] },
        null
      )
      expect(result.watchlistCompanyIds).toEqual([1, 2])
    })

    it('should return empty array when both sources are empty', () => {
      const result = mergeUserPreferences(
        { watchlistCompanyIds: [] },
        { watchlist_company_ids: [] }
      )
      expect(result.watchlistCompanyIds).toEqual([])
    })

    it('should return empty array when both sources are null', () => {
      const result = mergeUserPreferences(null, null)
      expect(result.watchlistCompanyIds).toEqual([])
    })
  })

  describe('removed companies priority', () => {
    it('should use table data when both sources have data', () => {
      const result = mergeUserPreferences(
        { removedCompanyIds: [10] },
        { removed_company_ids: [20, 30] }
      )
      expect(result.removedCompanyIds).toEqual([20, 30])
    })

    it('should fall back to profile when table is empty', () => {
      const result = mergeUserPreferences(
        { removedCompanyIds: [10] },
        { removed_company_ids: [] }
      )
      expect(result.removedCompanyIds).toEqual([10])
    })
  })

  describe('view mode priority', () => {
    it('should use table value when both sources have data', () => {
      const result = mergeUserPreferences(
        { viewMode: 'explore' },
        { view_mode: 'watchlist' }
      )
      expect(result.viewMode).toBe('watchlist')
    })

    it('should fall back to profile when table has no view mode', () => {
      const result = mergeUserPreferences(
        { viewMode: 'watchlist' },
        {}
      )
      expect(result.viewMode).toBe('watchlist')
    })

    it('should default to explore when neither source has data', () => {
      const result = mergeUserPreferences(null, null)
      expect(result.viewMode).toBe('explore')
    })
  })

  describe('cross-device sync scenario', () => {
    it('should reflect watchlist changes made on another device', () => {
      // Desktop: user adds company 5 to watchlist → table updated
      // Mobile: reloads → profile JSONB has stale CMF (no watchlist), table has [5]
      const result = mergeUserPreferences(
        { /* CMF data, no watchlist fields */ },
        { watchlist_company_ids: [5], removed_company_ids: [], view_mode: 'explore' }
      )
      expect(result.watchlistCompanyIds).toEqual([5])
    })

    it('should not resurrect stale profile watchlist after user clears all items', () => {
      // User removed all watchlist items → table is []
      // Profile JSONB was already overwritten with CMF-only data (no watchlist)
      const result = mergeUserPreferences(
        { /* CMF data, no watchlistCompanyIds field */ },
        { watchlist_company_ids: [] }
      )
      expect(result.watchlistCompanyIds).toEqual([])
    })
  })

  describe('admin import scenario', () => {
    it('should use table data from admin import when both are populated', () => {
      // Admin import writes to BOTH JSONB and table with same data
      const result = mergeUserPreferences(
        { watchlistCompanyIds: [1, 2, 3], removedCompanyIds: [4], viewMode: 'watchlist' },
        { watchlist_company_ids: [1, 2, 3], removed_company_ids: [4], view_mode: 'watchlist' }
      )
      expect(result.watchlistCompanyIds).toEqual([1, 2, 3])
      expect(result.removedCompanyIds).toEqual([4])
      expect(result.viewMode).toBe('watchlist')
    })

    it('should fall back to profile if admin import table write failed', () => {
      // Edge case: admin import wrote to JSONB but table write failed
      const result = mergeUserPreferences(
        { watchlistCompanyIds: [1, 2, 3], removedCompanyIds: [4], viewMode: 'watchlist' },
        null
      )
      expect(result.watchlistCompanyIds).toEqual([1, 2, 3])
      expect(result.removedCompanyIds).toEqual([4])
      expect(result.viewMode).toBe('watchlist')
    })
  })
})
