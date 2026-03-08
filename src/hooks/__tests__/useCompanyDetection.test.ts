import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCompanyDetection } from '../useCompanyDetection'

// Mock dependencies
vi.mock('sonner', () => ({ toast: { error: vi.fn(), warning: vi.fn() } }))

vi.mock('../../utils/llm/service', () => ({
  llmService: {
    isConfigured: vi.fn().mockReturnValue(true),
    extractCompanies: vi.fn().mockResolvedValue({ companies: [], warning: null }),
  },
}))

vi.mock('../../utils/companyValidation', () => ({
  getCompanyPreview: vi.fn().mockResolvedValue({
    logo: 'https://logo.example.com/logo.png',
    domain: 'example.com',
  }),
}))

import { toast } from 'sonner'
import { llmService } from '../../utils/llm/service'
import { getCompanyPreview } from '../../utils/companyValidation'

const mockLlm = llmService as unknown as { isConfigured: ReturnType<typeof vi.fn>; extractCompanies: ReturnType<typeof vi.fn> }
const mockPreview = getCompanyPreview as unknown as ReturnType<typeof vi.fn>
const mockToast = toast as unknown as { error: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn> }

const existingCompanies: any[] = [
  { id: 1, name: 'OpenAI', logo: '', careerUrl: '', matchScore: 95 },
]

function render(overrides: Partial<Parameters<typeof useCompanyDetection>[0]> = {}) {
  return renderHook(() =>
    useCompanyDetection({
      existingCompanies,
      onClose: vi.fn(),
      ...overrides,
    })
  )
}

