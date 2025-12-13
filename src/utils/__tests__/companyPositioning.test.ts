/**
 * Tests for companyPositioning utilities
 */

import { generateCareerUrl, resolveCareerUrl } from '../companyPositioning';

describe('generateCareerUrl', () => {
  describe('Full URLs with protocol', () => {
    test('should handle https URL - Bevel Health case', () => {
      expect(generateCareerUrl('Bevel', 'https://bevel.health'))
        .toBe('https://bevel.health/careers');
    });

    test('should handle http URL', () => {
      expect(generateCareerUrl('Company', 'http://example.org'))
        .toBe('https://example.org/careers');
    });

    test('should handle https URL with different TLDs', () => {
      expect(generateCareerUrl('Company', 'https://company.io'))
        .toBe('https://company.io/careers');
      expect(generateCareerUrl('Company', 'https://company.ai'))
        .toBe('https://company.ai/careers');
      expect(generateCareerUrl('Company', 'https://company.bio'))
        .toBe('https://company.bio/careers');
    });
  });

  describe('www prefix handling', () => {
    test('should strip www prefix from URL', () => {
      expect(generateCareerUrl('Stripe', 'https://www.stripe.com'))
        .toBe('https://stripe.com/careers');
    });

    test('should strip www prefix from domain', () => {
      expect(generateCareerUrl('Company', 'www.example.com'))
        .toBe('https://example.com/careers');
    });

    test('should handle www with different TLDs', () => {
      expect(generateCareerUrl('Bevel', 'https://www.bevel.health'))
        .toBe('https://bevel.health/careers');
    });
  });

  describe('Trailing slash handling', () => {
    test('should remove trailing slash from URL', () => {
      expect(generateCareerUrl('Company', 'https://example.com/'))
        .toBe('https://example.com/careers');
    });

    test('should remove trailing slash from domain', () => {
      expect(generateCareerUrl('Company', 'example.com/'))
        .toBe('https://example.com/careers');
    });
  });

  describe('Clean domain (no protocol)', () => {
    test('should handle clean domain', () => {
      expect(generateCareerUrl('Bevel', 'bevel.health'))
        .toBe('https://bevel.health/careers');
    });

    test('should handle clean domain with different TLDs', () => {
      expect(generateCareerUrl('Company', 'example.io'))
        .toBe('https://example.io/careers');
      expect(generateCareerUrl('Company', 'example.ai'))
        .toBe('https://example.ai/careers');
    });
  });

  describe('URL with path (should extract domain only)', () => {
    test('should extract domain from URL with path', () => {
      expect(generateCareerUrl('Company', 'https://example.com/about'))
        .toBe('https://example.com/careers');
    });

    test('should extract domain from URL with deep path', () => {
      expect(generateCareerUrl('Company', 'https://example.com/about/team/engineering'))
        .toBe('https://example.com/careers');
    });

    test('should extract domain from URL with query params', () => {
      expect(generateCareerUrl('Company', 'https://example.com/page?ref=source'))
        .toBe('https://example.com/careers');
    });
  });

  describe('Subdomain handling (trust LLM)', () => {
    test('should preserve career-related subdomains', () => {
      expect(generateCareerUrl('Company', 'https://jobs.company.com'))
        .toBe('https://jobs.company.com/careers');
      expect(generateCareerUrl('Company', 'https://careers.company.com'))
        .toBe('https://careers.company.com/careers');
    });

    test('should preserve other subdomains (trust LLM)', () => {
      // If LLM returns these, assume intentional
      expect(generateCareerUrl('Company', 'https://my.company.health'))
        .toBe('https://my.company.health/careers');
      expect(generateCareerUrl('Company', 'https://app.company.com'))
        .toBe('https://app.company.com/careers');
    });
  });

  describe('Fallback to company name', () => {
    test('should fall back to .com when no domain provided', () => {
      expect(generateCareerUrl('Bevel', undefined))
        .toBe('https://bevel.com/careers');
    });

    test('should normalize company name in fallback', () => {
      expect(generateCareerUrl('My Company', undefined))
        .toBe('https://mycompany.com/careers');
    });

    test('should handle special characters in company name', () => {
      expect(generateCareerUrl('Company & Co.', undefined))
        .toBe('https://companyco.com/careers');
    });
  });

  describe('Edge cases', () => {
    test('should handle empty string domain', () => {
      expect(generateCareerUrl('Company', ''))
        .toBe('https://company.com/careers');
    });

    test('should handle domain with multiple www-like prefixes', () => {
      // Only strips the first www.
      expect(generateCareerUrl('Company', 'www.www.example.com'))
        .toBe('https://www.example.com/careers');
    });
  });
});

describe('resolveCareerUrl', () => {
  describe('Priority system', () => {
    test('should prioritize extraction API career URL', () => {
      const result = resolveCareerUrl(
        'https://greenhouse.io/company',  // Extraction API
        'https://company.com/join',        // Analysis API
        'Company',
        'company.com'
      );
      expect(result).toBe('https://greenhouse.io/company');
    });

    test('should use analysis API if extraction is undefined', () => {
      const result = resolveCareerUrl(
        undefined,                          // Extraction API
        'https://company.com/join',        // Analysis API
        'Company',
        'company.com'
      );
      expect(result).toBe('https://company.com/join');
    });

    test('should generate fallback if both APIs undefined', () => {
      const result = resolveCareerUrl(
        undefined,        // Extraction API
        undefined,        // Analysis API
        'Bevel',
        'bevel.health'
      );
      expect(result).toBe('https://bevel.health/careers');
    });

    test('should use domain in fallback generation', () => {
      const result = resolveCareerUrl(
        undefined,
        undefined,
        'Bevel',
        'https://bevel.health'  // Should extract clean domain
      );
      expect(result).toBe('https://bevel.health/careers');
    });

    test('should fall back to company name if no domain', () => {
      const result = resolveCareerUrl(
        undefined,
        undefined,
        'Bevel',
        undefined
      );
      expect(result).toBe('https://bevel.com/careers');
    });
  });
});
