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
    vi.clearAllMocks();
    // Simulate a transient network failure so the function falls back to regex extraction.
    // Must NOT contain "API" or "ANTHROPIC_API_KEY" — those trigger the API-config error path
    // which throws rather than falling back.
    mockFetch.mockRejectedValue(new Error('Network timeout'));
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
});
