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

  it('should create profile with _warning and empty companies when Perplexity is unavailable', async () => {
    mockFetch.mockReset();

    mockFetch
      // Phase 1: Claude extraction fails → regex fallback
      .mockRejectedValueOnce(new Error('API unavailable'))
      // Phase 2: Perplexity returns warning (auth/billing error)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          warning: 'Perplexity API key is invalid or expired. Company discovery is temporarily unavailable.',
          data: { baseCompanies: [] }
        })
      });

    const { createUserProfileFromFiles } = await import('../fileProcessing');

    const resumeFile = new File(['John Doe\nSoftware Engineer'], 'resume.txt', { type: 'text/plain' });
    const cmfFile = new File(['Target Role: Engineer'], 'cmf.txt', { type: 'text/plain' });

    const result = await createUserProfileFromFiles(resumeFile, cmfFile, TEST_UUID);

    // Profile should still be created
    expect(result.id).toBe(TEST_UUID);
    expect(result.cmf).toBeDefined();
    // Warning should be passed through
    expect(result._warning).toContain('Perplexity API key is invalid');
    // No companies
    expect(result.baseCompanies).toHaveLength(0);
    // Phase 3 should NOT have been called (no companies to enrich)
    expect(mockFetch).toHaveBeenCalledTimes(2); // Phase 1 + Phase 2 only
  });

  it('should keep Perplexity data for companies not enriched by Phase 3', async () => {
    mockFetch.mockReset();

    const company1 = {
      id: 1, name: 'Acme Corp', industry: 'Tech', stage: 'Series B',
      location: 'San Diego', employees: '100-500', remote: 'Hybrid',
      openRoles: 5, matchScore: 55, matchReasons: ['Perplexity reason 1'],
      connections: [], connectionTypes: {}, color: '', logo: 'acme.com',
      careerUrl: 'https://acme.com/careers'
    };
    const company2 = {
      id: 2, name: 'Beta Inc', industry: 'Fintech', stage: 'Series A',
      location: 'NYC', employees: '50-100', remote: 'Remote',
      openRoles: 3, matchScore: 45, matchReasons: ['Perplexity reason 2'],
      connections: [], connectionTypes: {}, color: '', logo: 'beta.com',
      careerUrl: 'https://beta.com/careers'
    };

    mockFetch
      .mockRejectedValueOnce(new Error('API unavailable'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { baseCompanies: [company1, company2] }
        })
      })
      // Phase 3: Only enriches company 1, not company 2
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          enrichments: [{
            id: 1,
            matchScore: 90,
            matchReasons: ['Enriched reason'],
            connections: [2],
            connectionTypes: {}
          }]
        })
      });

    const { createUserProfileFromFiles } = await import('../fileProcessing');

    const resumeFile = new File(['John Doe'], 'resume.txt', { type: 'text/plain' });
    const cmfFile = new File(['Target Role: Engineer'], 'cmf.txt', { type: 'text/plain' });

    const result = await createUserProfileFromFiles(resumeFile, cmfFile, TEST_UUID);

    expect(result.baseCompanies).toHaveLength(2);
    // Company 1: enriched by Phase 3
    expect(result.baseCompanies[0].matchScore).toBe(90);
    expect(result.baseCompanies[0].matchReasons).toEqual(['Enriched reason']);
    // Company 2: kept Perplexity's original data
    expect(result.baseCompanies[1].matchScore).toBe(45);
    expect(result.baseCompanies[1].matchReasons).toEqual(['Perplexity reason 2']);
    // Both should still be positioned
    expect(result.baseCompanies[0].explorePosition).toBeDefined();
    expect(result.baseCompanies[1].explorePosition).toBeDefined();
  });

  it('should give multiple companies distinct positions', async () => {
    mockFetch.mockReset();

    const companies = [
      {
        id: 1, name: 'Alpha', industry: 'Tech', stage: 'Series A',
        location: 'SF', employees: '50', remote: 'Remote',
        openRoles: 3, matchScore: 90, matchReasons: ['Great fit'],
        connections: [], connectionTypes: {}, color: '', logo: 'alpha.com',
        careerUrl: 'https://alpha.com/careers'
      },
      {
        id: 2, name: 'Beta', industry: 'Fintech', stage: 'Series B',
        location: 'NYC', employees: '200', remote: 'Hybrid',
        openRoles: 5, matchScore: 70, matchReasons: ['Good fit'],
        connections: [], connectionTypes: {}, color: '', logo: 'beta.com',
        careerUrl: 'https://beta.com/careers'
      },
      {
        id: 3, name: 'Gamma', industry: 'Healthcare', stage: 'Public',
        location: 'Boston', employees: '5000', remote: 'In-Office',
        openRoles: 10, matchScore: 40, matchReasons: ['Some fit'],
        connections: [], connectionTypes: {}, color: '', logo: 'gamma.com',
        careerUrl: 'https://gamma.com/careers'
      }
    ];

    mockFetch
      .mockRejectedValueOnce(new Error('API unavailable'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { baseCompanies: companies }
        })
      })
      // Phase 3: Enrichment fails → uses Perplexity scores for positioning
      .mockRejectedValueOnce(new Error('Enrichment unavailable'));

    const { createUserProfileFromFiles } = await import('../fileProcessing');

    const resumeFile = new File(['Jane Doe'], 'resume.txt', { type: 'text/plain' });
    const cmfFile = new File(['Target Role: Engineer'], 'cmf.txt', { type: 'text/plain' });

    const result = await createUserProfileFromFiles(resumeFile, cmfFile, TEST_UUID);

    expect(result.baseCompanies).toHaveLength(3);

    // All should have positions
    for (const company of result.baseCompanies) {
      expect(company.explorePosition).toBeDefined();
      expect(company.explorePosition.angle).toBeTypeOf('number');
      expect(company.explorePosition.distance).toBeTypeOf('number');
      expect(company.color).toBeTruthy();
    }

    // At least one pair should have different positions (not all stacked)
    const positions = result.baseCompanies.map((c: any) => `${c.explorePosition.angle},${c.explorePosition.distance}`);
    const uniquePositions = new Set(positions);
    expect(uniquePositions.size).toBeGreaterThan(1);
  });

  it('should keep Perplexity scores but still position when Phase 3 returns warning', async () => {
    mockFetch.mockReset();

    const mockCompany = {
      id: 1, name: 'Acme Corp', industry: 'Tech', stage: 'Series B',
      location: 'San Diego', employees: '100-500', remote: 'Hybrid',
      openRoles: 5, matchScore: 65, matchReasons: ['Perplexity reason'],
      connections: [], connectionTypes: {}, color: '', logo: 'acme.com',
      careerUrl: 'https://acme.com/careers'
    };

    mockFetch
      .mockRejectedValueOnce(new Error('API unavailable'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { baseCompanies: [mockCompany] }
        })
      })
      // Phase 3: Returns warning (e.g. Anthropic billing issue)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          warning: 'Anthropic API has no remaining credits. Company enrichment is temporarily unavailable.',
          enrichments: []
        })
      });

    const { createUserProfileFromFiles } = await import('../fileProcessing');

    const resumeFile = new File(['John Doe'], 'resume.txt', { type: 'text/plain' });
    const cmfFile = new File(['Target Role: Engineer'], 'cmf.txt', { type: 'text/plain' });

    const result = await createUserProfileFromFiles(resumeFile, cmfFile, TEST_UUID);

    // Should keep Perplexity's scores (enrichment was skipped due to warning)
    expect(result.baseCompanies).toHaveLength(1);
    expect(result.baseCompanies[0].matchScore).toBe(65);
    expect(result.baseCompanies[0].matchReasons).toEqual(['Perplexity reason']);

    // Positioning should still be computed
    expect(result.baseCompanies[0].explorePosition).toBeDefined();
    expect(result.baseCompanies[0].color).toBeTruthy();
  });
});
