/**
 * Small Test Dataset for Company Discovery Evaluation
 * Tests the Perplexity-powered company discovery feature
 */

export interface DiscoveryTestCase {
  id: string;
  name: string;
  input: {
    candidateName: string;
    targetRole: string;
    experience: string[];
    targetCompanies: string;
    mustHaves: string[];
    wantToHave: string[];
  };
  expected: {
    minCompanies: number;  // Minimum number of companies expected
    maxCompanies: number;  // Maximum number of companies expected
    requiredIndustries?: string[];  // Industries that should be represented
    forbiddenPlatforms: string[];  // Domains that should NOT appear in logo URLs
    minMatchScore: number;  // Minimum acceptable match score (0-100)
    requiresOpenRoles: boolean;  // All companies must have openRoles > 0
    requiresValidLogos: boolean;  // All logos must be valid URLs or domains
    requiresValidCareerUrls: boolean;  // All career URLs must be valid
  };
  category: 'backend-engineer' | 'frontend-engineer' | 'fullstack-engineer' | 'data-engineer' | 'ml-engineer';
}

export const testDataset: DiscoveryTestCase[] = [
  // Backend Engineer - AI/ML Focus
  {
    id: 'backend-ai-ml',
    name: 'Backend Engineer with AI/ML Focus',
    input: {
      candidateName: 'Alex Chen',
      targetRole: 'Senior Backend Engineer',
      experience: [
        'Python & FastAPI',
        'Kubernetes & Docker',
        'PostgreSQL & Redis',
        'LLM API integration'
      ],
      targetCompanies: 'AI startups, Series A-C, Remote-friendly',
      mustHaves: [
        'Backend engineering role',
        'AI/ML product focus',
        'Remote work option',
        'Series A or later funding'
      ],
      wantToHave: [
        'Python stack',
        'LLM/AI infrastructure',
        'Strong engineering culture',
        'Good work-life balance'
      ]
    },
    expected: {
      minCompanies: 25,
      maxCompanies: 45,
      requiredIndustries: ['AI', 'Machine Learning', 'Technology'],
      forbiddenPlatforms: [
        'logo.clearbit.com',
        'notion.so',
        'greenhouse.io',
        'lever.co',
        'linkedin.com'
      ],
      minMatchScore: 60,
      requiresOpenRoles: true,
      requiresValidLogos: true,
      requiresValidCareerUrls: true
    },
    category: 'backend-engineer'
  },

  // Frontend Engineer - Product Focus
  {
    id: 'frontend-product',
    name: 'Frontend Engineer with Product Focus',
    input: {
      candidateName: 'Sarah Johnson',
      targetRole: 'Senior Frontend Engineer',
      experience: [
        'React & TypeScript',
        'Next.js',
        'Design systems',
        'Product thinking'
      ],
      targetCompanies: 'B2B SaaS, Product-driven, SF Bay Area or Remote',
      mustHaves: [
        'Frontend engineering role',
        'Product-focused company',
        'Modern tech stack (React/Vue)',
        'Remote or SF Bay Area'
      ],
      wantToHave: [
        'Design system work',
        'User research collaboration',
        'Strong product culture',
        'B2B SaaS product'
      ]
    },
    expected: {
      minCompanies: 25,
      maxCompanies: 45,
      requiredIndustries: ['SaaS', 'Technology', 'Software'],
      forbiddenPlatforms: [
        'logo.clearbit.com',
        'notion.so',
        'greenhouse.io',
        'lever.co',
        'linkedin.com'
      ],
      minMatchScore: 60,
      requiresOpenRoles: true,
      requiresValidLogos: true,
      requiresValidCareerUrls: true
    },
    category: 'frontend-engineer'
  },

  // Fullstack Engineer - Early Stage Startup
  {
    id: 'fullstack-early-stage',
    name: 'Fullstack Engineer for Early Stage Startups',
    input: {
      candidateName: 'Jordan Lee',
      targetRole: 'Fullstack Engineer',
      experience: [
        'React & Node.js',
        'AWS infrastructure',
        'Early stage startup experience',
        '0-1 product building'
      ],
      targetCompanies: 'Early stage startups, Seed to Series A, High growth potential',
      mustHaves: [
        'Fullstack engineering role',
        'Seed or Series A stage',
        'Small team (< 50 employees)',
        'High impact work'
      ],
      wantToHave: [
        'Ownership and autonomy',
        'Product-market fit stage',
        'Equity compensation',
        'Technical co-founder involved'
      ]
    },
    expected: {
      minCompanies: 25,
      maxCompanies: 45,
      forbiddenPlatforms: [
        'logo.clearbit.com',
        'notion.so',
        'greenhouse.io',
        'lever.co',
        'linkedin.com'
      ],
      minMatchScore: 60,
      requiresOpenRoles: true,
      requiresValidLogos: true,
      requiresValidCareerUrls: true
    },
    category: 'fullstack-engineer'
  },

  // Data Engineer - Healthcare Tech
  {
    id: 'data-engineer-healthcare',
    name: 'Data Engineer in Healthcare Tech',
    input: {
      candidateName: 'Maria Garcia',
      targetRole: 'Senior Data Engineer',
      experience: [
        'Python data pipelines',
        'Spark & Airflow',
        'Healthcare data (HIPAA)',
        'Data modeling & warehousing'
      ],
      targetCompanies: 'Healthcare tech, Digital health, Remote-first',
      mustHaves: [
        'Data engineering role',
        'Healthcare or digital health focus',
        'HIPAA compliance experience valued',
        'Remote work option'
      ],
      wantToHave: [
        'Impact on patient outcomes',
        'Strong data culture',
        'Modern data stack',
        'Growth opportunities'
      ]
    },
    expected: {
      minCompanies: 20,
      maxCompanies: 40,
      requiredIndustries: ['Healthcare', 'Health Tech', 'Digital Health'],
      forbiddenPlatforms: [
        'logo.clearbit.com',
        'notion.so',
        'greenhouse.io',
        'lever.co',
        'linkedin.com'
      ],
      minMatchScore: 60,
      requiresOpenRoles: true,
      requiresValidLogos: true,
      requiresValidCareerUrls: true
    },
    category: 'data-engineer'
  },

  // ML Engineer - Research to Production
  {
    id: 'ml-engineer-research',
    name: 'ML Engineer bridging Research to Production',
    input: {
      candidateName: 'David Kim',
      targetRole: 'Machine Learning Engineer',
      experience: [
        'PyTorch & TensorFlow',
        'LLM fine-tuning',
        'MLOps & model deployment',
        'Research paper implementation'
      ],
      targetCompanies: 'AI research labs, AI-first companies, Hybrid work',
      mustHaves: [
        'ML engineering or research role',
        'LLM/GenAI focus',
        'Production ML systems',
        'Hybrid or remote work'
      ],
      wantToHave: [
        'Research publication opportunities',
        'State-of-the-art infrastructure',
        'Collaboration with researchers',
        'Open source contributions'
      ]
    },
    expected: {
      minCompanies: 20,
      maxCompanies: 40,
      requiredIndustries: ['AI', 'Machine Learning', 'Research'],
      forbiddenPlatforms: [
        'logo.clearbit.com',
        'notion.so',
        'greenhouse.io',
        'lever.co',
        'linkedin.com'
      ],
      minMatchScore: 60,
      requiresOpenRoles: true,
      requiresValidLogos: true,
      requiresValidCareerUrls: true
    },
    category: 'ml-engineer'
  }
];

export function getTestCasesByCategory(category: DiscoveryTestCase['category']): DiscoveryTestCase[] {
  return testDataset.filter(tc => tc.category === category);
}
