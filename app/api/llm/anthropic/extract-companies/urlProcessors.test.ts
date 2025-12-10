/**
 * Tests for URL processors
 */

import { processCareerUrl } from './urlProcessors';

describe('URL Processors', () => {
  describe('LinkedIn URLs', () => {
    test('should discard job post URLs', () => {
      const jobPostUrl = 'https://www.linkedin.com/jobs/view/4342954947/?trackingId=abc123';
      expect(processCareerUrl(jobPostUrl, 'Mapbox')).toBeNull();
    });

    test('should discard comm/jobs/view URLs', () => {
      const commJobUrl = 'https://www.linkedin.com/comm/jobs/view/4342954947/?trackingId=abc123&refId=xyz';
      expect(processCareerUrl(commJobUrl, 'Dave')).toBeNull();
    });

    test('should keep and clean company jobs pages', () => {
      const companyJobsUrl = 'https://www.linkedin.com/company/mapbox/jobs?utm_source=email';
      const result = processCareerUrl(companyJobsUrl, 'Mapbox');
      expect(result).toBe('https://www.linkedin.com/company/mapbox/jobs');
    });

    test('should convert company pages to jobs pages', () => {
      const companyPageUrl = 'https://www.linkedin.com/company/stripe';
      const result = processCareerUrl(companyPageUrl, 'Stripe');
      expect(result).toBe('https://www.linkedin.com/company/stripe/jobs');
    });

    test('should convert company pages with trailing slash', () => {
      const companyPageUrl = 'https://www.linkedin.com/company/notion/';
      const result = processCareerUrl(companyPageUrl, 'Notion');
      expect(result).toBe('https://www.linkedin.com/company/notion/jobs');
    });
  });

  describe('Indeed URLs', () => {
    test('should discard job post URLs', () => {
      const jobUrl = 'https://www.indeed.com/viewjob?jk=1234567890&from=email';
      expect(processCareerUrl(jobUrl, 'Company')).toBeNull();
    });

    test('should keep company pages', () => {
      const companyUrl = 'https://www.indeed.com/cmp/Stripe?from=email';
      const result = processCareerUrl(companyUrl, 'Stripe');
      expect(result).toBe('https://www.indeed.com/cmp/Stripe');
    });
  });

  describe('Welcome to the Jungle URLs', () => {
    test('should discard job post URLs', () => {
      const jobUrl = 'https://www.welcometothejungle.com/en/companies/stripe/jobs/senior-engineer_paris';
      expect(processCareerUrl(jobUrl, 'Stripe')).toBeNull();
    });

    test('should keep company pages', () => {
      const companyUrl = 'https://www.welcometothejungle.com/en/companies/stripe?utm_source=newsletter';
      const result = processCareerUrl(companyUrl, 'Stripe');
      expect(result).toBe('https://www.welcometothejungle.com/en/companies/stripe');
    });
  });

  describe('ZipRecruiter URLs', () => {
    test('should discard job post URLs', () => {
      const jobUrl = 'https://www.ziprecruiter.com/c/Stripe/job/12345';
      expect(processCareerUrl(jobUrl, 'Stripe')).toBeNull();
    });

    test('should keep company pages', () => {
      const companyUrl = 'https://www.ziprecruiter.com/c/Stripe?source=email';
      const result = processCareerUrl(companyUrl, 'Stripe');
      expect(result).toBe('https://www.ziprecruiter.com/c/Stripe');
    });
  });

  describe('Generic URLs (company websites)', () => {
    test('should keep direct career page URLs', () => {
      const careerUrl = 'https://stripe.com/jobs?utm_source=linkedin&utm_medium=email';
      const result = processCareerUrl(careerUrl, 'Stripe');
      expect(result).toBe('https://stripe.com/jobs');
    });

    test('should keep company homepages and clean tracking params', () => {
      const homepage = 'https://example.com?ref=jobboard&source=linkedin';
      const result = processCareerUrl(homepage, 'Example');
      expect(result).toBe('https://example.com/');
    });

    test('should handle URLs without tracking params', () => {
      const cleanUrl = 'https://stripe.com/careers';
      const result = processCareerUrl(cleanUrl, 'Stripe');
      expect(result).toBe('https://stripe.com/careers');
    });
  });

  describe('Edge cases', () => {
    test('should handle invalid URLs gracefully', () => {
      const invalidUrl = 'not-a-url';
      const result = processCareerUrl(invalidUrl, 'Company');
      expect(result).toBe('not-a-url'); // Returns original on parse failure
    });

    test('should handle empty company name', () => {
      const url = 'https://www.linkedin.com/jobs/view/123';
      const result = processCareerUrl(url);
      expect(result).toBeNull();
    });
  });
});
