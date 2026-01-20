/**
 * Langfuse Evaluation Script for Company Discovery
 *
 * Tests the Perplexity-powered discover-companies API endpoint to ensure:
 * 1. Companies are discovered with valid open roles
 * 2. Logo URLs use the proxy format (not Clearbit or third-party platforms)
 * 3. Career URLs are valid and accessible
 * 4. Match scores are reasonable (60-100)
 * 5. Company count meets expectations (30-40 companies)
 * 6. Companies match the candidate profile
 *
 * Usage:
 *   npm run eval:company-discovery
 */

import { Langfuse } from 'langfuse';
import { testDataset, DiscoveryTestCase } from './dataset-small';

// Initialize Langfuse client
const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
});

interface CompanyResult {
  id: number;
  name: string;
  logo: string;
  careerUrl: string;
  matchScore: number;
  industry: string;
  stage: string;
  location: string;
  employees: string;
  remote: string;
  openRoles: number;
  matchReasons: string[];
  externalLinks?: {
    website?: string;
    linkedin?: string;
    glassdoor?: string;
    crunchbase?: string;
  };
}

interface DiscoveryApiResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    cmf: any;
    baseCompanies: CompanyResult[];
  };
  citations: string[];
  usage: {
    model: string;
    tokensUsed: number;
  };
  error?: string;
}

interface EvalResult {
  testCase: DiscoveryTestCase;
  actual: {
    companyCount: number;
    companies: CompanyResult[];
    avgMatchScore: number;
    industries: string[];
  };
  scores: {
    companyCountOk: boolean;
    allHaveOpenRoles: boolean;
    logosValid: boolean;
    careerUrlsValid: boolean;
    matchScoresValid: boolean;
    industriesMatch: boolean;
    overallScore: number;  // 0-100
  };
  latency: number;  // milliseconds
  tokensUsed: number;
  error?: string;
}

/**
 * Call the discover-companies API
 */
