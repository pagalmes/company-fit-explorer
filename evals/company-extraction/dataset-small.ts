/**
 * Small Test Dataset for Company URL Extraction
 * 5 representative test cases for quick evaluation
 */

export interface TestCase {
  id: string;
  name: string;
  input: {
    text: string;
    html?: string;
  };
  expected: {
    name: string;
    url: string;
    careerUrl?: string | string[];
  };
  category: 'notion' | 'greenhouse' | 'ashby' | 'linkedin' | 'workable' | 'comeet' | 'gem' | 'ycombinator' | 'dover' | 'direct' | 'glassdoor' | 'tracking';
}

export const testDataset: TestCase[] = [
  // Notion platform - the original bug case
  {
    id: 'welltheory-notion',
    name: 'WellTheory on Notion.so',
    input: {
      text: 'WellTheory - https://www.notion.so/Work-at-WellTheory-f4e6aad0b3a9444aa96082023236d23e',
    },
    expected: {
      name: 'WellTheory',
      url: 'https://welltheory.com',
      careerUrl: 'https://www.notion.so/Work-at-WellTheory-f4e6aad0b3a9444aa96082023236d23e'
    },
    category: 'notion'
  },
  
  // Greenhouse platform
  {
    id: 'weave-greenhouse',
    name: 'Weave on Greenhouse',
    input: {
      text: 'Weave - https://job-boards.greenhouse.io/weave',
    },
    expected: {
      name: 'Weave',
      url: 'https://www.weave.bio',
      careerUrl: ['https://job-boards.greenhouse.io/weave', 'https://www.weave.bio/careers/']
    },
    category: 'greenhouse'
  },
  
  // LinkedIn with YC annotation
  {
    id: 'mem0-linkedin',
    name: 'Mem0 (YC S24) on LinkedIn Jobs',
    input: {
      text: 'Mem0 (YC S24) - https://www.linkedin.com/company/mem0/jobs/',
    },
    expected: {
      name: 'Mem0',
      url: 'https://mem0.ai',
      careerUrl: 'https://mem0.ai/careers'
    },
    category: 'linkedin'
  },
  
  // Direct career page with hash anchor
  {
    id: 'marble-health-hash',
    name: 'Marble Health with hash anchor',
    input: {
      text: 'Marble Health - https://www.marblehealth.com/careers#open-positions',
    },
    expected: {
      name: 'Marble Health',
      url: 'https://marblehealth.com',
      careerUrl: 'https://www.marblehealth.com/careers#open-positions'
    },
    category: 'direct'
  },
  
  // YCombinator jobs page
  {
    id: 'cercli-ycombinator',
    name: 'Cercli (YC S23) on YC Jobs',
    input: {
      text: 'Cercli (YC S23) - https://www.ycombinator.com/companies/cercli/jobs',
    },
    expected: {
      name: 'Cercli',
      url: 'https://cercli.com',
      careerUrl: 'https://www.ycombinator.com/companies/cercli/jobs'
    },
    category: 'ycombinator'
  },

  // Glassdoor job alert - should filter out tracking URL
  {
    id: 'company-glassdoor',
    name: 'Company from Glassdoor Job Alert',
    input: {
      text: 'Software Engineer at Acme Corp',
      html: '<a href="https://www.glassdoor.com/partner/jobListing.htm?pos=101&ao=1110586&s=58&guid=0000019b0a118240b7f3a194d7efac32&src=GD_JOB_AD&t=MJA">Software Engineer at Acme Corp</a>',
    },
    expected: {
      name: 'Acme Corp',
      url: 'https://acmecorp.com',
      // careerUrl should be undefined - Glassdoor URL filtered out
    },
    category: 'glassdoor'
  },

  // SendGrid tracking redirect - should filter out long tracking URL
  {
    id: 'company-sendgrid-tracking',
    name: 'Company from email with SendGrid tracking',
    input: {
      text: 'Join Stripe',
      html: '<a href="https://u9255466.ct.sendgrid.net/ls/click?upn=u001.vinfit7V4Y5zoxBeRCELg4wnpQdelHsN-2B76WbOVLl6uSblq0b5ZCODKFvX7lhqzfFDByqJKYvhNhScDf-2F25cCAjMQBWnV9wqGRzQv-2B3U2jzVc4jjgF-2FqAdZmzQ4ugI-2BbWM73OjW0-2FBDq4AfFf3lNj7f-2FCvy7VcWJ5RVV2drhF8Z3WQPv-2FfIBMdd-2B2A1e9m1J9KCrMCCcADRCpHpW68TjAUnhIrD6ZFEPXPf70q-2BCeDNOxtcyLAu3sVQQRpjsC33hWcx-2FqGIWZUVbSxr-2BeDmjROYrgMdDQaCU7gpzThj7by2ATQ-2BVWIRBs9TxeD2gSRlGtIGWRZxQ-2F7Y-2B8R5L5CqBHkckElscbL32Yb-2FtHc4ni-2Bwa9j1rtOYGCpvu2S2NcYowliBPSrcpCns0v7zgvHvrLzBkjzwVXd3PM2lB4m202kSCb4YqtaM8cS8b-2FEuyYEN5KS9pqRrPiwi5U6k1tFmNxncwLt-2B4u1yxAGrwb6N3ORcP1VEFITGujgN-2BPuvpvtZDkeKriV4VHPNISj8TpHWHw8r1P-2BgmZk9INFipl5yNzUe92aAi4o-2BiGi9I95mkSfCmOHHNGhd8O1sEgATLJojRCRXQ3650uLtnNlSTpkZ-2FSG89vvpDs-2Fp6JeNQ5N-2Bilt0wwaj8AASyzvXZdEAyDH-2B1Lg-3D-3D5GBy_rOkfXHSZTxuEkAGQ1SX9XzpyfNl7S8VxIbVrwrFpPFsrLCKRKDlwLDzFOZV87oGeO6VD1b5MDWZKnm0oJvArMkBiSEE0RmMpUhY0Q2tARYaf7N1M3T6lHkY01NMMFq8cruIDmFW3hVbezhQRXaiZ-2BHkw-2BjCvnRQuieO5tiPrkHZWOsvzB0rJw-2FJJ0Yw3VD8HeUP8s-2FAobTKQU-2BBQ3DUL-2BbhAojAutYwWayuM0Lo-2FnA7H4aQ-2FN0OqcA31iVElc2xjLchqGZeV8m3OZgo7EwNMO7Sz97Zq-2FDJjImGYZAyOoePcQq-2FCNNCTX9GAMAsPBtzbEsemdia20dONLsC2SkWanfUXkiAmkVZuiAKnvUoLv6g-3D">Join Stripe</a>',
    },
    expected: {
      name: 'Stripe',
      url: 'https://stripe.com',
      // careerUrl should be undefined - SendGrid tracking URL filtered out (1,147 chars)
    },
    category: 'tracking'
  },

  // Google redirect tracking - should filter out Google redirect
  {
    id: 'company-google-redirect',
    name: 'Company from email with Google redirect tracking',
    input: {
      text: 'Careers at Webflow',
      html: '<a href="https://notifications.googleapis.com/email/redirect?t=AFG8qyX4SldJVl39NANU6xXizJWCKeZSw0OFCEmRH9eC3907Baikn7nedsvHv1PBthHCxabOZGU-ZzxzaKUopEwS4pIltlPRJodzH5OSfcCvDB6JyOshyCCRyZaS0oHVqHHzvtJsyEfG7LsiKBJrBWfsDf7kEf2NafSeTEuqOdS7DHVLwyVEnhUGmOK921n7ivhFj2e6U90iTNQ19rdu6pSRGHCdLB3I7ivEkEK4Wqbm8icIDbFn2uqCClxhYPD1eDJWyn6m6hMo">Careers at Webflow</a>',
    },
    expected: {
      name: 'Webflow',
      url: 'https://webflow.com',
      // careerUrl should be undefined - Google redirect URL filtered out
    },
    category: 'tracking'
  },
];

export function getTestCasesByCategory(category: TestCase['category']): TestCase[] {
  return testDataset.filter(tc => tc.category === category);
}

export function getThirdPartyPlatformTests(): TestCase[] {
  return testDataset.filter(tc =>
    ['notion', 'greenhouse', 'ashby', 'linkedin', 'workable', 'comeet', 'gem', 'ycombinator', 'dover'].includes(tc.category)
  );
}

export function getTrackingUrlTests(): TestCase[] {
  return testDataset.filter(tc => tc.category === 'tracking' || tc.category === 'glassdoor');
}
