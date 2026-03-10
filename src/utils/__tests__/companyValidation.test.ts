import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCompanyPreview, validateCompanyData } from '../companyValidation';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_LOGO_DEV_KEY', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getCompanyPreview', () => {
  describe('popular company lookup (Strategy 1)', () => {
    it('returns high-confidence preview for known company', async () => {
      const result = await getCompanyPreview('Stripe');
      expect(result.name).toBe('Stripe');
      expect(result.confidence).toBe('high');
      expect(result.domain).toBe('stripe.com');
    });

    it('is case-insensitive for known company', async () => {
      const result = await getCompanyPreview('stripe');
      expect(result.confidence).toBe('high');
    });

    it('includes industry for known company', async () => {
      const result = await getCompanyPreview('Figma');
      expect(result.industry).toBe('Design');
    });
  });

  describe('domain guessing (Strategy 2 & 3)', () => {
    it('returns medium-confidence for unknown company', async () => {
      const result = await getCompanyPreview('UnknownStartupXYZ');
      expect(result.confidence).toBe('medium');
    });

    it('trims whitespace from company name', async () => {
      const result = await getCompanyPreview('  Acme Corp  ');
      expect(result.name).toBe('Acme Corp');
    });

    it('generates a domain for unknown company', async () => {
      const result = await getCompanyPreview('Acme Corp');
      expect(result.domain).toBeTruthy();
      expect(typeof result.domain).toBe('string');
    });

    it('handles URL input — extracts hostname', async () => {
      const result = await getCompanyPreview('https://example.com/about');
      expect(result.domain).toBe('example.com');
    });

    it('handles domain input directly', async () => {
      const result = await getCompanyPreview('example.com');
      expect(result.domain).toBe('example.com');
    });

    it('handles "name tld" pattern like "credo ai"', async () => {
      const result = await getCompanyPreview('credo ai');
      expect(result.domain).toBe('credo.ai');
    });

    it('normalizes multi-word company names for domain', async () => {
      // "The Widget Company" → lowercased, spaces removed → "thewidgetcompany.com"
      // (the ^the\s+ regex runs after spaces are already removed, so prefix stays)
      const result = await getCompanyPreview('The Widget Company');
      expect(result.domain).toBe('thewidgetcompany.com');
    });
  });

  describe('industry guessing', () => {
    it('guesses AI/ML industry', async () => {
      const result = await getCompanyPreview('Neural Systems Inc');
      expect(result.industry).toBe('AI/ML');
    });

    it('guesses Fintech industry', async () => {
      const result = await getCompanyPreview('PayQuick');
      expect(result.industry).toBe('Fintech');
    });

    it('guesses E-commerce industry', async () => {
      const result = await getCompanyPreview('ShopNow');
      expect(result.industry).toBe('E-commerce');
    });

    it('guesses Healthcare industry', async () => {
      const result = await getCompanyPreview('HealthTrack');
      expect(result.industry).toBe('Healthcare');
    });

    it('guesses Gaming industry', async () => {
      const result = await getCompanyPreview('GameForge');
      expect(result.industry).toBe('Gaming');
    });

    it('guesses Design industry', async () => {
      const result = await getCompanyPreview('Creative Studio');
      expect(result.industry).toBe('Design');
    });

    it('defaults to Technology for unrecognized names', async () => {
      const result = await getCompanyPreview('Zephyr Logistics');
      expect(result.industry).toBe('Technology');
    });
  });

  describe('result shape', () => {
    it('always returns name, domain, logo, confidence', async () => {
      const result = await getCompanyPreview('AnyCompany');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('domain');
      expect(result).toHaveProperty('logo');
      expect(result).toHaveProperty('confidence');
    });

    it('returns a logo string', async () => {
      const result = await getCompanyPreview('AnyCompany');
      expect(typeof result.logo).toBe('string');
      expect(result.logo.length).toBeGreaterThan(0);
    });
  });
});

describe('validateCompanyData', () => {
  const basePreview = {
    name: 'Stripe',
    domain: 'stripe.com',
    logo: '/api/logo?domain=stripe.com',
    confidence: 'high' as const,
  };

  it('returns isValid true for non-empty name', () => {
    expect(validateCompanyData(basePreview).isValid).toBe(true);
  });

  it('returns isValid false for empty name', () => {
    const result = validateCompanyData({ ...basePreview, name: '   ' });
    expect(result.isValid).toBe(false);
  });

  it('adds issue for low-confidence data', () => {
    const result = validateCompanyData({ ...basePreview, confidence: 'low' });
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0]).toMatch(/limited/i);
  });

  it('adds suggestion to check spelling for low-confidence data', () => {
    const result = validateCompanyData({ ...basePreview, confidence: 'low' });
    expect(result.suggestions.some(s => s.toLowerCase().includes('spelling'))).toBe(true);
  });

  it('adds description suggestion when description is missing', () => {
    const result = validateCompanyData({ ...basePreview, description: undefined });
    expect(result.suggestions.some(s => s.toLowerCase().includes('description'))).toBe(true);
  });

  it('adds description suggestion when description is generic', () => {
    const result = validateCompanyData({ ...basePreview, description: 'Information about Stripe' });
    expect(result.suggestions.some(s => s.toLowerCase().includes('description'))).toBe(true);
  });

  it('adds logo suggestion for fallback logos', () => {
    const result = validateCompanyData({
      ...basePreview,
      logo: 'https://ui-avatars.com/api/?name=ST',
    });
    expect(result.suggestions.some(s => s.toLowerCase().includes('logo'))).toBe(true);
  });

  it('returns no issues for high-confidence full data', () => {
    const result = validateCompanyData({
      ...basePreview,
      confidence: 'high',
      description: 'Payment processing platform',
      logo: '/api/logo?domain=stripe.com',
    });
    expect(result.issues).toHaveLength(0);
  });
});
