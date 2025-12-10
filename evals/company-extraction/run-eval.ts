/**
 * Langfuse Evaluation Script for Company URL Extraction
 *
 * Tests the extract-companies API endpoint to ensure:
 * 1. Correct company website URLs are inferred (not third-party platforms)
 * 2. Career page URLs are preserved accurately
 * 3. Company names are extracted correctly
 *
 * Usage:
 *   npm run eval:company-extraction
 */

import { Langfuse } from 'langfuse';
import { testDataset, TestCase } from './dataset';

// Initialize Langfuse client
const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
});

interface EvalResult {
  testCase: TestCase;
  actual: {
    name: string;
    url?: string;
    careerUrl?: string;
  };
  scores: {
    nameCorrect: boolean;
    urlCorrect: boolean;
    careerUrlCorrect: boolean;
    noThirdPartyPlatform: boolean;
    overallScore: number;  // 0-100
  };
  latency: number;  // milliseconds
  error?: string;
}

/**
 * Call the extract-companies API
 */
async function extractCompanies(input: { text: string; html?: string }) {
  const response = await fetch('http://localhost:3000/api/llm/anthropic/extract-companies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Score the extraction result
 */
function scoreResult(testCase: TestCase, actual: any): EvalResult['scores'] {
  const expected = testCase.expected;

  // Name correctness (case-insensitive)
  const nameCorrect = actual.name?.toLowerCase() === expected.name.toLowerCase();

  // URL correctness - normalize URLs for comparison
  const normalizeUrl = (url?: string) => {
    if (!url) return '';
    return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').toLowerCase();
  };

  const urlCorrect = normalizeUrl(actual.url) === normalizeUrl(expected.url);

  // Career URL correctness (optional field)
  const careerUrlCorrect = expected.careerUrl
    ? normalizeUrl(actual.careerUrl) === normalizeUrl(expected.careerUrl)
    : true;  // If no expected careerUrl, don't penalize

  // Check that URL is NOT a third-party platform
  const thirdPartyPlatforms = [
    'notion.so',
    'greenhouse.io',
    'greenhouse.com',
    'lever.co',
    'ashbyhq.com',
    'linkedin.com',
    'bamboohr.com',
    'jobvite.com',
    'workable.com',
    'gem.com',
    'comeet.com',
  ];

  const actualUrl = normalizeUrl(actual.url);
  const noThirdPartyPlatform = !thirdPartyPlatforms.some(platform =>
    actualUrl.includes(platform)
  );

  // Calculate overall score (0-100)
  let score = 0;
  if (nameCorrect) score += 25;
  if (urlCorrect) score += 50;  // Most important
  if (careerUrlCorrect) score += 15;
  if (noThirdPartyPlatform) score += 10;

  return {
    nameCorrect,
    urlCorrect,
    careerUrlCorrect,
    noThirdPartyPlatform,
    overallScore: score,
  };
}

/**
 * Run evaluation on a single test case
 */
async function evaluateTestCase(testCase: TestCase): Promise<EvalResult> {
  const startTime = Date.now();

  try {
    // Call the API
    const result = await extractCompanies(testCase.input);

    const latency = Date.now() - startTime;

    // Extract first company (assuming single company per test)
    const extracted = result.companies?.[0] || {};

    // Score the result
    const scores = scoreResult(testCase, extracted);

    // Log to Langfuse
    const trace = langfuse.trace({
      name: 'company-extraction-eval',
      metadata: {
        testCaseId: testCase.id,
        category: testCase.category,
      },
    });

    trace.generation({
      name: 'extract-companies',
      input: testCase.input,
      output: extracted,
      metadata: {
        expected: testCase.expected,
      },
    });

    trace.score({
      name: 'url-correctness',
      value: scores.urlCorrect ? 1 : 0,
    });

    trace.score({
      name: 'no-third-party-platform',
      value: scores.noThirdPartyPlatform ? 1 : 0,
    });

    trace.score({
      name: 'overall-score',
      value: scores.overallScore / 100,  // Normalize to 0-1
    });

    await langfuse.flushAsync();

    return {
      testCase,
      actual: extracted,
      scores,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      testCase,
      actual: { name: '', url: '', careerUrl: '' },
      scores: {
        nameCorrect: false,
        urlCorrect: false,
        careerUrlCorrect: false,
        noThirdPartyPlatform: false,
        overallScore: 0,
      },
      latency,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run full evaluation suite
 */
async function runEvaluation() {
  console.log(`🧪 Running Company URL Extraction Evaluation`);
  console.log(`📊 Test cases: ${testDataset.length}\n`);

  const results: EvalResult[] = [];

  for (const testCase of testDataset) {
    console.log(`Testing: ${testCase.name}...`);
    const result = await evaluateTestCase(testCase);

    results.push(result);

    // Print result
    const icon = result.scores.overallScore === 100 ? '✅' : result.scores.overallScore >= 50 ? '⚠️' : '❌';
    console.log(`  ${icon} Score: ${result.scores.overallScore}/100`);

    if (result.error) {
      console.log(`  ❌ Error: ${result.error}`);
    } else {
      if (!result.scores.urlCorrect) {
        console.log(`  ❌ URL: Expected ${testCase.expected.url}, got ${result.actual.url}`);
      }
      if (!result.scores.noThirdPartyPlatform) {
        console.log(`  ⚠️  WARNING: URL contains third-party platform`);
      }
    }
    console.log();
  }

  // Summary statistics
  const totalScore = results.reduce((sum, r) => sum + r.scores.overallScore, 0);
  const avgScore = totalScore / results.length;
  const passCount = results.filter(r => r.scores.overallScore === 100).length;
  const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;

  console.log(`\n📈 Summary:`);
  console.log(`  Average Score: ${avgScore.toFixed(1)}/100`);
  console.log(`  Perfect Scores: ${passCount}/${results.length} (${((passCount / results.length) * 100).toFixed(1)}%)`);
  console.log(`  Average Latency: ${avgLatency.toFixed(0)}ms`);

  // Category breakdown
  const categories = ['notion', 'greenhouse', 'lever', 'ashby', 'linkedin', 'direct'] as const;
  console.log(`\n📊 Breakdown by Category:`);

  for (const category of categories) {
    const categoryResults = results.filter(r => r.testCase.category === category);
    if (categoryResults.length === 0) continue;

    const categoryScore = categoryResults.reduce((sum, r) => sum + r.scores.overallScore, 0) / categoryResults.length;
    const categoryPass = categoryResults.filter(r => r.scores.overallScore === 100).length;

    console.log(`  ${category}: ${categoryScore.toFixed(1)}/100 (${categoryPass}/${categoryResults.length} perfect)`);
  }

  // Flush Langfuse
  await langfuse.flushAsync();
  console.log(`\n✅ Evaluation complete! View results at: ${process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com'}`);
}

// Run if called directly
if (require.main === module) {
  runEvaluation()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Evaluation failed:', error);
      process.exit(1);
    });
}

export { runEvaluation };
