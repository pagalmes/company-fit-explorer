/**
 * Quick Evaluation with 5 Test Cases
 */

import { Langfuse } from 'langfuse';

const testDataset = [
  {
    id: 'weave-greenhouse',
    name: 'Weave on Greenhouse (with context)',
    input: { text: 'Weave - AI regulatory submission platform (Bay Area / US remote) - https://job-boards.greenhouse.io/weave' },
    expected: { name: 'Weave', url: 'https://www.weave.bio', careerUrl: ['https://job-boards.greenhouse.io/weave', 'https://www.weave.bio/careers/'] },
    category: 'greenhouse'
  },
  {
    id: 'daylight-greenhouse',
    name: 'Daylight on Greenhouse (with context)',
    input: { text: 'Daylight - renewable energy integrations (NYC) - https://job-boards.greenhouse.io/daylight' },
    expected: { name: 'Daylight', url: 'https://godaylight.com', careerUrl: 'https://job-boards.greenhouse.io/daylight' },
    category: 'greenhouse'
  },
  {
    id: 'clerq-dover',
    name: 'Clerq on Dover (with context)',
    input: { text: 'Clerq - direct bank account payments (NYC / Florida) - https://app.dover.com/jobs/clerq' },
    expected: { name: 'Clerq', url: 'https://clerq.io', careerUrl: 'https://app.dover.com/jobs/clerq' },
    category: 'dover'
  },
  {
    id: 'fleetworks-ashby',
    name: 'FleetWorks on Ashby (with context)',
    input: { text: 'FleetWorks - AI logistics management platform (Chicago / Bay Area) - https://jobs.ashbyhq.com/FleetWorks' },
    expected: { name: 'FleetWorks', url: 'https://www.fleetworks.ai', careerUrl: 'https://jobs.ashbyhq.com/FleetWorks' },
    category: 'ashby'
  },
  {
    id: 'welltheory-notion',
    name: 'WellTheory on Notion.so (control - no extra context)',
    input: { text: 'WellTheory - https://www.notion.so/Work-at-WellTheory-f4e6aad0b3a9444aa96082023236d23e' },
    expected: { name: 'WellTheory', url: 'https://welltheory.com', careerUrl: 'https://www.notion.so/Work-at-WellTheory-f4e6aad0b3a9444aa96082023236d23e' },
    category: 'notion'
  }
];

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.LANGFUSE_HOST || 'https://us.cloud.langfuse.com',
});

const normalizeUrl = (url?: string) => {
  if (!url) return '';
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/#.*$/, '').replace(/\/$/, '').toLowerCase();
};

function scoreResult(testCase: any, actual: any) {
  const expected = testCase.expected;
  const nameCorrect = actual.name?.toLowerCase() === expected.name.toLowerCase();
  const urlCorrect = normalizeUrl(actual.url) === normalizeUrl(expected.url);

  const careerUrlCorrect = (() => {
    if (!expected.careerUrl) return true;
    const normalizedActual = normalizeUrl(actual.careerUrl);
    if (Array.isArray(expected.careerUrl)) {
      return expected.careerUrl.some((url: string) => normalizeUrl(url) === normalizedActual);
    }
    return normalizedActual === normalizeUrl(expected.careerUrl);
  })();

  const thirdPartyPlatforms = ['notion.so', 'greenhouse.io', 'greenhouse.com', 'lever.co', 'ashbyhq.com', 'linkedin.com', 'bamboohr.com', 'jobvite.com', 'workable.com', 'gem.com', 'comeet.com', 'ycombinator.com', 'dover.com'];
  const actualUrl = normalizeUrl(actual.url);
  const noThirdPartyPlatform = !thirdPartyPlatforms.some(platform => actualUrl.includes(platform));

  let score = 0;
  if (nameCorrect) score += 25;
  if (urlCorrect) score += 50;
  if (careerUrlCorrect) score += 15;
  if (noThirdPartyPlatform) score += 10;

  return { nameCorrect, urlCorrect, careerUrlCorrect, noThirdPartyPlatform, overallScore: score };
}

async function extractCompanies(input: any) {
  const response = await fetch('http://localhost:3000/api/llm/anthropic/extract-companies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return await response.json();
}

async function evaluateTestCase(testCase: any) {
  const startTime = Date.now();
  try {
    const result = await extractCompanies(testCase.input);
    const latency = Date.now() - startTime;
    const extracted = result.companies?.[0] || {};
    const scores = scoreResult(testCase, extracted);

    const trace = langfuse.trace({
      name: 'company-extraction-eval',
      metadata: { testCaseId: testCase.id, category: testCase.category },
    });

    trace.generation({
      name: 'extract-companies',
      input: testCase.input,
      output: extracted,
      metadata: { expected: testCase.expected },
    });

    trace.score({ name: 'url-correctness', value: scores.urlCorrect ? 1 : 0 });
    trace.score({ name: 'no-third-party-platform', value: scores.noThirdPartyPlatform ? 1 : 0 });
    trace.score({ name: 'overall-score', value: scores.overallScore / 100 });

    await langfuse.flushAsync();

    return { testCase, actual: extracted, scores, latency };
  } catch (error: any) {
    const latency = Date.now() - startTime;
    return {
      testCase,
      actual: { name: '', url: '', careerUrl: '' },
      scores: { nameCorrect: false, urlCorrect: false, careerUrlCorrect: false, noThirdPartyPlatform: false, overallScore: 0 },
      latency,
      error: error.message,
    };
  }
}

async function runEvaluation() {
  console.log('🧪 Running Company URL Extraction Evaluation (5 test cases)');
  console.log(`📊 Test cases: ${testDataset.length}\n`);

  const results = [];

  for (const testCase of testDataset) {
    console.log(`Testing: ${testCase.name}...`);
    const result = await evaluateTestCase(testCase);
    results.push(result);

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
    console.log('');
  }

  const totalScore = results.reduce((sum, r) => sum + r.scores.overallScore, 0);
  const avgScore = totalScore / results.length;
  const passCount = results.filter(r => r.scores.overallScore === 100).length;
  const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;

  console.log(`\n📈 Summary:`);
  console.log(`  Average Score: ${avgScore.toFixed(1)}/100`);
  console.log(`  Perfect Scores: ${passCount}/${results.length} (${((passCount / results.length) * 100).toFixed(1)}%)`);
  console.log(`  Average Latency: ${avgLatency.toFixed(0)}ms`);

  await langfuse.flushAsync();
  console.log(`\n✅ Evaluation complete! View results at: ${process.env.LANGFUSE_HOST || 'https://us.cloud.langfuse.com'}`);
}

runEvaluation().then(() => process.exit(0)).catch((error) => {
  console.error('Evaluation failed:', error);
  process.exit(1);
});
