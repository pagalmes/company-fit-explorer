import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { migrateLogoURL, migrateCompanyLogo, migrateCompanyLogos, needsMigration } from '../logoMigration';
import type { Company } from '../../types';

// No API key → getCompanyLogo returns fallback
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_LOGO_DEV_KEY', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const baseCompany: Company = {
  id: 1,
  name: 'Stripe',
  industry: 'Fintech',
  stage: 'Public',
  employees: '1000+',
  location: 'San Francisco',
  remote: 'Hybrid',
  matchScore: 90,
  matchReasons: [],
  color: '#3b82f6',
  connections: [],
  connectionTypes: {},
  logo: 'https://logo.clearbit.com/stripe.com',
  careerUrl: 'https://stripe.com/jobs',
  openRoles: 5,
};

describe('migrateLogoURL', () => {
  it('leaves proxy URLs unchanged', () => {
    const url = '/api/logo?domain=stripe.com';
    expect(migrateLogoURL(url, 'Stripe')).toBe(url);
  });

  it('leaves fallback (ui-avatars) URLs unchanged', () => {
    const url = 'https://ui-avatars.com/api/?name=ST&background=3B82F6';
    expect(migrateLogoURL(url, 'Stripe')).toBe(url);
  });

  it('converts Logo.dev direct URL to proxy format (no API key → fallback)', () => {
    const url = 'https://img.logo.dev/stripe.com?token=pk_abc&format=png';
    const result = migrateLogoURL(url, 'Stripe');
    // Without API key, falls back to ui-avatars
    expect(result).toContain('ui-avatars.com');
  });

  it('converts Logo.dev direct URL to proxy format (with API key)', () => {
    vi.stubEnv('NEXT_PUBLIC_LOGO_DEV_KEY', 'pk_test');
    const url = 'https://img.logo.dev/stripe.com?token=pk_abc&format=png';
    const result = migrateLogoURL(url, 'Stripe');
    expect(result).toBe('/api/logo?domain=stripe.com');
  });

  it('converts Clearbit URL to proxy format (with API key)', () => {
    vi.stubEnv('NEXT_PUBLIC_LOGO_DEV_KEY', 'pk_test');
    const url = 'https://logo.clearbit.com/stripe.com';
    const result = migrateLogoURL(url, 'Stripe');
    expect(result).toBe('/api/logo?domain=stripe.com');
  });

  it('handles Clearbit URL with query params', () => {
    vi.stubEnv('NEXT_PUBLIC_LOGO_DEV_KEY', 'pk_test');
    const url = 'https://logo.clearbit.com/stripe.com?size=128';
    const result = migrateLogoURL(url, 'Stripe');
    expect(result).toBe('/api/logo?domain=stripe.com');
  });

  it('falls back to fallback logo for unrecognized URLs', () => {
    const url = 'https://unknown-logo-service.com/logo.png';
    const result = migrateLogoURL(url, 'Stripe');
    expect(result).toContain('ui-avatars.com');
  });

  it('uses company name in fallback for unrecognized URLs', () => {
    const url = 'https://unknown-logo-service.com/logo.png';
    const result = migrateLogoURL(url);
    expect(result).toContain('ui-avatars.com');
  });
});

describe('migrateCompanyLogo', () => {
  it('updates Clearbit logo to proxy URL (with API key)', () => {
    vi.stubEnv('NEXT_PUBLIC_LOGO_DEV_KEY', 'pk_test');
    const result = migrateCompanyLogo(baseCompany);
    expect(result.logo).toBe('/api/logo?domain=stripe.com');
  });

  it('preserves all other company fields', () => {
    const result = migrateCompanyLogo(baseCompany);
    expect(result.id).toBe(baseCompany.id);
    expect(result.name).toBe(baseCompany.name);
    expect(result.careerUrl).toBe(baseCompany.careerUrl);
  });

  it('upgrades fallback avatar using careerUrl domain (with API key)', () => {
    vi.stubEnv('NEXT_PUBLIC_LOGO_DEV_KEY', 'pk_test');
    const company: Company = {
      ...baseCompany,
      logo: 'https://ui-avatars.com/api/?name=ST',
      careerUrl: 'https://stripe.com/jobs',
    };
    const result = migrateCompanyLogo(company);
    expect(result.logo).toBe('/api/logo?domain=stripe.com');
  });

  it('keeps fallback logo if careerUrl is unparseable', () => {
    const company: Company = {
      ...baseCompany,
      logo: 'https://ui-avatars.com/api/?name=ST',
      careerUrl: 'not-a-url',
    };
    const result = migrateCompanyLogo(company);
    // No valid domain → stays as fallback or re-generates fallback
    expect(result.logo).toContain('ui-avatars.com');
  });

  it('leaves proxy URL unchanged', () => {
    const company: Company = { ...baseCompany, logo: '/api/logo?domain=stripe.com' };
    const result = migrateCompanyLogo(company);
    expect(result.logo).toBe('/api/logo?domain=stripe.com');
  });
});

describe('migrateCompanyLogos', () => {
  it('migrates all companies in array', () => {
    vi.stubEnv('NEXT_PUBLIC_LOGO_DEV_KEY', 'pk_test');
    const companies: Company[] = [
      { ...baseCompany, id: 1, logo: 'https://logo.clearbit.com/stripe.com' },
      { ...baseCompany, id: 2, logo: 'https://logo.clearbit.com/github.com' },
    ];
    const result = migrateCompanyLogos(companies);
    expect(result).toHaveLength(2);
    expect(result[0].logo).toBe('/api/logo?domain=stripe.com');
    expect(result[1].logo).toBe('/api/logo?domain=github.com');
  });

  it('returns empty array for empty input', () => {
    expect(migrateCompanyLogos([])).toEqual([]);
  });
});

describe('needsMigration', () => {
  it('returns true for Clearbit URLs', () => {
    expect(needsMigration('https://logo.clearbit.com/stripe.com')).toBe(true);
  });

  it('returns true for Logo.dev direct URLs', () => {
    expect(needsMigration('https://img.logo.dev/stripe.com?token=pk_abc')).toBe(true);
  });

  it('returns true for ui-avatars fallback URLs', () => {
    expect(needsMigration('https://ui-avatars.com/api/?name=ST')).toBe(true);
  });

  it('returns false for proxy URLs', () => {
    expect(needsMigration('/api/logo?domain=stripe.com')).toBe(false);
  });

  it('returns false for arbitrary URLs', () => {
    expect(needsMigration('https://stripe.com/logo.png')).toBe(false);
  });
});
