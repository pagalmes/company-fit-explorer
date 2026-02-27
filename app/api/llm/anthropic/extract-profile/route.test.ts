import { describe, test, expect } from 'vitest';
import { isPDF, calculateCost, parseProfileResponse } from './utils';

// Minimal valid extraction result for reuse across tests
const validResult = {
  name: 'Jane Smith',
  targetRole: 'Senior Product Manager - AI/ML',
  targetCompanies: 'Series B-D AI/ML startups in San Francisco',
  mustHaves: [
    { short: 'Remote-First Culture', detailed: 'A company that embraces remote work as a first-class option with async communication and flexible hours' },
    { short: 'AI/ML Product Focus', detailed: 'Working on products that leverage machine learning and AI as core differentiators, not just features' },
    { short: 'Strong Engineering Culture', detailed: 'High engineering standards with code reviews, testing culture, and investment in technical excellence' },
  ],
  wantToHave: [
    { short: 'Equity Package', detailed: 'Meaningful equity stake with transparent vesting schedule and potential for significant upside' },
    { short: 'Conference Budget', detailed: 'Budget to attend and speak at industry conferences to stay current and build network' },
  ],
  experience: ['Product Management', 'AI/ML Products', 'Python/Django', 'Team Leadership (10+)', 'Startup 0-1 Products'],
  extractionConfidence: 'high' as const,
  extractionIssues: [],
};

describe('isPDF', () => {
  test('returns true for application/pdf', () => {
    expect(isPDF('application/pdf')).toBe(true);
  });

  test('returns true for mime types containing "pdf"', () => {
    expect(isPDF('application/x-pdf')).toBe(true);
  });

  test('returns false for text/plain', () => {
    expect(isPDF('text/plain')).toBe(false);
  });

  test('returns false for docx', () => {
    expect(isPDF('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(false);
  });
});

describe('calculateCost', () => {
  test('returns 0 for zero tokens', () => {
    expect(calculateCost(0, 0)).toBe(0);
  });

  test('calculates input cost at $5 per million tokens', () => {
    expect(calculateCost(1_000_000, 0)).toBeCloseTo(5);
  });

  test('calculates output cost at $25 per million tokens', () => {
    expect(calculateCost(0, 1_000_000)).toBeCloseTo(25);
  });

  test('combines input and output costs correctly', () => {
    // 500k input = $2.50, 200k output = $5.00
    expect(calculateCost(500_000, 200_000)).toBeCloseTo(7.5);
  });

  test('handles fractional token counts', () => {
    expect(calculateCost(100, 100)).toBeGreaterThan(0);
  });
});

describe('parseProfileResponse', () => {
  test('parses a valid high-confidence result', () => {
    const result = parseProfileResponse(JSON.stringify(validResult));
    expect(result.name).toBe('Jane Smith');
    expect(result.targetRole).toBe('Senior Product Manager - AI/ML');
    expect(result.extractionConfidence).toBe('high');
    expect(result.extractionIssues).toHaveLength(0);
  });

  test('parses a medium-confidence result with issues', () => {
    const mediumResult = {
      ...validResult,
      extractionConfidence: 'medium' as const,
      extractionIssues: ['targetRole was inferred from job titles — no explicit target stated'],
    };
    const result = parseProfileResponse(JSON.stringify(mediumResult));
    expect(result.extractionConfidence).toBe('medium');
    expect(result.extractionIssues).toHaveLength(1);
  });

  test('parses a low-confidence result', () => {
    const lowResult = {
      ...validResult,
      extractionConfidence: 'low' as const,
      extractionIssues: [
        'targetRole defaulted — resume contains no job titles or objectives',
        'targetCompanies not found — no company preferences in career goals',
        'mustHaves are inferred — no explicit requirements listed',
      ],
    };
    const result = parseProfileResponse(JSON.stringify(lowResult));
    expect(result.extractionConfidence).toBe('low');
    expect(result.extractionIssues).toHaveLength(3);
  });

  test('preserves all CMF item fields', () => {
    const result = parseProfileResponse(JSON.stringify(validResult));
    expect(result.mustHaves[0]).toEqual({
      short: 'Remote-First Culture',
      detailed: 'A company that embraces remote work as a first-class option with async communication and flexible hours',
    });
  });

  test('throws on invalid JSON', () => {
    expect(() => parseProfileResponse('not json at all')).toThrow('Failed to parse profile extraction response');
  });

  test('throws on empty string', () => {
    expect(() => parseProfileResponse('')).toThrow('Failed to parse profile extraction response');
  });
});
