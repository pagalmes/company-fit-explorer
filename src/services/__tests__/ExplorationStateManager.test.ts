/**
 * ExplorationStateManager Tests
 * 
 * Tests for the centralized state management system that handles
 * persistent exploration state including companies, watchlist, and view modes.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ExplorationStateManager } from '../ExplorationStateManager'
import { UserExplorationState, Company } from '../../types'

// Mock the devFileWriter module
vi.mock('../../utils/devFileWriter', () => ({
  writeStateToDisk: vi.fn().mockResolvedValue({ success: true, message: 'Mock success' }),
  checkDevServerAvailable: vi.fn().mockResolvedValue(false),
  logFileWriteInstructions: vi.fn()
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('ExplorationStateManager', () => {
  let stateManager: ExplorationStateManager
  let initialState: UserExplorationState

  const mockCompany: Company = {
    id: 1001,
    name: 'Test Company',
    logo: 'https://example.com/logo.png',
    careerUrl: 'https://example.com/careers',
    matchScore: 85,
    industry: 'Technology',
    stage: 'Series A',
    location: 'San Francisco, CA',
    employees: '~100',
    remote: 'Remote-friendly',
    openRoles: 5,
    connections: [],
    connectionTypes: {},
    matchReasons: ['Great culture', 'Remote work'],
    color: '#F59E0B',
    angle: 45,
    distance: 100
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    
    initialState = {
      id: 'test-user',
      name: 'Test User',
      cmf: {
        id: 'test-user',
        name: 'Test User',
        mustHaves: ['Remote work'],
        wantToHave: ['Growth opportunities'],
        experience: ['Software Development'],
        targetRole: 'Software Engineer',
        targetCompanies: 'Tech startups'
      },
      baseCompanies: [mockCompany],
      addedCompanies: [],
      removedCompanyIds: [],
      watchlistCompanyIds: [],
      lastSelectedCompanyId: undefined,
      viewMode: 'explore'
    }

    stateManager = new ExplorationStateManager(initialState, 'testProfile')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Company Management', () => {
    it('should get all available companies', () => {
      const companies = stateManager.getAllCompanies()
      expect(companies).toHaveLength(1)
      expect(companies[0]).toEqual(mockCompany)
    })

    it('should add a new company', () => {
      const newCompany: Company = {
        ...mockCompany,
        id: 0, // Will be auto-assigned
        name: 'New Company'
      }

      const addedCompany = stateManager.addCompany(newCompany)
      
      expect(addedCompany.id).toBeGreaterThan(1000)
      expect(addedCompany.name).toBe('New Company')
      
      const allCompanies = stateManager.getAllCompanies()
      expect(allCompanies).toHaveLength(2)
    })

    it('should remove a company', () => {
      stateManager.removeCompany(mockCompany.id)
      
      const companies = stateManager.getAllCompanies()
      expect(companies).toHaveLength(0)
      expect(stateManager.isCompanyRemoved(mockCompany.id)).toBe(true)
    })

    it('should restore a removed company', () => {
      stateManager.removeCompany(mockCompany.id)
      expect(stateManager.getAllCompanies()).toHaveLength(0)
      
      stateManager.restoreCompany(mockCompany.id)
      expect(stateManager.getAllCompanies()).toHaveLength(1)
      expect(stateManager.isCompanyRemoved(mockCompany.id)).toBe(false)
    })

    it('should filter companies for different view modes', () => {
      const allCompanies = stateManager.getDisplayedCompanies()
      expect(allCompanies).toHaveLength(1)

      // Switch to watchlist view (should be empty)
      stateManager.setViewMode('watchlist')
      const watchlistCompanies = stateManager.getDisplayedCompanies()
      expect(watchlistCompanies).toHaveLength(0)
    })
  })

  describe('Watchlist Management', () => {
    it('should add company to watchlist', () => {
      expect(stateManager.isInWatchlist(mockCompany.id)).toBe(false)
      
      const wasAdded = stateManager.toggleWatchlist(mockCompany.id)
      expect(wasAdded).toBe(true)
      expect(stateManager.isInWatchlist(mockCompany.id)).toBe(true)
    })

    it('should remove company from watchlist', () => {
      stateManager.toggleWatchlist(mockCompany.id) // Add first
      expect(stateManager.isInWatchlist(mockCompany.id)).toBe(true)
      
      const wasRemoved = stateManager.toggleWatchlist(mockCompany.id)
      expect(wasRemoved).toBe(false)
      expect(stateManager.isInWatchlist(mockCompany.id)).toBe(false)
    })

    it('should get watchlist companies', () => {
      stateManager.toggleWatchlist(mockCompany.id)
      
      const watchlistCompanies = stateManager.getWatchlistCompanies()
      expect(watchlistCompanies).toHaveLength(1)
      expect(watchlistCompanies[0]).toEqual(mockCompany)
    })

    it('should calculate watchlist statistics', () => {
      stateManager.toggleWatchlist(mockCompany.id)
      
      const stats = stateManager.getWatchlistStats()
      expect(stats.totalCompanies).toBe(1)
      expect(stats.excellentMatches).toBe(0) // mockCompany has score 85, not >= 90
      expect(stats.totalOpenRoles).toBe(5)
      expect(stats.lastActivity).toBeInstanceOf(Date)
    })

    it('should remove company from watchlist when removing company', () => {
      stateManager.toggleWatchlist(mockCompany.id)
      expect(stateManager.isInWatchlist(mockCompany.id)).toBe(true)
      
      stateManager.removeCompany(mockCompany.id)
      expect(stateManager.isInWatchlist(mockCompany.id)).toBe(false)
    })
  })

  describe('Selection and View Mode Management', () => {
    it('should set and get selected company', () => {
      expect(stateManager.getSelectedCompany()).toBeNull()
      
      stateManager.setSelectedCompany(mockCompany.id)
      const selected = stateManager.getSelectedCompany()
      expect(selected).toEqual(mockCompany)
    })

    it('should clear selection when company is removed', () => {
      stateManager.setSelectedCompany(mockCompany.id)
      expect(stateManager.getSelectedCompany()).toEqual(mockCompany)
      
      stateManager.removeCompany(mockCompany.id)
      expect(stateManager.getSelectedCompany()).toBeNull()
    })

    it('should set and get view mode', () => {
      expect(stateManager.getViewMode()).toBe('explore')
      
      stateManager.setViewMode('watchlist')
      expect(stateManager.getViewMode()).toBe('watchlist')
    })
  })

  describe('State Persistence', () => {
    it('should save state to localStorage', () => {
      stateManager.toggleWatchlist(mockCompany.id)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'cosmos-exploration-state',
        expect.stringContaining('"watchlistCompanyIds":[1001]')
      )
    })

    it('should batch addCompany + toggleWatchlist into one remote persist', async () => {
      // Simulate the handleAddCompany flow: addCompany then toggleWatchlist
      const newCompany = stateManager.addCompany({
        ...mockCompany,
        id: 0,
        name: 'Discord'
      })
      stateManager.toggleWatchlist(newCompany.id)

      // localStorage should already have the FINAL state (both mutations)
      const lastLocalStorageCall = localStorageMock.setItem.mock.calls
        .filter((c: string[]) => c[0] === 'cosmos-exploration-state')
        .pop()!
      const savedState = JSON.parse(lastLocalStorageCall[1])
      expect(savedState.watchlistCompanyIds).toContain(newCompany.id)
      expect(savedState.addedCompanies.some((c: Company) => c.name === 'Discord')).toBe(true)

      // The remote persist fires after the microtask — flush it
      await Promise.resolve()

      // State manager should reflect both mutations
      expect(stateManager.isInWatchlist(newCompany.id)).toBe(true)
      expect(stateManager.getAllCompanies().find(c => c.id === newCompany.id)).toBeTruthy()
    })

    it('should get current state snapshot', () => {
      stateManager.toggleWatchlist(mockCompany.id)
      stateManager.setViewMode('watchlist')
      
      const currentState = stateManager.getCurrentState()
      expect(currentState.watchlistCompanyIds).toContain(mockCompany.id)
      expect(currentState.viewMode).toBe('watchlist')
      
      // Should be a deep copy, not reference
      expect(currentState).not.toBe(stateManager['currentState'])
    })

    it('should get exploration statistics', () => {
      const newCompany = stateManager.addCompany({
        ...mockCompany,
        id: 0,
        name: 'Added Company'
      })
      stateManager.removeCompany(mockCompany.id)
      stateManager.toggleWatchlist(newCompany.id)
      
      const stats = stateManager.getExplorationStats()
      expect(stats.total).toBe(1) // 1 base company (removed) + 1 added - 1 removed = 1
      expect(stats.base).toBe(1)
      expect(stats.added).toBe(1)
      expect(stats.removed).toBe(1)
      expect(stats.watchlisted).toBe(1)
      expect(stats.viewed).toBe('explore')
    })
  })

  describe('User CMF Access', () => {
    it('should get user CMF data', () => {
      const cmf = stateManager.getUserCMF()
      expect(cmf).toEqual(initialState.cmf)
    })
  })

  describe('User ID Validation', () => {
    it('should accept a valid Supabase UUID', () => {
      expect(() =>
        ExplorationStateManager.validateUserId('9d49907c-a057-4f3b-9cfc-a6e2769b44cd')
      ).not.toThrow()
    })

    it('should reject a generated timestamp ID', () => {
      expect(() =>
        ExplorationStateManager.validateUserId(`user-${Date.now()}`)
      ).toThrow(/Invalid userId.*Expected a Supabase UUID/)
    })

    it('should reject a plain string ID', () => {
      expect(() =>
        ExplorationStateManager.validateUserId('test-user')
      ).toThrow(/Invalid userId/)
    })

    it('should reject an empty string', () => {
      expect(() =>
        ExplorationStateManager.validateUserId('')
      ).toThrow(/Invalid userId/)
    })
  })

  describe('Manual File Writing', () => {
    it('should handle manual file write in development', async () => {
      // Mock development environment
      vi.stubEnv('NODE_ENV', 'development')

      const { writeStateToDisk } = await import('../../utils/devFileWriter')
      vi.mocked(writeStateToDisk).mockResolvedValue({ success: true, message: 'Written successfully' })

      const result = await stateManager.writeToFile()
      expect(result).toBe(true)
      expect(writeStateToDisk).toHaveBeenCalledWith('testProfile', expect.any(Object))

      vi.unstubAllEnvs()
    })

    it('should reject manual file write in production', async () => {
      vi.stubEnv('NODE_ENV', 'production')

      const result = await stateManager.writeToFile()
      expect(result).toBe(false)

      vi.unstubAllEnvs()
    })
  })
})