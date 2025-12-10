/**
 * Test Dataset for Company URL Extraction
 *
 * Tests the LLM's ability to correctly infer company website URLs
 * from various sources (Notion, Greenhouse, LinkedIn, etc.)
 *
 * Each test case has:
 * - input: Text with company name and career page URL
 * - expected: What the LLM should extract
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
    url: string;  // Company's actual website (NOT third-party platform)
    careerUrl?: string;  // Career page URL (can be any platform)
  };
  category: 'notion' | 'greenhouse' | 'lever' | 'ashby' | 'linkedin' | 'direct';
}

export const testDataset: TestCase[] = [
  // === Notion.so Career Pages ===
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

  // === Greenhouse.io Career Pages ===
  {
    id: 'stripe-greenhouse',
    name: 'Stripe on Greenhouse',
    input: {
      text: 'Stripe - https://stripe.greenhouse.io/jobs',
    },
    expected: {
      name: 'Stripe',
      url: 'https://stripe.com',
      careerUrl: 'https://stripe.greenhouse.io/jobs'
    },
    category: 'greenhouse'
  },
  {
    id: 'databricks-greenhouse',
    name: 'Databricks on Greenhouse',
    input: {
      text: 'Databricks - https://databricks.greenhouse.io/jobs',
    },
    expected: {
      name: 'Databricks',
      url: 'https://databricks.com',
      careerUrl: 'https://databricks.greenhouse.io/jobs'
    },
    category: 'greenhouse'
  },

  // === Lever.co Career Pages ===
  {
    id: 'netflix-lever',
    name: 'Netflix on Lever',
    input: {
      text: 'Netflix - https://jobs.lever.co/netflix',
    },
    expected: {
      name: 'Netflix',
      url: 'https://netflix.com',
      careerUrl: 'https://jobs.lever.co/netflix'
    },
    category: 'lever'
  },

  // === Ashby Career Pages ===
  {
    id: 'anthropic-ashby',
    name: 'Anthropic on Ashby',
    input: {
      text: 'Anthropic - https://anthropic.ashbyhq.com/jobs',
    },
    expected: {
      name: 'Anthropic',
      url: 'https://anthropic.com',
      careerUrl: 'https://anthropic.ashbyhq.com/jobs'
    },
    category: 'ashby'
  },

  // === LinkedIn Company Pages ===
  {
    id: 'teleskope-linkedin',
    name: 'Teleskope via LinkedIn',
    input: {
      text: 'Teleskope - https://linkedin.com/company/teleskopeai',
    },
    expected: {
      name: 'Teleskope',
      url: 'https://teleskope.ai',
      careerUrl: 'https://linkedin.com/company/teleskopeai'
    },
    category: 'linkedin'
  },

  // === Direct Company Career Pages (Easy Cases) ===
  {
    id: 'airbnb-direct',
    name: 'Airbnb Direct',
    input: {
      text: 'Airbnb - https://careers.airbnb.com',
    },
    expected: {
      name: 'Airbnb',
      url: 'https://airbnb.com',
      careerUrl: 'https://careers.airbnb.com'
    },
    category: 'direct'
  },
  {
    id: 'strella-direct',
    name: 'Strella Direct',
    input: {
      text: 'Strella - https://www.strella.io/careers',
    },
    expected: {
      name: 'Strella',
      url: 'https://strella.io',
      careerUrl: 'https://www.strella.io/careers'
    },
    category: 'direct'
  },

  // === Edge Cases ===
  {
    id: 'defakto-security',
    name: 'Defakto Security (hyphenated)',
    input: {
      text: 'Defakto Security - https://www.defakto.security/careers/',
    },
    expected: {
      name: 'Defakto Security',
      url: 'https://defakto.security',
      careerUrl: 'https://www.defakto.security/careers/'
    },
    category: 'direct'
  },
  {
    id: 'scale-ai',
    name: 'Scale AI (.ai TLD)',
    input: {
      text: 'Scale AI - https://scale.com/careers',
    },
    expected: {
      name: 'Scale AI',
      url: 'https://scale.com',
      careerUrl: 'https://scale.com/careers'
    },
    category: 'direct'
  },
];

/**
 * Get test cases by category
 */
export function getTestCasesByCategory(category: TestCase['category']): TestCase[] {
  return testDataset.filter(tc => tc.category === category);
}

/**
 * Get all third-party platform test cases
 */
export function getThirdPartyPlatformTests(): TestCase[] {
  return testDataset.filter(tc =>
    ['notion', 'greenhouse', 'lever', 'ashby', 'linkedin'].includes(tc.category)
  );
}