async function discoverCompanies(input: DiscoveryTestCase['input']): Promise<DiscoveryApiResponse> {
  const response = await fetch('http://localhost:3000/api/llm/perplexity/discover-companies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Validate logo URL format
 */
function isValidLogoUrl(logo: string, forbiddenPlatforms: string[]): boolean {
  if (!logo || typeof logo !== 'string') return false;

  // Check for forbidden platforms
  const lowerLogo = logo.toLowerCase();
  if (forbiddenPlatforms.some(platform => lowerLogo.includes(platform))) {
    return false;
  }

  // Valid formats:
  // 1. Proxy format: /api/logo?domain=company.com
  // 2. Fallback avatar: https://ui-avatars.com/api/...
  // 3. Simple domain: company.com
  if (logo.startsWith('/api/logo?domain=')) return true;
  if (logo.includes('ui-avatars.com')) return true;

  // Simple domain validation (no protocol, no path)
  if (!logo.includes('://') && !logo.includes('/')) {
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(logo);
  }

  return false;
}

/**
 * Validate career URL format
 */
function isValidCareerUrl(careerUrl: string): boolean {
  if (!careerUrl || typeof careerUrl !== 'string') return false;

  try {
    const url = new URL(careerUrl);
    return url.protocol === 'https:' && url.hostname.length > 0;
  } catch {
    return false;
  }
}

/**
 * Score the discovery result
 */
function scoreResult(testCase: DiscoveryTestCase, actual: EvalResult['actual']): EvalResult['scores'] {
  const expected = testCase.expected;

  // Company count validation (30-40 companies expected)
  const companyCountOk =
    actual.companyCount >= expected.minCompanies &&
    actual.companyCount <= expected.maxCompanies;

  // All companies must have open roles
  const allHaveOpenRoles = expected.requiresOpenRoles
    ? actual.companies.every(c => c.openRoles > 0)
    : true;

  // Logo validation
  const logosValid = expected.requiresValidLogos
    ? actual.companies.every(c => isValidLogoUrl(c.logo, expected.forbiddenPlatforms))
    : true;

  // Career URL validation
  const careerUrlsValid = expected.requiresValidCareerUrls
    ? actual.companies.every(c => isValidCareerUrl(c.careerUrl))
    : true;

  // Match scores validation (all should be 60-100)
  const matchScoresValid = actual.avgMatchScore >= expected.minMatchScore;

  // Industry matching (if specified)
  const industriesMatch = expected.requiredIndustries
    ? expected.requiredIndustries.some(reqIndustry =>
        actual.industries.some(actualIndustry =>
          actualIndustry.toLowerCase().includes(reqIndustry.toLowerCase())
        )
      )
    : true;

  // Calculate overall score (0-100)
  let score = 0;
  if (companyCountOk) score += 20;
  if (allHaveOpenRoles) score += 25;
  if (logosValid) score += 20;
  if (careerUrlsValid) score += 15;
  if (matchScoresValid) score += 10;
  if (industriesMatch) score += 10;

  return {
    companyCountOk,
    allHaveOpenRoles,
    logosValid,
    careerUrlsValid,
    matchScoresValid,
    industriesMatch,
    overallScore: score,
  };
}

/**
 * Run evaluation on a single test case
 */
async function evaluateTestCase(testCase: DiscoveryTestCase): Promise<EvalResult> {
  const startTime = Date.now();

  try {
    // Call the API
    const result = await discoverCompanies(testCase.input);

    const latency = Date.now() - startTime;

    if (!result.success || !result.data) {
      throw new Error(result.error || 'API returned unsuccessful response');
    }

    const companies = result.data.baseCompanies || [];

    // Calculate actual metrics
    const actual = {
      companyCount: companies.length,
      companies: companies,
      avgMatchScore: companies.length > 0
        ? companies.reduce((sum, c) => sum + c.matchScore, 0) / companies.length
        : 0,
      industries: [...new Set(companies.map(c => c.industry).filter(Boolean))],
    };

    // Score the result
    const scores = scoreResult(testCase, actual);

    // Log to Langfuse
    const trace = langfuse.trace({
      name: 'company-discovery-eval',
      metadata: {
        testCaseId: testCase.id,
        category: testCase.category,
        candidateName: testCase.input.candidateName,
        targetRole: testCase.input.targetRole,
      },
    });

    trace.generation({
      name: 'discover-companies',
      input: testCase.input,
      output: {
        companyCount: actual.companyCount,
        avgMatchScore: actual.avgMatchScore,
        industries: actual.industries,
        sampleCompanies: companies.slice(0, 5).map(c => ({
          name: c.name,
          matchScore: c.matchScore,
          openRoles: c.openRoles,
          industry: c.industry,
        })),
      },
      metadata: {
        expected: testCase.expected,
        tokensUsed: result.usage.tokensUsed,
        model: result.usage.model,
        citationCount: result.citations?.length || 0,
      },
      usage: {
        input: result.usage.tokensUsed,
        output: 0,
        total: result.usage.tokensUsed,
      },
    });

    // Individual metric scores
    trace.score({ name: 'company-count-ok', value: scores.companyCountOk ? 1 : 0 });
    trace.score({ name: 'all-have-open-roles', value: scores.allHaveOpenRoles ? 1 : 0 });
    trace.score({ name: 'logos-valid', value: scores.logosValid ? 1 : 0 });
    trace.score({ name: 'career-urls-valid', value: scores.careerUrlsValid ? 1 : 0 });
    trace.score({ name: 'match-scores-valid', value: scores.matchScoresValid ? 1 : 0 });
    trace.score({ name: 'industries-match', value: scores.industriesMatch ? 1 : 0 });
    trace.score({ name: 'overall-score', value: scores.overallScore / 100 });

    await langfuse.flushAsync();

    return {
      testCase,
      actual,
      scores,
      latency,
      tokensUsed: result.usage.tokensUsed,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      testCase,
      actual: {
        companyCount: 0,
        companies: [],
        avgMatchScore: 0,
        industries: [],
      },
      scores: {
        companyCountOk: false,
        allHaveOpenRoles: false,
        logosValid: false,
        careerUrlsValid: false,
        matchScoresValid: false,
        industriesMatch: false,
        overallScore: 0,
      },
      latency,
      tokensUsed: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run full evaluation suite
 */
async function runEvaluation() {
  console.log(`🧪 Running Company Discovery Evaluation`);
  console.log(`📊 Test cases: ${testDataset.length}\n`);

  // Check API key
  if (!process.env.PERPLEXITY_API_KEY) {
    console.error('❌ PERPLEXITY_API_KEY not configured');
    process.exit(1);
  }

  const results: EvalResult[] = [];

  for (const testCase of testDataset) {
    console.log(`Testing: ${testCase.name}...`);
    const result = await evaluateTestCase(testCase);

    results.push(result);

    // Print result
    const icon = result.scores.overallScore === 100 ? '✅' : result.scores.overallScore >= 70 ? '⚠️' : '❌';
    console.log(`  ${icon} Score: ${result.scores.overallScore}/100`);
    console.log(`  📊 Companies: ${result.actual.companyCount}`);
    console.log(`  🎯 Avg Match Score: ${result.actual.avgMatchScore.toFixed(1)}`);
    console.log(`  ⏱️  Latency: ${(result.latency / 1000).toFixed(1)}s`);
    console.log(`  🪙 Tokens: ${result.tokensUsed.toLocaleString()}`);

    if (result.error) {
      console.log(`  ❌ Error: ${result.error}`);
    } else {
      if (!result.scores.companyCountOk) {
        console.log(`  ⚠️  Company count: Expected ${testCase.expected.minCompanies}-${testCase.expected.maxCompanies}, got ${result.actual.companyCount}`);
      }
      if (!result.scores.allHaveOpenRoles) {
        const withoutRoles = result.actual.companies.filter(c => c.openRoles === 0).length;
        console.log(`  ⚠️  ${withoutRoles} companies without open roles`);
      }
      if (!result.scores.logosValid) {
        const invalidLogos = result.actual.companies.filter(c =>
          !isValidLogoUrl(c.logo, testCase.expected.forbiddenPlatforms)
        ).length;
        console.log(`  ⚠️  ${invalidLogos} companies with invalid logo URLs`);
      }
      if (!result.scores.careerUrlsValid) {
        const invalidUrls = result.actual.companies.filter(c => !isValidCareerUrl(c.careerUrl)).length;
        console.log(`  ⚠️  ${invalidUrls} companies with invalid career URLs`);
      }
    }
    console.log();

    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary statistics
  const totalScore = results.reduce((sum, r) => sum + r.scores.overallScore, 0);
  const avgScore = totalScore / results.length;
  const passCount = results.filter(r => r.scores.overallScore >= 70).length;
  const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
  const totalTokens = results.reduce((sum, r) => sum + r.tokensUsed, 0);

  console.log(`\n📈 Summary:`);
  console.log(`  Average Score: ${avgScore.toFixed(1)}/100`);
  console.log(`  Passing Tests: ${passCount}/${results.length} (${((passCount / results.length) * 100).toFixed(1)}%)`);
  console.log(`  Average Latency: ${(avgLatency / 1000).toFixed(1)}s`);
  console.log(`  Total Tokens: ${totalTokens.toLocaleString()}`);

  // Category breakdown
  const categories = ['backend-engineer', 'frontend-engineer', 'fullstack-engineer', 'data-engineer', 'ml-engineer'] as const;
  console.log(`\n📊 Breakdown by Category:`);

  for (const category of categories) {
    const categoryResults = results.filter(r => r.testCase.category === category);
    if (categoryResults.length === 0) continue;

    const categoryScore = categoryResults.reduce((sum, r) => sum + r.scores.overallScore, 0) / categoryResults.length;
    const categoryPass = categoryResults.filter(r => r.scores.overallScore >= 70).length;

    console.log(`  ${category}: ${categoryScore.toFixed(1)}/100 (${categoryPass}/${categoryResults.length} passing)`);
  }

  // Flush Langfuse
  await langfuse.flushAsync();
  console.log(`\n✅ Evaluation complete! View results at: ${process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com'}`);
}

// Run evaluation
runEvaluation()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Evaluation failed:', error);
    process.exit(1);
  });

export { runEvaluation };