describe('useCompanyDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLlm.isConfigured.mockReturnValue(true)
    mockLlm.extractCompanies.mockResolvedValue({ companies: [], warning: null })
    mockPreview.mockResolvedValue({ logo: 'https://logo.example.com/logo.png', domain: 'example.com' })
  })

  it('initializes with empty detectedCompanies and isDetecting=false', () => {
    const { result } = render()
    expect(result.current.detectedCompanies).toHaveLength(0)
    expect(result.current.isDetecting).toBe(false)
  })

  it('exposes llmConfigured from llmService.isConfigured()', () => {
    mockLlm.isConfigured.mockReturnValue(false)
    const { result } = render()
    expect(result.current.llmConfigured).toBe(false)
  })

  it('detectCompanies returns false and toasts error when text is empty', async () => {
    const { result } = render()
    let returnVal: boolean | undefined
    await act(async () => {
      returnVal = await result.current.detectCompanies('   ')
    })
    expect(returnVal).toBe(false)
    expect(mockToast.error).toHaveBeenCalledWith('No text provided for company detection')
  })

  it('detectCompanies returns false and toasts error when LLM not configured', async () => {
    mockLlm.isConfigured.mockReturnValue(false)
    const { result } = render()
    let returnVal: boolean | undefined
    await act(async () => {
      returnVal = await result.current.detectCompanies('some text')
    })
    expect(returnVal).toBe(false)
    expect(mockToast.error).toHaveBeenCalledWith('Please configure your API key first', expect.anything())
  })

  it('detectCompanies returns false and toasts error when no companies found', async () => {
    mockLlm.extractCompanies.mockResolvedValue({ companies: [], warning: null })
    const { result } = render()
    let returnVal: boolean | undefined
    await act(async () => {
      returnVal = await result.current.detectCompanies('some text')
    })
    expect(returnVal).toBe(false)
    expect(mockToast.error).toHaveBeenCalledWith('No companies found in the text', expect.anything())
  })

  it('detectCompanies sets detectedCompanies and returns true on success', async () => {
    mockLlm.extractCompanies.mockResolvedValue({
      companies: [{ name: 'Anthropic', url: 'anthropic.com' }],
      warning: null,
    })
    const { result } = render()
    let returnVal: boolean | undefined
    await act(async () => {
      returnVal = await result.current.detectCompanies('some text')
    })
    expect(returnVal).toBe(true)
    expect(result.current.detectedCompanies).toHaveLength(1)
    expect(result.current.detectedCompanies[0].name).toBe('Anthropic')
  })

  it('marks existing companies as duplicates', async () => {
    mockLlm.extractCompanies.mockResolvedValue({
      companies: [{ name: 'OpenAI', url: 'openai.com' }],
      warning: null,
    })
    const { result } = render()
    await act(async () => {
      await result.current.detectCompanies('OpenAI')
    })
    expect(result.current.detectedCompanies[0].isDuplicate).toBe(true)
    expect(result.current.detectedCompanies[0].selected).toBe(false)
  })

  it('non-duplicate companies are selected by default', async () => {
    mockLlm.extractCompanies.mockResolvedValue({
      companies: [{ name: 'Anthropic', url: 'anthropic.com' }],
      warning: null,
    })
    const { result } = render()
    await act(async () => {
      await result.current.detectCompanies('Anthropic')
    })
    expect(result.current.detectedCompanies[0].isDuplicate).toBe(false)
    expect(result.current.detectedCompanies[0].selected).toBe(true)
  })

  it('shows warning toast when LLM returns a warning', async () => {
    mockLlm.extractCompanies.mockResolvedValue({
      companies: [{ name: 'Anthropic', url: 'anthropic.com' }],
      warning: 'Too many companies, limited to 25',
    })
    const { result } = render()
    await act(async () => {
      await result.current.detectCompanies('lots of companies')
    })
    expect(mockToast.warning).toHaveBeenCalledWith('Too many companies, limited to 25', expect.anything())
  })

  it('toggleCompanySelection flips selected state', async () => {
    mockLlm.extractCompanies.mockResolvedValue({
      companies: [{ name: 'Anthropic', url: 'anthropic.com' }],
      warning: null,
    })
    const { result } = render()
    await act(async () => {
      await result.current.detectCompanies('Anthropic')
    })
    expect(result.current.detectedCompanies[0].selected).toBe(true)

    act(() => result.current.toggleCompanySelection(0))
    expect(result.current.detectedCompanies[0].selected).toBe(false)

    act(() => result.current.toggleCompanySelection(0))
    expect(result.current.detectedCompanies[0].selected).toBe(true)
  })

  it('toggleSelectAll deselects all non-duplicate companies when all selected', async () => {
    mockLlm.extractCompanies.mockResolvedValue({
      companies: [
        { name: 'Anthropic', url: 'anthropic.com' },
        { name: 'DeepMind', url: 'deepmind.com' },
      ],
      warning: null,
    })
    const { result } = render()
    await act(async () => {
      await result.current.detectCompanies('text')
    })
    // Both selected by default
    act(() => result.current.toggleSelectAll())
    expect(result.current.detectedCompanies[0].selected).toBe(false)
    expect(result.current.detectedCompanies[1].selected).toBe(false)
  })

  it('toggleSelectAll selects all non-duplicate companies when not all selected', async () => {
    mockLlm.extractCompanies.mockResolvedValue({
      companies: [
        { name: 'Anthropic', url: 'anthropic.com' },
        { name: 'DeepMind', url: 'deepmind.com' },
      ],
      warning: null,
    })
    const { result } = render()
    await act(async () => {
      await result.current.detectCompanies('text')
    })
    act(() => result.current.toggleCompanySelection(0)) // deselect first
    act(() => result.current.toggleSelectAll())
    expect(result.current.detectedCompanies[0].selected).toBe(true)
    expect(result.current.detectedCompanies[1].selected).toBe(true)
  })

  it('prepareCompaniesForImport returns null when nothing selected', async () => {
    mockLlm.extractCompanies.mockResolvedValue({
      companies: [{ name: 'Anthropic', url: 'anthropic.com' }],
      warning: null,
    })
    const { result } = render()
    await act(async () => {
      await result.current.detectCompanies('Anthropic')
    })
    act(() => result.current.toggleCompanySelection(0)) // deselect
    expect(result.current.prepareCompaniesForImport()).toBeNull()
  })

  it('prepareCompaniesForImport returns mapped companies for selected', async () => {
    mockLlm.extractCompanies.mockResolvedValue({
      companies: [{ name: 'Anthropic', url: 'anthropic.com', careerUrl: 'anthropic.com/jobs' }],
      warning: null,
    })
    const { result } = render()
    await act(async () => {
      await result.current.detectCompanies('Anthropic')
    })
    const prepared = result.current.prepareCompaniesForImport()
    expect(prepared).not.toBeNull()
    expect(prepared![0].name).toBe('Anthropic')
    expect(prepared![0].logo).toBeTruthy()
  })

  it('reset clears detectedCompanies and isDetecting', async () => {
    mockLlm.extractCompanies.mockResolvedValue({
      companies: [{ name: 'Anthropic', url: 'anthropic.com' }],
      warning: null,
    })
    const { result } = render()
    await act(async () => {
      await result.current.detectCompanies('Anthropic')
    })
    expect(result.current.detectedCompanies).toHaveLength(1)

    act(() => result.current.reset())
    expect(result.current.detectedCompanies).toHaveLength(0)
    expect(result.current.isDetecting).toBe(false)
  })

  it('handles LLM error gracefully and toasts error', async () => {
    mockLlm.extractCompanies.mockRejectedValue(new Error('network failure'))
    const { result } = render()
    let returnVal: boolean | undefined
    await act(async () => {
      returnVal = await result.current.detectCompanies('some text')
    })
    expect(returnVal).toBe(false)
    expect(mockToast.error).toHaveBeenCalledWith('Failed to detect companies', expect.anything())
    expect(result.current.isDetecting).toBe(false)
  })
})
