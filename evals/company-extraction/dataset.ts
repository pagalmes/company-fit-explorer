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
    careerUrl?: string | string[];  // Career page URL(s) - can be any platform, multiple valid options allowed
  };
  category: 'notion' | 'greenhouse' | 'ashby' | 'linkedin' | 'workable' | 'comeet' | 'gem' | 'ycombinator' | 'dover' | 'direct';
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

  // === Third-Party Platform Career Pages ===
  {
    id: 'sumble-workable',
    name: 'Sumble on Workable',
    input: {
      text: 'Sumble - https://apply.workable.com/sumble-inc/',
    },
    expected: {
      name: 'Sumble',
      url: 'https://sumble.com',
      careerUrl: 'https://apply.workable.com/sumble-inc/'
    },
    category: 'workable'
  },
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
  {
    id: 'daylight-comeet',
    name: 'Daylight Security on Comeet',
    input: {
      text: 'Daylight Security - https://www.comeet.com/jobs/daylightsecurity/7A.00D',
    },
    expected: {
      name: 'Daylight Security',
      url: 'https://daylight.ai',
      careerUrl: 'https://www.comeet.com/jobs/daylightsecurity/7A.00D'
    },
    category: 'comeet'
  },
  {
    id: 'letter-ai-gem',
    name: 'Letter AI on Gem',
    input: {
      text: 'Letter AI - https://jobs.gem.com/letter-ai',
    },
    expected: {
      name: 'Letter AI',
      url: 'https://letter.ai',
      careerUrl: 'https://jobs.gem.com/letter-ai'
    },
    category: 'gem'
  },
  {
    id: 'fleetworks-ashby',
    name: 'FleetWorks on Ashby',
    input: {
      text: 'FleetWorks - AI logistics management platform (Chicago / Bay Area) - https://jobs.ashbyhq.com/FleetWorks',
    },
    expected: {
      name: 'FleetWorks',
      url: 'https://www.fleetworks.ai',
      careerUrl: 'https://jobs.ashbyhq.com/FleetWorks'
    },
    category: 'ashby'
  },
  {
    id: 'weave-greenhouse',
    name: 'Weave on Greenhouse',
    input: {
      text: 'Weave - AI regulatory submission platform (Bay Area / US remote) - https://job-boards.greenhouse.io/weave',
    },
    expected: {
      name: 'Weave',
      url: 'https://www.weave.bio',
      careerUrl: ['https://job-boards.greenhouse.io/weave', 'https://www.weave.bio/careers/']
    },
    category: 'greenhouse'
  },

  // === Direct Career Pages with Edge Cases ===
  {
    id: 'estuary-hash-anchor',
    name: 'Estuary with hash anchor',
    input: {
      text: 'Estuary - https://estuary.dev/about/#careers',
    },
    expected: {
      name: 'Estuary',
      url: 'https://estuary.dev',
      careerUrl: 'https://estuary.dev/about/#careers'
    },
    category: 'direct'
  },
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
  {
    id: 'hyro-ai-tld',
    name: 'Hyro with .ai TLD',
    input: {
      text: 'Hyro - https://www.hyro.ai/careers/',
    },
    expected: {
      name: 'Hyro',
      url: 'https://hyro.ai',
      careerUrl: 'https://www.hyro.ai/careers/'
    },
    category: 'direct'
  },

  // === Greenhouse.io Career Pages ===
  {
    id: 'stripe-direct',
    name: 'Stripe Direct',
    input: {
      text: 'Stripe - https://stripe.com/jobs',
    },
    expected: {
      name: 'Stripe',
      url: 'https://stripe.com',
      careerUrl: 'https://stripe.com/jobs'
    },
    category: 'direct'
  },
  {
    id: 'databricks-direct',
    name: 'Databricks Direct',
    input: {
      text: 'Databricks - https://www.databricks.com/company/careers',
    },
    expected: {
      name: 'Databricks',
      url: 'https://databricks.com',
      careerUrl: 'https://www.databricks.com/company/careers'
    },
    category: 'direct'
  },

  // === Direct Career Pages ===
  {
    id: 'netflix-direct',
    name: 'Netflix Direct',
    input: {
      text: 'Netflix - https://jobs.netflix.com/',
    },
    expected: {
      name: 'Netflix',
      url: 'https://netflix.com',
      careerUrl: 'https://jobs.netflix.com/'
    },
    category: 'direct'
  },

  {
    id: 'anthropic-direct',
    name: 'Anthropic Direct',
    input: {
      text: 'Anthropic - https://www.anthropic.com/careers',
    },
    expected: {
      name: 'Anthropic',
      url: 'https://anthropic.com',
      careerUrl: 'https://www.anthropic.com/careers'
    },
    category: 'direct'
  },

  {
    id: 'teleskope-direct',
    name: 'Teleskope Direct',
    input: {
      text: 'Teleskope - https://www.teleskope.ai/careers',
    },
    expected: {
      name: 'Teleskope',
      url: 'https://teleskope.ai',
      careerUrl: 'https://www.teleskope.ai/careers'
    },
    category: 'direct'
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

  // === More Third-Party Platforms ===
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
  {
    id: 'daylight-greenhouse',
    name: 'Daylight on Greenhouse',
    input: {
      text: 'Daylight - renewable energy integrations (NYC) - https://job-boards.greenhouse.io/daylight',
    },
    expected: {
      name: 'Daylight',
      url: 'https://godaylight.com',
      careerUrl: 'https://job-boards.greenhouse.io/daylight'
    },
    category: 'greenhouse'
  },
  {
    id: 'amae-health-greenhouse',
    name: 'Amae Health on Greenhouse',
    input: {
      text: 'Amae Health - https://job-boards.greenhouse.io/amaehealth',
    },
    expected: {
      name: 'Amae Health',
      url: 'https://amaehealth.com',
      careerUrl: 'https://job-boards.greenhouse.io/amaehealth'
    },
    category: 'greenhouse'
  },
  {
    id: 'wonder-studios-greenhouse-eu',
    name: 'Wonder Studios on Greenhouse EU',
    input: {
      text: 'Wonder Studios - https://job-boards.eu.greenhouse.io/wonderstudios',
    },
    expected: {
      name: 'Wonder Studios',
      url: 'https://wonderstudios.com',
      careerUrl: 'https://job-boards.eu.greenhouse.io/wonderstudios'
    },
    category: 'greenhouse'
  },
  {
    id: 'clerq-dover',
    name: 'Clerq on Dover',
    input: {
      text: 'Clerq - direct bank account payments (NYC / Florida) - https://app.dover.com/jobs/clerq',
    },
    expected: {
      name: 'Clerq',
      url: 'https://clerq.io',
      careerUrl: 'https://app.dover.com/jobs/clerq'
    },
    category: 'dover'
  },

  // === Direct Career Pages - More Examples ===
  {
    id: 'mobile-first-company',
    name: 'The Mobile-First Company',
    input: {
      text: 'The Mobile-First Company - https://www.themobilefirstcompany.com/team',
    },
    expected: {
      name: 'The Mobile-First Company',
      url: 'https://themobilefirstcompany.com',
      careerUrl: 'https://www.themobilefirstcompany.com/team'
    },
    category: 'direct'
  },
  {
    id: 'emerald-ai',
    name: 'Emerald AI with .co TLD',
    input: {
      text: 'Emerald AI - https://emeraldai.co/careers',
    },
    expected: {
      name: 'Emerald AI',
      url: 'https://emeraldai.co',
      careerUrl: 'https://emeraldai.co/careers'
    },
    category: 'direct'
  },
  {
    id: 'chipagents-ai',
    name: 'ChipAgents with .ai TLD',
    input: {
      text: 'ChipAgents - https://chipagents.ai/careers',
    },
    expected: {
      name: 'ChipAgents',
      url: 'https://chipagents.ai',
      careerUrl: 'https://chipagents.ai/careers'
    },
    category: 'direct'
  },
  {
    id: 'viven-careers-subdomain',
    name: 'Viven with careers subdomain',
    input: {
      text: 'Viven - https://careers.viven.ai/careers',
    },
    expected: {
      name: 'Viven',
      url: 'https://viven.ai',
      careerUrl: 'https://careers.viven.ai/careers'
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
    ['notion', 'greenhouse', 'ashby', 'linkedin', 'workable', 'comeet', 'gem', 'ycombinator', 'dover'].includes(tc.category)
  );
}
