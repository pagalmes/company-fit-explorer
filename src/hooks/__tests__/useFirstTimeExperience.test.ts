import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useFirstTimeExperience } from '../useFirstTimeExperience'

describe('useFirstTimeExperience (deprecated stub)', () => {
  it('always returns isFirstTime: false', () => {
    const { result } = renderHook(() => useFirstTimeExperience())
    expect(result.current.isFirstTime).toBe(false)
  })

  it('always returns hasChecked: true', () => {
    const { result } = renderHook(() => useFirstTimeExperience())
    expect(result.current.hasChecked).toBe(true)
  })

  it('markAsVisited is a no-op function', () => {
    const { result } = renderHook(() => useFirstTimeExperience())
    expect(() => result.current.markAsVisited()).not.toThrow()
  })

  it('resetFirstTime is a no-op function', () => {
    const { result } = renderHook(() => useFirstTimeExperience())
    expect(() => result.current.resetFirstTime()).not.toThrow()
  })
})
