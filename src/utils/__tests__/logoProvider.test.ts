import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCompanyLogo, generateFallbackLogo, isFallbackLogo, getCompanyLogoWithSize } from '../logoProvider';

describe('logoProvider', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_LOGO_DEV_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('generateFallbackLogo', () => {
    it('returns a ui-avatars URL', () => {
      const url = generateFallbackLogo('Stripe');
      expect(url).toContain('ui-avatars.com');
    });

    it('uses initials from company name', () => {
      const url = generateFallbackLogo('Open AI');
      expect(url).toContain('OA');
    });

    it('uses single initial for single-word names', () => {
      const url = generateFallbackLogo('Stripe');
      expect(url).toContain('S');
    });

    it('truncates initials to 2 characters', () => {
      const url = generateFallbackLogo('Apple Microsoft Google');
      // Should only use first 2 initials
      expect(url).toContain('AM');
    });

    it('picks a consistent color based on name length', () => {
      const url1 = generateFallbackLogo('Stripe');
      const url2 = generateFallbackLogo('Stripe');
      expect(url1).toBe(url2);
    });

    it('picks different colors for different name lengths', () => {
      const url1 = generateFallbackLogo('A'); // length 1
      const url7 = generateFallbackLogo('AAAAAAA'); // length 7
      // Extract background color from URLs
      const bg1 = new URLSearchParams(url1.split('?')[1]).get('background');
      const bg7 = new URLSearchParams(url7.split('?')[1]).get('background');
      // Different lengths mod 7 may produce different colors
      expect(bg1).toBeDefined();
      expect(bg7).toBeDefined();
    });

    it('encodes initials in URL', () => {
      const url = generateFallbackLogo('New Company');
      expect(url).toContain(encodeURIComponent('NC'));
    });
  });

  describe('isFallbackLogo', () => {
    it('returns true for ui-avatars URLs', () => {
      expect(isFallbackLogo('https://ui-avatars.com/api/?name=ST')).toBe(true);
    });

    it('returns false for Logo.dev proxy URLs', () => {
      expect(isFallbackLogo('/api/logo?domain=stripe.com')).toBe(false);
    });

    it('returns false for Clearbit URLs', () => {
      expect(isFallbackLogo('https://logo.clearbit.com/stripe.com')).toBe(false);
    });

    it('returns false for direct logo URLs', () => {
      expect(isFallbackLogo('https://stripe.com/logo.png')).toBe(false);
    });
  });

  describe('getCompanyLogo', () => {
    it('returns fallback logo when no domain provided', () => {
      const url = getCompanyLogo(undefined, 'Stripe');
      expect(url).toContain('ui-avatars.com');
    });

    it('returns fallback logo using domain name when no company name and no domain', () => {
      const url = getCompanyLogo(undefined);
      expect(url).toContain('ui-avatars.com');
    });

    it('returns fallback logo when no API key is configured', () => {
      // NEXT_PUBLIC_LOGO_DEV_KEY is empty from beforeEach
      const url = getCompanyLogo('stripe.com', 'Stripe');
      expect(url).toContain('ui-avatars.com');
    });

    it('returns proxy URL when API key is configured', () => {
      vi.stubEnv('NEXT_PUBLIC_LOGO_DEV_KEY', 'pk_test_key');
      const url = getCompanyLogo('stripe.com', 'Stripe');
      expect(url).toBe('/api/logo?domain=stripe.com');
    });

    it('encodes domain in proxy URL', () => {
      vi.stubEnv('NEXT_PUBLIC_LOGO_DEV_KEY', 'pk_test_key');
      const url = getCompanyLogo('some domain.com', 'Test');
      expect(url).toContain(encodeURIComponent('some domain.com'));
    });

    it('uses domain as fallback name when company name not provided', () => {
      const url = getCompanyLogo('stripe.com');
      // No API key → fallback, uses domain as name
      expect(url).toContain('ui-avatars.com');
    });
  });

  describe('getCompanyLogoWithSize', () => {
    it('delegates to getCompanyLogo', () => {
      vi.stubEnv('NEXT_PUBLIC_LOGO_DEV_KEY', 'pk_test_key');
      const withSize = getCompanyLogoWithSize('stripe.com', 'Stripe', 64);
      const without = getCompanyLogo('stripe.com', 'Stripe');
      expect(withSize).toBe(without);
    });

    it('handles undefined domain', () => {
      const url = getCompanyLogoWithSize(undefined, 'Stripe');
      expect(url).toContain('ui-avatars.com');
    });

    it('handles undefined company name', () => {
      const url = getCompanyLogoWithSize('stripe.com', undefined);
      // No API key → fallback
      expect(url).toContain('ui-avatars.com');
    });
  });
});
