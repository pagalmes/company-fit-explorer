/**
 * fileProcessing tests
 *
 * Covers three error categories in createUserProfileFromFiles:
 *
 * 1. Successful extraction — Claude returns high-confidence profile; id uses baseId.
 *
 * 2. Transient failures (network timeouts, unexpected errors):
 *    - Retries the Claude call once.
 *    - If the retry succeeds, returns the profile normally.
 *    - If the retry also fails, throws "temporarily unavailable" with a clear retry
 *      message — does NOT fall back to regex extraction or hardcoded generic defaults.
 *
 * 3. Non-retried errors (quality issues, API config errors):
 *    - Low-confidence extraction ("Issues:") → throws actionable quality guidance.
 *    - API/key configuration failure ("API" or "ANTHROPIC_API_KEY") → throws config error.
 *    - Neither is retried; fetch is called exactly once.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/analytics', () => ({ track: vi.fn() }));

const mockFetch = vi.fn();
global.fetch = mockFetch;

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/** Builds a mock Response-like object for a successful Claude extraction. */
const makeSuccessResponse = () => ({
  ok: true,
  json: async () => ({
    success: true,
    cmf: {
      name: 'John Doe',
      targetRole: 'Senior Software Engineer',
      targetCompanies: 'Series B-D AI startups in San Francisco',
      mustHaves: [{ short: 'Remote-First', detailed: 'Full remote work as first-class option' }],
      wantToHave: [{ short: 'Equity', detailed: 'Meaningful equity package' }],
      experience: ['TypeScript', 'React', 'Node.js'],
    },
    extractionConfidence: 'high',
    extractionIssues: [],
  }),
});

/** Builds a mock Response-like object for a low-confidence extraction (quality issue). */
const makeQualityErrorResponse = () => ({
  ok: false,
  status: 500,
  json: async () => ({
    success: false,
    error:
      'Profile extraction confidence is low. Issues: targetRole inferred from job titles, ' +
      'targetCompanies not found. Please ensure documents contain specific information about ' +
      'target role, companies, and requirements.',
  }),
});

/** Builds a mock Response-like object for a missing API key (config error). */
const makeApiConfigErrorResponse = () => ({
  ok: false,
  status: 400,
  json: async () => ({
    success: false,
    error: 'ANTHROPIC_API_KEY not configured in environment variables',
  }),
});

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('createUserProfileFromFiles', () => {
  const TEST_UUID = '9d49907c-a057-4f3b-9cfc-a6e2769b44cd';

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

  beforeEach(() => {
    vi.resetAllMocks(); // Clears call history AND mock implementations before each test
  });

  // ----------------------------------------------------------------
  // Happy path
  // ----------------------------------------------------------------

  describe('successful extraction', () => {
    it('should use baseId for the profile id instead of generating a timestamp', async () => {
      mockFetch.mockResolvedValue(makeSuccessResponse());
      const { createUserProfileFromFiles } = await import('../fileProcessing');

      const result = await createUserProfileFromFiles(resumeFile, cmfFile, TEST_UUID);

      expect(result.id).toBe(TEST_UUID);
      expect(result.cmf.id).toBe(TEST_UUID);
      expect(result.id).not.toMatch(/^user-\d+$/);
      expect(result.cmf.id).not.toMatch(/^cmf-\d+$/);
    });

    it('should default baseId to "user" when not provided', async () => {
      mockFetch.mockResolvedValue(makeSuccessResponse());
      const { createUserProfileFromFiles } = await import('../fileProcessing');

      const result = await createUserProfileFromFiles(resumeFile, cmfFile);

      expect(result.id).toBe('user');
      expect(result.cmf.id).toBe('user');
    });
  });

  // ----------------------------------------------------------------
  // Transient failures → retry once
  // ----------------------------------------------------------------

  describe('transient failures', () => {
    it('should retry once and return the profile when the retry succeeds', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce(makeSuccessResponse());
      const { createUserProfileFromFiles } = await import('../fileProcessing');

      const result = await createUserProfileFromFiles(resumeFile, cmfFile, TEST_UUID);

      expect(result.id).toBe(TEST_UUID);
      expect(mockFetch).toHaveBeenCalledTimes(2); // initial attempt + one retry
    });

    it('should throw "temporarily unavailable" when both attempts fail', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'));
      const { createUserProfileFromFiles } = await import('../fileProcessing');

      await expect(
        createUserProfileFromFiles(resumeFile, cmfFile, TEST_UUID)
      ).rejects.toThrow(/temporarily unavailable/i);

      expect(mockFetch).toHaveBeenCalledTimes(2); // initial attempt + one retry
    });

    it('should not return hardcoded generic defaults on transient failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'));
      const { createUserProfileFromFiles } = await import('../fileProcessing');

      // Must throw, not silently return a profile built from regex/placeholder data
      await expect(
        createUserProfileFromFiles(resumeFile, cmfFile, TEST_UUID)
      ).rejects.toThrow();
    });
  });

  // ----------------------------------------------------------------
  // Non-retried errors
  // ----------------------------------------------------------------

  describe('non-retried errors', () => {
    it('should throw quality guidance on low-confidence extraction — no retry', async () => {
      mockFetch.mockResolvedValue(makeQualityErrorResponse());
      const { createUserProfileFromFiles } = await import('../fileProcessing');

      await expect(
        createUserProfileFromFiles(resumeFile, cmfFile, TEST_UUID)
      ).rejects.toThrow(/documents don't contain enough specific information/i);

      expect(mockFetch).toHaveBeenCalledTimes(1); // quality issues are not retried
    });

    it('should throw a config error on API key failure — no retry', async () => {
      mockFetch.mockResolvedValue(makeApiConfigErrorResponse());
      const { createUserProfileFromFiles } = await import('../fileProcessing');

      await expect(
        createUserProfileFromFiles(resumeFile, cmfFile, TEST_UUID)
      ).rejects.toThrow(/configuration issue/i);

      expect(mockFetch).toHaveBeenCalledTimes(1); // config errors are not retried
    });
  });
});
