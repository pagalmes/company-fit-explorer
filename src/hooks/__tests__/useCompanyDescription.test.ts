import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCompanyDescription } from '../useCompanyDescription';
import { Company, UserCMF } from '../../types';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useCompanyDescription', () => {
  const mockCompany: Company = {
    id: 1,
    name: 'Test Company',
    logo: 'https://logo.dev/test',
    careerUrl: 'https://test.com/careers',
    matchScore: 85,
    industry: 'Technology',
    stage: 'Late Stage',
    location: 'San Francisco, CA',
    employees: '1000-5000',
    remote: 'Hybrid',
    openRoles: 25,
    connections: [],
    connectionTypes: {},
    matchReasons: ['Great culture', 'Good benefits'],
    color: '#3b82f6',
  };

  const mockUserCMF: UserCMF = {
    id: 'test-user',
    name: 'Test User',
    targetRole: 'Software Engineer',
    mustHaves: [{ short: 'React', detailed: '3+ years React experience' }],
    wantToHave: [{ short: 'TypeScript', detailed: 'TypeScript preferred' }],
    experience: [],
    targetCompanies: 'Tech startups',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useCompanyDescription());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.fetchDescription).toBe('function');
  });

  it('should return existing description without fetching', async () => {
    const companyWithDescription = {
      ...mockCompany,
      description: 'Existing description',
    };

    const { result } = renderHook(() => useCompanyDescription());

    let description: string | null = null;
    await act(async () => {
      description = await result.current.fetchDescription(companyWithDescription, mockUserCMF);
    });

    expect(description).toBe('Existing description');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should fetch description from API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          description: 'A leading technology company focused on innovation.',
        },
      }),
    });

    const { result } = renderHook(() => useCompanyDescription());

    let description: string | null = null;
    await act(async () => {
      description = await result.current.fetchDescription(mockCompany, mockUserCMF);
    });

    expect(description).toBe('A leading technology company focused on innovation.');
    expect(mockFetch).toHaveBeenCalledWith('/api/llm/anthropic/analyze', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));
  });

  it('should set loading state while fetching', async () => {
    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockFetch.mockReturnValueOnce(pendingPromise);

    const { result } = renderHook(() => useCompanyDescription());

    // Start fetching
    act(() => {
      result.current.fetchDescription(mockCompany, mockUserCMF);
    });

    // Should be loading
    expect(result.current.isLoading).toBe(true);

    // Resolve the promise
    await act(async () => {
      resolvePromise!({
        ok: true,
        json: async () => ({ success: true, data: { description: 'Test' } }),
      });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle API errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useCompanyDescription());

    let description: string | null = null;
    await act(async () => {
      description = await result.current.fetchDescription(mockCompany, mockUserCMF);
    });

    expect(description).toBeNull();
    expect(result.current.error).toBe('API error: 500');
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useCompanyDescription());

    let description: string | null = null;
    await act(async () => {
      description = await result.current.fetchDescription(mockCompany, mockUserCMF);
    });

    expect(description).toBeNull();
    expect(result.current.error).toBe('Network error');
  });

  it('should handle empty response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {},
      }),
    });

    const { result } = renderHook(() => useCompanyDescription());

    let description: string | null = null;
    await act(async () => {
      description = await result.current.fetchDescription(mockCompany, mockUserCMF);
    });

    expect(description).toBeNull();
  });

  it('should include CMF data in request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { description: 'Test description' },
      }),
    });

    const { result } = renderHook(() => useCompanyDescription());

    await act(async () => {
      await result.current.fetchDescription(mockCompany, mockUserCMF);
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.request.companyName).toBe('Test Company');
    expect(callBody.request.userCMF.targetRole).toBe('Software Engineer');
    expect(callBody.request.userCMF.mustHaves).toEqual(['React: 3+ years React experience']);
  });
});
