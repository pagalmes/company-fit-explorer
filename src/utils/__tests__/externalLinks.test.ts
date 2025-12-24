/**
 * External Links Utility Tests
 *
 * Tests for on-the-fly generation of external research links
 */

import { describe, it, expect } from 'vitest';
import { generateExternalLinks, getExternalLinks } from '../externalLinks';
import { Company } from '../../types';

describe('External Links Utility', () => {
  const mockCompany: Company = {
    id: 1,
    name: 'Test Company',
    industry: 'Technology',
    stage: 'Series B',
    employees: '100-500',
    location: 'San Francisco',
    remote: 'Hybrid',
    matchScore: 85,
    matchReasons: ['Great tech stack'],
    color: '#3b82f6',
    connections: [],
    connectionTypes: {},
    logo: 'https://example.com/logo.png',
    careerUrl: 'https://testcompany.com/careers',
    openRoles: 10
  };

  describe('generateExternalLinks', () => {
    it('should generate all external links from company data', () => {
      const links = generateExternalLinks(mockCompany);

      expect(links).toHaveProperty('website');
      expect(links).toHaveProperty('linkedin');
      expect(links).toHaveProperty('glassdoor');
      expect(links).toHaveProperty('crunchbase');
    });

    it('should extract root domain from careerUrl', () => {
      const links = generateExternalLinks(mockCompany);

      expect(links.website).toBe('https://testcompany.com');
    });

    it('should strip subdomain from careerUrl (e.g., careers.airbnb.com -> airbnb.com)', () => {
      const airbnb = {
        ...mockCompany,
        name: 'Airbnb',
        careerUrl: 'https://careers.airbnb.com/positions'
      };
      const links = generateExternalLinks(airbnb);

      expect(links.website).toBe('https://airbnb.com');
    });

    it('should generate Google search URLs for platforms', () => {
      const links = generateExternalLinks(mockCompany);

      expect(links.linkedin).toContain('google.com/search');
      expect(links.linkedin).toContain('Test+Company+on+LinkedIn');

      expect(links.glassdoor).toContain('google.com/search');
      expect(links.glassdoor).toContain('Test+Company+on+Glassdoor');

      expect(links.crunchbase).toContain('google.com/search');
      expect(links.crunchbase).toContain('Test+Company+on+Crunchbase');
    });

    it('should handle companies without careerUrl', () => {
      const companyWithoutCareerUrl = { ...mockCompany, careerUrl: '' };
      const links = generateExternalLinks(companyWithoutCareerUrl);

      expect(links.website).toBeUndefined();
      expect(links.linkedin).toBeDefined();
      expect(links.glassdoor).toBeDefined();
      expect(links.crunchbase).toBeDefined();
    });

    it('should handle invalid careerUrl gracefully', () => {
      const companyWithInvalidUrl = { ...mockCompany, careerUrl: 'not-a-valid-url' };
      const links = generateExternalLinks(companyWithInvalidUrl);

      expect(links.website).toBeUndefined();
      expect(links.linkedin).toBeDefined();
    });

    it('should properly encode company names with special characters', () => {
      const specialCompany = { ...mockCompany, name: 'Test & Co.' };
      const links = generateExternalLinks(specialCompany);

      expect(links.linkedin).toContain('Test+%26+Co.');
    });
  });

  describe('getExternalLinks', () => {
    it('should return existing external links if present', () => {
      const existingLinks = {
        website: 'https://custom.com',
        linkedin: 'https://linkedin.com/company/custom',
        glassdoor: 'https://glassdoor.com/custom',
        crunchbase: 'https://crunchbase.com/custom'
      };

      const companyWithLinks = { ...mockCompany, externalLinks: existingLinks };
      const links = getExternalLinks(companyWithLinks);

      expect(links).toEqual(existingLinks);
    });

    it('should generate links if externalLinks is missing', () => {
      const companyWithoutLinks = { ...mockCompany };
      const links = getExternalLinks(companyWithoutLinks);

      expect(links).toHaveProperty('website');
      expect(links).toHaveProperty('linkedin');
      expect(links).toHaveProperty('glassdoor');
      expect(links).toHaveProperty('crunchbase');
      expect(links.website).toBe('https://testcompany.com');
    });

    it('should generate links if externalLinks is empty', () => {
      const companyWithEmptyLinks = { ...mockCompany, externalLinks: {} };
      const links = getExternalLinks(companyWithEmptyLinks);

      expect(links.linkedin).toContain('google.com/search');
    });

    it('should preserve partial external links and use existing values', () => {
      const partialLinks = {
        website: 'https://custom.com'
      };

      const companyWithPartialLinks = { ...mockCompany, externalLinks: partialLinks };
      const links = getExternalLinks(companyWithPartialLinks);

      // Should return existing links as-is
      expect(links).toEqual(partialLinks);
    });
  });

  describe('Real-world scenarios', () => {
    it('should work for company with standard domain', () => {
      const stripe: Company = {
        id: 2,
        name: 'Stripe',
        industry: 'Fintech',
        stage: 'Public',
        employees: '5000+',
        location: 'San Francisco',
        remote: 'Hybrid',
        matchScore: 90,
        matchReasons: [],
        color: '#635bff',
        connections: [],
        connectionTypes: {},
        logo: 'https://logo.dev/stripe.com',
        careerUrl: 'https://stripe.com/jobs',
        openRoles: 50
      };

      const links = generateExternalLinks(stripe);

      expect(links.website).toBe('https://stripe.com');
      expect(links.linkedin).toContain('Stripe+on+LinkedIn');
    });

    it('should strip subdomain careers page to get root domain', () => {
      const figma: Company = {
        id: 3,
        name: 'Figma',
        industry: 'Design',
        stage: 'Acquired',
        employees: '1000+',
        location: 'San Francisco',
        remote: 'Remote-first',
        matchScore: 88,
        matchReasons: [],
        color: '#f24e1e',
        connections: [],
        connectionTypes: {},
        logo: 'https://logo.dev/figma.com',
        careerUrl: 'https://careers.figma.com',
        openRoles: 30
      };

      const links = generateExternalLinks(figma);

      // Should extract root domain, not subdomain
      expect(links.website).toBe('https://figma.com');
    });

    it('should handle company names with spaces', () => {
      const credo: Company = {
        id: 4,
        name: 'Credo AI',
        industry: 'AI/ML',
        stage: 'Series A',
        employees: '50-100',
        location: 'Remote',
        remote: 'Remote-first',
        matchScore: 92,
        matchReasons: [],
        color: '#10b981',
        connections: [],
        connectionTypes: {},
        logo: 'https://logo.dev/credo.ai',
        careerUrl: 'https://credo.ai/careers',
        openRoles: 8
      };

      const links = generateExternalLinks(credo);

      expect(links.website).toBe('https://credo.ai');
      expect(links.linkedin).toContain('Credo+AI+on+LinkedIn');
    });
  });
});
