/**
 * DevFileWriter Tests
 * 
 * Tests for development file writing utilities that enable
 * automatic persistence of exploration state to companies.ts
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { writeStateToDisk, checkDevServerAvailable, generateCompaniesFileContent, backupCompaniesFile, logFileWriteInstructions } from '../devFileWriter'
import { UserExplorationState } from '../../types'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock console methods
vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'group').mockImplementation(() => {})
vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})

describe('DevFileWriter', () => {
  let mockState: UserExplorationState

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockState = {
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
      baseCompanies: [
        {
          id: 1,
          name: 'Test Company',
          logo: 'https://example.com/logo.png',
          careerUrl: 'https://example.com/careers',
          matchScore: 95,
          industry: 'Technology',
          stage: 'Series A',
          location: 'San Francisco, CA',
          employees: '~100',
          remote: 'Remote-friendly',
          openRoles: 5,
          connections: [2],
          connectionTypes: { 2: 'Related Tech' },
          matchReasons: ['Great culture', 'Remote work'],
          color: '#10B981',
          angle: 45,
          distance: 100
        }
      ],
      addedCompanies: [
        {
          id: 1001,
          name: 'Added Company',
          logo: 'https://example.com/logo2.png',
          careerUrl: 'https://example.com/careers2',
          matchScore: 88,
          industry: 'FinTech',
          stage: 'Series B',
          location: 'New York, NY',
          employees: '~200',
          remote: 'Fully remote',
          openRoles: 3,
          connections: [],
          connectionTypes: {},
          matchReasons: ['Innovative product', 'Strong team'],
          color: '#F59E0B',
          angle: 90,
          distance: 120
        }
      ],
      removedCompanyIds: [2],
      watchlistCompanyIds: [1, 1001],
      lastSelectedCompanyId: 1,
      viewMode: 'watchlist'
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  describe('writeStateToDisk', () => {
    it('should successfully write state to disk in development', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, message: 'File written successfully' })
      })

      const result = await writeStateToDisk('testProfile', mockState)

      expect(result.success).toBe(true)
      expect(result.message).toBe('File written successfully')
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/dev/write-companies',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"profileName":"testProfile"')
        })
      )
    })

    it('should reject in production mode', async () => {
      vi.stubEnv('NODE_ENV', 'production')

      const result = await writeStateToDisk('testProfile', mockState)

      expect(result.success).toBe(false)
      expect(result.message).toBe('File writing is only available in development mode')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should handle fetch errors gracefully', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await writeStateToDisk('testProfile', mockState)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to write to file')
      expect(result.error).toBe('Network error')
    })

    it('should handle HTTP errors', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      const result = await writeStateToDisk('testProfile', mockState)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to write to file')
      expect(result.error).toBe('HTTP 500: Internal Server Error')
    })
  })

  describe('checkDevServerAvailable', () => {
    it('should return true when server is available in development', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      mockFetch.mockResolvedValue({ ok: true })

      const result = await checkDevServerAvailable()

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/dev/health',
        { method: 'GET' }
      )
    })

    it('should return false in production', async () => {
      vi.stubEnv('NODE_ENV', 'production')

      const result = await checkDevServerAvailable()

      expect(result).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should return false when server is not available', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      mockFetch.mockResolvedValue({ ok: false })

      const result = await checkDevServerAvailable()

      expect(result).toBe(false)
    })

    it('should return false on network error', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await checkDevServerAvailable()

      expect(result).toBe(false)
    })
  })

  describe('generateCompaniesFileContent', () => {
    it('should generate valid TypeScript file content', () => {
      const content = generateCompaniesFileContent('testProfile', mockState)

      expect(content).toContain("import { Company, UserExplorationState } from '../types';")
      expect(content).toContain('const baseCompanies: Company[] =')
      expect(content).toContain('const testProfile: UserExplorationState =')
      expect(content).toContain('export const activeUserProfile = testProfile;')
      expect(content).toContain('export const sampleUserCMF = activeUserProfile.cmf;')
      expect(content).toContain('export const sampleCompanies = activeUserProfile.baseCompanies;')
      
      // Check that state data is included
      expect(content).toContain('"id": "test-user"')
      expect(content).toContain('"name": "Test User"')
      expect(content).toContain('viewMode: \'watchlist\'')
      expect(content).toContain('1,\n  1001')
      expect(content).toContain('2\n]')
    })

    it('should handle undefined lastSelectedCompanyId', () => {
      const stateWithoutSelection = { ...mockState, lastSelectedCompanyId: undefined }
      const content = generateCompaniesFileContent('testProfile', stateWithoutSelection)

      expect(content).toContain('lastSelectedCompanyId: undefined')
    })

    it('should handle numeric lastSelectedCompanyId', () => {
      const content = generateCompaniesFileContent('testProfile', mockState)

      expect(content).toContain('lastSelectedCompanyId: 1')
    })
  })

  describe('backupCompaniesFile', () => {
    it('should create backup in development', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, message: 'Backup created successfully' })
      })

      const result = await backupCompaniesFile()

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/dev/backup-companies',
        { method: 'POST' }
      )
    })

    it('should reject in production', async () => {
      vi.stubEnv('NODE_ENV', 'production')

      const result = await backupCompaniesFile()

      expect(result.success).toBe(false)
      expect(result.message).toBe('Backup only available in development')
    })
  })

  describe('logFileWriteInstructions', () => {
    it('should execute without error in development', () => {
      vi.stubEnv('NODE_ENV', 'development')

      expect(() => logFileWriteInstructions(mockState)).not.toThrow()
    })

    it('should execute without error in production', () => {
      vi.stubEnv('NODE_ENV', 'production')

      expect(() => logFileWriteInstructions(mockState)).not.toThrow()
    })

    it('should handle undefined lastSelectedCompanyId', () => {
      vi.stubEnv('NODE_ENV', 'development')

      const stateWithoutSelection = { ...mockState, lastSelectedCompanyId: undefined }
      expect(() => logFileWriteInstructions(stateWithoutSelection)).not.toThrow()
    })
  })
})
