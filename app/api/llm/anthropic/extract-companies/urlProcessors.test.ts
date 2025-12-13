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

  describe('Glassdoor URLs', () => {
    test('should discard Glassdoor job listing URLs', () => {
      const glassdoorUrl = 'https://www.glassdoor.com/partner/jobListing.htm?pos=101&ao=1110586&s=58&guid=0000019b0a118240b7f3a194d7efac32';
      expect(processCareerUrl(glassdoorUrl, 'Company')).toBeNull();
    });
  });

  describe('Email Tracking URLs', () => {
    test('should discard SendGrid tracking URLs', () => {
      const sendgridUrl = 'https://sendgrid.net/ls/click?upn=abc123&ref=xyz';
      expect(processCareerUrl(sendgridUrl, 'Company')).toBeNull();
    });

    test('should discard Google redirect tracking URLs', () => {
      const googleRedirectUrl = 'https://notifications.googleapis.com/email/redirect?t=AFG8qyX4SldJVl39NANU6xXizJWCKeZSw0OFCEmRH9eC3907Baikn7nedsvHv1PBthHCxabOZGU-ZzxzaKUopEwS4pIltlPRJodzH5OSfcCvDB6JyOshyCCRyZaS0oHVqHHzvtJsyEfG7LsiKBJrBWfsDf7kEf2NafSeTEuqOdS7DHVLwyVEnhUGmOK921n7ivhFj2e6U90iTNQ19rdu6pSRGHCdLB3I7ivEkEK4Wqbm8icIDbFn2uqCClxhYPD1eDJWyn6m6hMo&r=eJyNkFFrwjAQxz_MWF9EWxUFlTDm3Dq3FV1tdfoiaXI2qWnTJaeFfvq1vm4PO-44OH78f3ACsbRT162qqpdqnSroMZ27Fqhh4uGbZDqxndJofmHYyWlBU8ihwA6XBhhq48ikJALVrAUdw';
      expect(processCareerUrl(googleRedirectUrl, 'Company')).toBeNull();
    });

    test('should discard Mailchimp/Mandrill tracking URLs', () => {
      const mandrillUrl = 'https://mandrillapp.com/track/click/12345?u=abc';
      expect(processCareerUrl(mandrillUrl, 'Company')).toBeNull();
    });

    test('should discard SparkPost tracking URLs', () => {
      const sparkpostUrl = 'https://spgo.io/abc123/redirect';
      expect(processCareerUrl(sparkpostUrl, 'Company')).toBeNull();
    });

    test('should discard URLs with click tracking subdomains', () => {
      const clickTrackingUrl = 'https://click.email.example.com/track?id=123';
      expect(processCareerUrl(clickTrackingUrl, 'Example')).toBeNull();
    });

    test('should discard URLs with link tracking subdomains', () => {
      const linkTrackingUrl = 'https://link.newsletter.example.com/abc';
      expect(processCareerUrl(linkTrackingUrl, 'Example')).toBeNull();
    });

    test('should discard URLs with mkt/marketing tracking subdomains', () => {
      const mktTrackingUrl = 'https://mkt.example.com/track?campaign=123';
      expect(processCareerUrl(mktTrackingUrl, 'Example')).toBeNull();
    });

    test('should discard URLs with .ct. click tracking pattern', () => {
      const ctTrackingUrl = 'https://u9255466.ct.sendgrid.net/ls/click?upn=abc123';
      expect(processCareerUrl(ctTrackingUrl, 'Company')).toBeNull();
    });

    test('should discard very long URLs (>500 chars) - tracking wrappers', () => {
      // Real-world SendGrid tracking URL example (1,147 chars)
      const longTrackingUrl = 'https://u9255466.ct.sendgrid.net/ls/click?upn=u001.vinfit7V4Y5zoxBeRCELg4wnpQdelHsN-2B76WbOVLl6uSblq0b5ZCODKFvX7lhqzfFDByqJKYvhNhScDf-2F25cCAjMQBWnV9wqGRzQv-2B3U2jzVc4jjgF-2FqAdZmzQ4ugI-2BbWM73OjW0-2FBDq4AfFf3lNj7f-2FCvy7VcWJ5RVV2drhF8Z3WQPv-2FfIBMdd-2B2A1e9m1J9KCrMCCcADRCpHpW68TjAUnhIrD6ZFEPXPf70q-2BCeDNOxtcyLAu3sVQQRpjsC33hWcx-2FqGIWZUVbSxr-2BeDmjROYrgMdDQaCU7gpzThj7by2ATQ-2BVWIRBs9TxeD2gSRlGtIGWRZxQ-2F7Y-2B8R5L5CqBHkckElscbL32Yb-2FtHc4ni-2Bwa9j1rtOYGCpvu2S2NcYowliBPSrcpCns0v7zgvHvrLzBkjzwVXd3PM2lB4m202kSCb4YqtaM8cS8b-2FEuyYEN5KS9pqRrPiwi5U6k1tFmNxncwLt-2B4u1yxAGrwb6N3ORcP1VEFITGujgN-2BPuvpvtZDkeKriV4VHPNISj8TpHWHw8r1P-2BgmZk9INFipl5yNzUe92aAi4o-2BiGi9I95mkSfCmOHHNGhd8O1sEgATLJojRCRXQ3650uLtnNlSTpkZ-2FSG89vvpDs-2Fp6JeNQ5N-2Bilt0wwaj8AASyzvXZdEAyDH-2B1Lg-3D-3D5GBy_rOkfXHSZTxuEkAGQ1SX9XzpyfNl7S8VxIbVrwrFpPFsrLCKRKDlwLDzFOZV87oGeO6VD1b5MDWZKnm0oJvArMkBiSEE0RmMpUhY0Q2tARYaf7N1M3T6lHkY01NMMFq8cruIDmFW3hVbezhQRXaiZ-2BHkw-2BjCvnRQuieO5tiPrkHZWOsvzB0rJw-2FJJ0Yw3VD8HeUP8s-2FAobTKQU-2BBQ3DUL-2BbhAojAutYwWayuM0Lo-2FnA7H4aQ-2FN0OqcA31iVElc2xjLchqGZeV8m3OZgo7EwNMO7Sz97Zq-2FDJjImGYZAyOoePcQq-2FCNNCTX9GAMAsPBtzbEsemdia20dONLsC2SkWanfUXkiAmkVZuiAKnvUoLv6g-3D';
      expect(processCareerUrl(longTrackingUrl, 'Company')).toBeNull();
    });

    test('should keep legitimate URLs under 500 chars', () => {
      const legitimateUrl = 'https://stripe.com/jobs/listing/software-engineer?department=engineering&location=remote';
      const result = processCareerUrl(legitimateUrl, 'Stripe');
      expect(result).toBeTruthy(); // Should not be null
      expect(result!.length).toBeLessThan(500);
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
