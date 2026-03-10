import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCompanySuggestions,
  getPopularCompanies,
  isPopularCompany,
  getCompanyByName,
} from '../companySuggestions';

// logoProvider calls process.env — stub key so we get deterministic fallback URLs
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_LOGO_DEV_KEY', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getCompanySuggestions', () => {
  it('returns empty array for queries shorter than 2 characters', async () => {
    expect(await getCompanySuggestions('')).toEqual([]);
    expect(await getCompanySuggestions('a')).toEqual([]);
  });

  it('returns matching companies for a valid query', async () => {
    const results = await getCompanySuggestions('stripe');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('Stripe');
  });

  it('returns at most 5 results', async () => {
    // 'ai' matches many companies
    const results = await getCompanySuggestions('ai');
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('sorts exact name-starts-with matches first', async () => {
    const results = await getCompanySuggestions('git');
    const names = results.map(r => r.name);
    // GitHub and GitLab both start with 'git', should come first
    expect(names[0].toLowerCase()).toMatch(/^git/);
  });

  it('matches on industry', async () => {
    const results = await getCompanySuggestions('fintech');
    expect(results.some(r => r.industry === 'Fintech')).toBe(true);
  });

  it('matches on description', async () => {
    const results = await getCompanySuggestions('payment');
    expect(results.length).toBeGreaterThan(0);
  });

  it('is case-insensitive', async () => {
    const lower = await getCompanySuggestions('stripe');
    const upper = await getCompanySuggestions('STRIPE');
    expect(lower.map(r => r.name)).toEqual(upper.map(r => r.name));
  });

  it('returns empty array when no matches found', async () => {
    const results = await getCompanySuggestions('zzznomatch999');
    expect(results).toEqual([]);
  });

  it('each result has required fields', async () => {
    const results = await getCompanySuggestions('stripe');
    for (const r of results) {
      expect(r).toHaveProperty('name');
      expect(r).toHaveProperty('logo');
      expect(r).toHaveProperty('industry');
      expect(r).toHaveProperty('description');
      expect(r).toHaveProperty('domain');
    }
  });

  it('returns logo string for each result', async () => {
    const results = await getCompanySuggestions('stripe');
    for (const r of results) {
      expect(typeof r.logo).toBe('string');
      expect(r.logo.length).toBeGreaterThan(0);
    }
  });
});

describe('getPopularCompanies', () => {
  it('returns 6 companies by default', () => {
    const results = getPopularCompanies();
    expect(results).toHaveLength(6);
  });

  it('returns requested count', () => {
    expect(getPopularCompanies(3)).toHaveLength(3);
    expect(getPopularCompanies(10)).toHaveLength(10);
  });

  it('each result has required fields', () => {
    const results = getPopularCompanies(1);
    const r = results[0];
    expect(r).toHaveProperty('name');
    expect(r).toHaveProperty('logo');
    expect(r).toHaveProperty('industry');
    expect(r).toHaveProperty('description');
    expect(r).toHaveProperty('domain');
  });

  it('returns different results on different calls (randomized)', () => {
    // Run many times — statistically very unlikely to get same order every time
    const results: string[][] = [];
    for (let i = 0; i < 10; i++) {
      results.push(getPopularCompanies(6).map(r => r.name));
    }
    const uniqueOrders = new Set(results.map(r => r.join(',')));
    // With 40+ companies and 6 slots, getting the same order 10 times is astronomically unlikely
    expect(uniqueOrders.size).toBeGreaterThan(1);
  });
});

describe('isPopularCompany', () => {
  it('returns true for known companies (exact match)', () => {
    expect(isPopularCompany('Stripe')).toBe(true);
    expect(isPopularCompany('GitHub')).toBe(true);
    expect(isPopularCompany('Figma')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isPopularCompany('stripe')).toBe(true);
    expect(isPopularCompany('STRIPE')).toBe(true);
    expect(isPopularCompany('StRiPe')).toBe(true);
  });

  it('returns false for unknown companies', () => {
    expect(isPopularCompany('MyRandomStartup')).toBe(false);
    expect(isPopularCompany('')).toBe(false);
  });

  it('returns false for partial matches', () => {
    expect(isPopularCompany('Str')).toBe(false);
  });

  it('trims whitespace', () => {
    expect(isPopularCompany('  Stripe  ')).toBe(true);
  });
});

describe('getCompanyByName', () => {
  it('returns company info for known company', () => {
    const result = getCompanyByName('Stripe');
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Stripe');
    expect(result?.domain).toBe('stripe.com');
  });

  it('is case-insensitive', () => {
    expect(getCompanyByName('stripe')).not.toBeNull();
    expect(getCompanyByName('STRIPE')).not.toBeNull();
  });

  it('returns null for unknown company', () => {
    expect(getCompanyByName('NonExistentCorp')).toBeNull();
  });

  it('returns all fields', () => {
    const result = getCompanyByName('Figma');
    expect(result).toMatchObject({
      name: 'Figma',
      logo: expect.any(String),
      industry: expect.any(String),
      description: expect.any(String),
      domain: 'figma.com',
    });
  });

  it('trims whitespace from input', () => {
    expect(getCompanyByName('  Stripe  ')).not.toBeNull();
  });
});
