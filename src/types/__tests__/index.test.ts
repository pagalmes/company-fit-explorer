import { describe, it, expect } from 'vitest'
import { UserCMF, Company } from '../index'

describe('TypeScript Types and Data Validation', () => {
  describe('UserCMF Interface', () => {
    it('should accept valid UserCMF object', () => {
      const validCMF: UserCMF = {
        id: 'test-user',
        name: 'Test User',
        mustHaves: ['Remote Work', 'High Velocity'],
        wantToHave: ['AI/ML Focus', 'Platform Strategy'],
        experience: ['Product Management', 'Gaming'],
        targetRole: 'Senior PM',
        targetCompanies: 'Late Stage'
      }

      expect(validCMF.id).toBe('test-user')
      expect(validCMF.mustHaves).toHaveLength(2)
      expect(validCMF.wantToHave).toHaveLength(2)
      expect(validCMF.experience).toHaveLength(2)
    })

    it('should handle empty arrays', () => {
      const cmfWithEmptyArrays: UserCMF = {
        id: 'test-user',
        name: 'Test User',
        mustHaves: [],
        wantToHave: [],
        experience: [],
        targetRole: 'Senior PM',
        targetCompanies: 'Late Stage'
      }

      expect(cmfWithEmptyArrays.mustHaves).toHaveLength(0)
      expect(cmfWithEmptyArrays.wantToHave).toHaveLength(0)
      expect(cmfWithEmptyArrays.experience).toHaveLength(0)
    })
  })

  describe('Company Interface', () => {
    it('should accept valid Company object', () => {
      const validCompany: Company = {
        id: 1,
        name: 'OpenAI',
        logo: 'https://img.logo.dev/openai.com',
        careerUrl: 'https://openai.com/careers',
        matchScore: 95,
        industry: 'AI/ML',
        stage: 'Late Stage',
        location: 'San Francisco, CA',
        employees: '~1500',
        remote: 'In-office',
        openRoles: 3,
        connections: [2, 3],
        connectionTypes: { 2: 'AI Competitor', 3: 'Research Partner' },
        matchReasons: ['Strong AI safety focus', 'High velocity culture'],
        color: '#10B981',
        angle: 0,
        distance: 75
      }

      expect(validCompany.id).toBe(1)
      expect(validCompany.matchScore).toBe(95)
      expect(validCompany.connections).toHaveLength(2)
      expect(validCompany.matchReasons).toHaveLength(2)
    })

    it('should handle optional angle and distance properties', () => {
      const companyWithoutOptionals: Company = {
        id: 2,
        name: 'Anthropic',
        logo: 'https://img.logo.dev/anthropic.com',
        careerUrl: 'https://www.anthropic.com/careers',
        matchScore: 94,
        industry: 'AI Safety',
        stage: 'Late Stage',
        location: 'San Francisco, CA',
        employees: '~500',
        remote: 'Remote-Friendly',
        openRoles: 2,
        connections: [],
        connectionTypes: {},
        matchReasons: ['Constitutional AI focus'],
        color: '#10B981'
        // angle and distance are optional
      }

      expect(companyWithoutOptionals.angle).toBeUndefined()
      expect(companyWithoutOptionals.distance).toBeUndefined()
    })

    it('should handle empty connections and connectionTypes', () => {
      const isolatedCompany: Company = {
        id: 3,
        name: 'Isolated Company',
        logo: 'https://img.logo.dev/isolated.com',
        careerUrl: 'https://isolated.com/careers',
        matchScore: 80,
        industry: 'Technology',
        stage: 'Public',
        location: 'Remote',
        employees: '~1000',
        remote: 'Remote-First',
        openRoles: 5,
        connections: [],
        connectionTypes: {},
        matchReasons: ['Remote-first culture'],
        color: '#F59E0B',
        angle: 180,
        distance: 120
      }

      expect(isolatedCompany.connections).toHaveLength(0)
      expect(Object.keys(isolatedCompany.connectionTypes)).toHaveLength(0)
    })
  })

  describe('Data Validation Helpers', () => {
    const isValidMatchScore = (score: number): boolean => {
      return score >= 0 && score <= 100
    }

    const isValidURL = (url: string): boolean => {
      try {
        new URL(url)
        return true
      } catch {
        return false
      }
    }

    const isValidColor = (color: string): boolean => {
      return /^#[0-9A-Fa-f]{6}$/.test(color)
    }

    it('should validate match scores', () => {
      expect(isValidMatchScore(95)).toBe(true)
      expect(isValidMatchScore(0)).toBe(true)
      expect(isValidMatchScore(100)).toBe(true)
      expect(isValidMatchScore(-1)).toBe(false)
      expect(isValidMatchScore(101)).toBe(false)
    })

    it('should validate URLs', () => {
      expect(isValidURL('https://openai.com/careers')).toBe(true)
      expect(isValidURL('http://example.com')).toBe(true)
      expect(isValidURL('invalid-url')).toBe(false)
      expect(isValidURL('')).toBe(false)
    })

    it('should validate hex colors', () => {
      expect(isValidColor('#10B981')).toBe(true)
      expect(isValidColor('#F59E0B')).toBe(true)
      expect(isValidColor('#6B7280')).toBe(true)
      expect(isValidColor('#000000')).toBe(true)
      expect(isValidColor('#FFFFFF')).toBe(true)
      expect(isValidColor('10B981')).toBe(false) // missing #
      expect(isValidColor('#10B98')).toBe(false) // too short
      expect(isValidColor('#10B9811')).toBe(false) // too long
      expect(isValidColor('#GGGGGG')).toBe(false) // invalid characters
    })
  })

  describe('Company Data Integrity', () => {
    it('should ensure connection consistency', () => {
      const companies: Company[] = [
        {
          id: 1,
          name: 'Company A',
          logo: 'https://img.logo.dev/a.com',
          careerUrl: 'https://a.com/careers',
          matchScore: 95,
          industry: 'Tech',
          stage: 'Late Stage',
          location: 'SF',
          employees: '100',
          remote: 'Yes',
          openRoles: 2,
          connections: [2],
          connectionTypes: { 2: 'Partner' },
          matchReasons: ['Great match'],
          color: '#10B981'
        },
        {
          id: 2,
          name: 'Company B',
          logo: 'https://img.logo.dev/b.com',
          careerUrl: 'https://b.com/careers',
          matchScore: 90,
          industry: 'Tech',
          stage: 'Late Stage',
          location: 'SF',
          employees: '200',
          remote: 'Yes',
          openRoles: 3,
          connections: [1],
          connectionTypes: { 1: 'Partner' },
          matchReasons: ['Good match'],
          color: '#10B981'
        }
      ]

      // Check bidirectional connections
      const companyA = companies[0]
      const companyB = companies[1]
      
      expect(companyA.connections).toContain(2)
      expect(companyB.connections).toContain(1)
      expect(companyA.connectionTypes[2]).toBeDefined()
      expect(companyB.connectionTypes[1]).toBeDefined()
    })

    it('should validate match reasons are not empty', () => {
      const validateMatchReasons = (reasons: string[]): boolean => {
        return reasons.length > 0 && reasons.every(reason => reason.trim().length > 0)
      }

      expect(validateMatchReasons(['Good culture fit'])).toBe(true)
      expect(validateMatchReasons(['Reason 1', 'Reason 2'])).toBe(true)
      expect(validateMatchReasons([])).toBe(false)
      expect(validateMatchReasons([''])).toBe(false)
      expect(validateMatchReasons(['Good fit', '   '])).toBe(false)
    })
  })
})