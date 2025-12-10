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
  category: 'notion' | 'greenhouse' | 'ashby' | 'linkedin' | 'workable' | 'comeet' | 'gem' | 'ycombinator' | 'dover' | 'direct';
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
];

export function getTestCasesByCategory(category: TestCase['category']): TestCase[] {
  return testDataset.filter(tc => tc.category === category);
}

export function getThirdPartyPlatformTests(): TestCase[] {
  return testDataset.filter(tc =>
    ['notion', 'greenhouse', 'ashby', 'linkedin', 'workable', 'comeet', 'gem', 'ycombinator', 'dover'].includes(tc.category)
  );
}
