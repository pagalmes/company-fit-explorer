import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCompanySelection } from '../useCompanySelection'

const company1 = {
  id: 1, name: 'OpenAI', logo: '', careerUrl: '', matchScore: 95,
  industry: 'AI', stage: 'Late', location: 'SF', employees: '1000',
  remote: 'Hybrid', openRoles: 3, connections: [2, 3],
  connectionTypes: {}, matchReasons: [], color: '#000', angle: 0, distance: 80,
}
const company2 = {
  ...company1, id: 2, name: 'Anthropic', connections: [1, 3],
}

describe('useCompanySelection', () => {
  it('initializes with null selection and empty highlights', () => {
    const { result } = renderHook(() => useCompanySelection())
    expect(result.current.selectedCompany).toBeNull()
    expect(result.current.hoveredCompany).toBeNull()
    expect(result.current.highlightedConnections.size).toBe(0)
  })

  it('handleCompanySelect sets selection and highlights connections', () => {
    const { result } = renderHook(() => useCompanySelection())
    act(() => result.current.handleCompanySelect(company1))
    expect(result.current.selectedCompany).toBe(company1)
    expect(result.current.highlightedConnections).toEqual(new Set([2, 3]))
  })

  it('handleCompanySelect(null) clears selection and highlights', () => {
    const { result } = renderHook(() => useCompanySelection())
    act(() => result.current.handleCompanySelect(company1))
    act(() => result.current.handleCompanySelect(null))
    expect(result.current.selectedCompany).toBeNull()
    expect(result.current.highlightedConnections.size).toBe(0)
  })

  it('handleCompanyHover sets hovered company and highlights when nothing selected', () => {
    const { result } = renderHook(() => useCompanySelection())
    act(() => result.current.handleCompanyHover(company1))
    expect(result.current.hoveredCompany).toBe(company1)
    expect(result.current.highlightedConnections).toEqual(new Set([2, 3]))
  })

  it('handleCompanyHover does not change highlights when a company is selected', () => {
    const { result } = renderHook(() => useCompanySelection())
    act(() => result.current.handleCompanySelect(company1))
    act(() => result.current.handleCompanyHover(company2))
    expect(result.current.hoveredCompany).toBe(company2)
    // Highlights stay as company1's connections, not company2's
    expect(result.current.highlightedConnections).toEqual(new Set([2, 3]))
  })

  it('handleCompanyHover(null) clears highlights when nothing selected', () => {
    const { result } = renderHook(() => useCompanySelection())
    act(() => result.current.handleCompanyHover(company1))
    act(() => result.current.handleCompanyHover(null))
    expect(result.current.hoveredCompany).toBeNull()
    expect(result.current.highlightedConnections.size).toBe(0)
  })

  it('handleCompanySelectFromPanel sets selection and highlights connections', () => {
    const { result } = renderHook(() => useCompanySelection())
    act(() => result.current.handleCompanySelectFromPanel(company2))
    expect(result.current.selectedCompany).toBe(company2)
    expect(result.current.highlightedConnections).toEqual(new Set([1, 3]))
  })

  it('handleCompanySelectFromPanel(null) clears selection and highlights', () => {
    const { result } = renderHook(() => useCompanySelection())
    act(() => result.current.handleCompanySelectFromPanel(company1))
    act(() => result.current.handleCompanySelectFromPanel(null))
    expect(result.current.selectedCompany).toBeNull()
    expect(result.current.highlightedConnections.size).toBe(0)
  })
})
