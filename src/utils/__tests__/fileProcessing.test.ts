/**
 * fileProcessing tests
 *
 * Verifies that createUserProfileFromFiles passes through the baseId
 * instead of generating a timestamp-based ID. This prevents the bug
 * where a non-UUID id causes every database save to fail with 403.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Claude extraction API call so the function falls back to regex
vi.mock('../../lib/analytics', () => ({ track: vi.fn() }));

// We need to mock the fetch call that extractProfileWithClaude makes
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('createUserProfileFromFiles', () => {
  const TEST_UUID = '9d49907c-a057-4f3b-9cfc-a6e2769b44cd';

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    global.fetch = mockFetch;
    // First fetch (Claude extraction) fails → falls back to regex
    // Second fetch (Perplexity discovery) succeeds with empty companies
    mockFetch
      .mockRejectedValueOnce(new Error('API unavailable'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { baseCompanies: [] }
        })
      });
  });

  it('should use baseId for the profile id instead of generating a timestamp', async () => {
    const { createUserProfileFromFiles } = await import('../fileProcessing');

    const resumeFile = new File(
      ['John Doe\nSoftware Engineer\nExperience: 5 years'],
      'resume.txt',
      { type: 'text/plain' }
    );
    const cmfFile = new File(
      ['Target Role: Senior Engineer\nMust Have: TypeScript\nWant to Have: Remote'],
      'cmf.txt',
      { type: 'text/plain' }
    );

    const result = await createUserProfileFromFiles(resumeFile, cmfFile, TEST_UUID);

    expect(result.id).toBe(TEST_UUID);
    expect(result.cmf.id).toBe(TEST_UUID);
    // Verify it does NOT contain a generated timestamp pattern
    expect(result.id).not.toMatch(/^user-\d+$/);
    expect(result.cmf.id).not.toMatch(/^cmf-\d+$/);
  });

  it('should default baseId to "user" when not provided', async () => {
    const { createUserProfileFromFiles } = await import('../fileProcessing');

    const resumeFile = new File(['resume content'], 'resume.txt', { type: 'text/plain' });
    const cmfFile = new File(['cmf content'], 'cmf.txt', { type: 'text/plain' });

    const result = await createUserProfileFromFiles(resumeFile, cmfFile);

    expect(result.id).toBe('user');
    expect(result.cmf.id).toBe('user');
  });

  it('should enrich and position companies when Phase 2 returns results', async () => {
    mockFetch.mockReset();

    const mockCompany = {
      id: 1,
      name: 'Acme Corp',
      industry: 'Tech',
      stage: 'Series B',
      location: 'San Diego',
      employees: '100-500',
      remote: 'Hybrid',
      openRoles: 5,
      matchScore: 60,
      matchReasons: ['Has open roles'],
      connections: [],
      connectionTypes: {},
      color: '',
      logo: 'acme.com',
      careerUrl: 'https://acme.com/careers'
    };

    mockFetch
      // Phase 1: Claude extraction fails → regex fallback
      .mockRejectedValueOnce(new Error('API unavailable'))
      // Phase 2: Perplexity returns one company
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { baseCompanies: [mockCompany] }
        })
      })
      // Phase 3: Claude enrichment returns updated score
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          enrichments: [{
            id: 1,
            matchScore: 85,
            matchReasons: ['Strong role fit', 'Meets must-haves', 'Good culture match'],
            connections: [],
            connectionTypes: {}
          }]
        })
      });

    const { createUserProfileFromFiles } = await import('../fileProcessing');

    const resumeFile = new File(['John Doe\nSoftware Engineer'], 'resume.txt', { type: 'text/plain' });
    const cmfFile = new File(['Target Role: Engineer\nMust Have: TypeScript'], 'cmf.txt', { type: 'text/plain' });

    const result = await createUserProfileFromFiles(resumeFile, cmfFile, TEST_UUID);

    // Phase 3 enrichment should have overwritten Perplexity's score
    expect(result.baseCompanies).toHaveLength(1);
    expect(result.baseCompanies[0].matchScore).toBe(85);
    expect(result.baseCompanies[0].matchReasons).toEqual(['Strong role fit', 'Meets must-haves', 'Good culture match']);

    // Positioning should have been computed
    expect(result.baseCompanies[0].explorePosition).toBeDefined();
    expect(result.baseCompanies[0].explorePosition.angle).toBeTypeOf('number');
    expect(result.baseCompanies[0].explorePosition.distance).toBeTypeOf('number');
    expect(result.baseCompanies[0].color).toBeTruthy();
  });

  it('should fall back to Perplexity scores when Phase 3 fails', async () => {
    mockFetch.mockReset();

    const mockCompany = {
      id: 1,
      name: 'Acme Corp',
      industry: 'Tech',
      stage: 'Series B',
      location: 'San Diego',
      employees: '100-500',
      remote: 'Hybrid',
      openRoles: 5,
      matchScore: 60,
      matchReasons: ['Has open roles'],
      connections: [],
      connectionTypes: {},
      color: '',
      logo: 'acme.com',
      careerUrl: 'https://acme.com/careers'
    };

    mockFetch
      // Phase 1: Claude extraction fails → regex fallback
      .mockRejectedValueOnce(new Error('API unavailable'))
      // Phase 2: Perplexity returns one company
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { baseCompanies: [mockCompany] }
        })
      })
      // Phase 3: Enrichment fails
      .mockRejectedValueOnce(new Error('Enrichment unavailable'));

    const { createUserProfileFromFiles } = await import('../fileProcessing');

    const resumeFile = new File(['John Doe'], 'resume.txt', { type: 'text/plain' });
    const cmfFile = new File(['Target Role: Engineer'], 'cmf.txt', { type: 'text/plain' });

    const result = await createUserProfileFromFiles(resumeFile, cmfFile, TEST_UUID);

    // Should still have companies with Perplexity's original score
    expect(result.baseCompanies).toHaveLength(1);
    expect(result.baseCompanies[0].matchScore).toBe(60);
    expect(result.baseCompanies[0].matchReasons).toEqual(['Has open roles']);

    // Positioning should still be computed (using Perplexity's score)
    expect(result.baseCompanies[0].explorePosition).toBeDefined();
    expect(result.baseCompanies[0].color).toBeTruthy();
  });
});
