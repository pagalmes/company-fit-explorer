import { describe, it, expect } from 'vitest'
import { calculatePosition, transformToGraphData, getMatchScoreColor, getCytoscapeStyles } from '../graphDataTransform'
import { UserCMF, Company } from '../../types'

describe('Graph Data Transform', () => {
  const mockUserCMF: UserCMF = {
    id: 'test-user',
    name: 'Test User',
    mustHaves: ['Remote Work', 'High Velocity'],
    wantToHave: ['AI/ML', 'Platform Strategy'],
    experience: ['Product Management', 'Gaming'],
    targetRole: 'Senior PM',
    targetCompanies: 'Late Stage'
  }

  const mockCompanies: Company[] = [
    {
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
      connections: [2],
      connectionTypes: { 2: 'AI Competitor' },
      matchReasons: ['AI safety focus', 'High velocity culture'],
      color: '#10B981',
      angle: 0,
      distance: 75
    },
    {
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
      connections: [1],
      connectionTypes: { 1: 'AI Competitor' },
      matchReasons: ['Constitutional AI focus', 'Remote flexibility'],
      color: '#10B981',
      angle: 30,
      distance: 80
    }
  ]

  describe('calculatePosition', () => {
    it('should calculate correct position for angle 0 degrees', () => {
      const company = mockCompanies[0]
      const position = calculatePosition(company, 400, 300, 1)
      
      expect(position.x).toBeCloseTo(475) // 400 + cos(0) * 75
      expect(position.y).toBeCloseTo(300) // 300 + sin(0) * 75
    })

    it('should calculate correct position for angle 90 degrees', () => {
      const company = { ...mockCompanies[0], angle: 90, distance: 100 }
      const position = calculatePosition(company, 400, 300, 1)
      
      expect(position.x).toBeCloseTo(400) // 400 + cos(90°) * 100 ≈ 400
      expect(position.y).toBeCloseTo(400) // 300 + sin(90°) * 100 = 400
    })

    it('should handle zoom factor', () => {
      const company = mockCompanies[0]
      const position = calculatePosition(company, 400, 300, 2)
      
      expect(position.x).toBeCloseTo(550) // 400 + cos(0) * 75 * 2
      expect(position.y).toBeCloseTo(300) // 300 + sin(0) * 75 * 2
    })

    it('should handle missing angle and distance', () => {
      const company = { ...mockCompanies[0], angle: undefined, distance: undefined }
      const position = calculatePosition(company, 400, 300, 1)
      
      expect(position.x).toBeCloseTo(500) // 400 + cos(0) * 100
      expect(position.y).toBeCloseTo(300) // 300 + sin(0) * 100
    })
  })

  describe('transformToGraphData', () => {
    it('should create correct number of nodes', () => {
      const graphData = transformToGraphData(mockUserCMF, mockCompanies)
      
      // 3 zone nodes + 1 CMF node + 2 company nodes + 2 name labels + 2 percent labels = 10 nodes
      expect(graphData.nodes).toHaveLength(10)
    })

    it('should create CMF center node', () => {
      const graphData = transformToGraphData(mockUserCMF, mockCompanies)
      const cmfNode = graphData.nodes.find(n => n.data.id === 'cmf-center')
      
      expect(cmfNode).toBeDefined()
      expect(cmfNode?.data.type).toBe('cmf')
      expect(cmfNode?.data.cmf).toEqual(mockUserCMF)
      expect(cmfNode?.position).toEqual({ x: 400, y: 300 })
    })

    it('should create company nodes with correct positions', () => {
      const graphData = transformToGraphData(mockUserCMF, mockCompanies)
      const companyNode = graphData.nodes.find(n => n.data.id === 'company-1')
      
      expect(companyNode).toBeDefined()
      expect(companyNode?.data.type).toBe('company')
      expect(companyNode?.data.company).toEqual(mockCompanies[0])
      expect(companyNode?.position?.x).toBeCloseTo(475)
    })

    it('should create name and percentage label nodes', () => {
      const graphData = transformToGraphData(mockUserCMF, mockCompanies)
      
      const nameLabel = graphData.nodes.find(n => n.data.id === 'name-label-1')
      const percentLabel = graphData.nodes.find(n => n.data.id === 'percent-label-1')
      
      expect(nameLabel?.data.type).toBe('company-name-label')
      expect(nameLabel?.data.label).toBe('OpenAI')
      
      expect(percentLabel?.data.type).toBe('company-percent-label')
      expect(percentLabel?.data.label).toBe('95%')
    })

    it('should create correct edges', () => {
      const graphData = transformToGraphData(mockUserCMF, mockCompanies)
      
      expect(graphData.edges).toHaveLength(2) // Each company has one connection
      
      const edge = graphData.edges.find(e => e.data.source === 'company-1')
      expect(edge?.data.target).toBe('company-2')
      expect(edge?.data.relationship).toBe('AI Competitor')
    })

    it('should create zone nodes', () => {
      const graphData = transformToGraphData(mockUserCMF, mockCompanies)
      
      const zones = ['zone-excellent', 'zone-good', 'zone-fair']
      zones.forEach(zoneId => {
        const zoneNode = graphData.nodes.find(n => n.data.id === zoneId)
        expect(zoneNode).toBeDefined()
        expect(zoneNode?.position).toEqual({ x: 400, y: 300 })
      })
    })
  })

  describe('getMatchScoreColor', () => {
    it('should return green for excellent matches (90%+)', () => {
      expect(getMatchScoreColor(95)).toBe('#10B981')
      expect(getMatchScoreColor(90)).toBe('#10B981')
    })

    it('should return yellow for good matches (80-89%)', () => {
      expect(getMatchScoreColor(85)).toBe('#F59E0B')
      expect(getMatchScoreColor(80)).toBe('#F59E0B')
    })

    it('should return gray for moderate matches (<80%)', () => {
      expect(getMatchScoreColor(75)).toBe('#6B7280')
      expect(getMatchScoreColor(50)).toBe('#6B7280')
      expect(getMatchScoreColor(0)).toBe('#6B7280')
    })

    it('should handle edge cases', () => {
      expect(getMatchScoreColor(89.9)).toBe('#F59E0B')
      expect(getMatchScoreColor(79.9)).toBe('#6B7280')
    })
  })

  describe('getCytoscapeStyles', () => {
    it('should return an array of style objects', () => {
      const styles = getCytoscapeStyles()
      expect(Array.isArray(styles)).toBe(true)
      expect(styles.length).toBeGreaterThan(0)
    })

    it('should include styles for all node types', () => {
      const styles = getCytoscapeStyles()
      const selectors = styles.map(style => style.selector)
      
      expect(selectors).toContain('node[type="cmf"]')
      expect(selectors).toContain('node[type="company"]')
      expect(selectors).toContain('node[type="company-name-label"]')
      expect(selectors).toContain('node[type="company-percent-label"]')
    })

    it('should include zone styles', () => {
      const styles = getCytoscapeStyles()
      const selectors = styles.map(style => style.selector)
      
      expect(selectors).toContain('node[type="zone-excellent"]')
      expect(selectors).toContain('node[type="zone-good"]')
      expect(selectors).toContain('node[type="zone-fair"]')
    })

    it('should include edge styles', () => {
      const styles = getCytoscapeStyles()
      const selectors = styles.map(style => style.selector)
      
      expect(selectors).toContain('edge')
      expect(selectors).toContain('edge.highlighted')
    })

    it('should include interactive state styles', () => {
      const styles = getCytoscapeStyles()
      const selectors = styles.map(style => style.selector)
      
      expect(selectors).toContain('node[type="company"].dimmed')
      expect(selectors).toContain('node[type="company"].selected')
      expect(selectors).toContain('node[type="company"].hovered')
    })
  })
})