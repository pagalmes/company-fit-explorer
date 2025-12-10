# LLM Evaluations with Langfuse

This directory contains evaluation tests for LLM-powered features in Cosmos using [Langfuse](https://langfuse.com/).

## Why LLM Evals?

LLM evaluation helps us:
- **Prevent regressions**: Ensure prompt changes don't break existing functionality
- **Track accuracy**: Monitor how well LLMs perform on real tasks
- **Catch bugs early**: Detect issues before they reach users
- **Document expectations**: Codify what "correct" looks like for each feature

## Setup

### 1. Install Dependencies

```bash
npm install
```

Dependencies already included: `langfuse`, `langfuse-node`

### 2. Get Langfuse Credentials

**Option A: Cloud (Easiest)**
1. Go to https://cloud.langfuse.com
2. Create a free account
3. Create a new project
4. Copy your Public Key and Secret Key

**Option B: Self-Hosted**
```bash
# See https://langfuse.com/docs/deployment/self-host
docker compose up -d
```

### 3. Configure Environment

Add to your `.env.local`:

```bash
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com  # or your self-hosted URL
```

## Available Evaluations

### Company URL Extraction

Tests that the LLM correctly infers company website URLs and doesn't return third-party hosting platforms.

**Run:**
```bash
npm run eval:company-extraction
```

**What it tests:**
- ✅ Company name extraction
- ✅ Website URL inference (welltheory.com, not notion.so)
- ✅ Career page URL preservation
- ✅ No third-party platforms in website URL

**Test cases:**
- Notion.so career pages
- Greenhouse.io career pages
- Lever.co career pages
- Ashby career pages
- LinkedIn company pages
- Direct company career pages

## Reading Results

After running an eval, view results at:
- **Cloud**: https://cloud.langfuse.com
- **Self-hosted**: Your configured `LANGFUSE_HOST`

### What You'll See

1. **Overall Score**: 0-100 for each test case
2. **Individual Metrics**:
   - `url-correctness`: Did LLM return correct domain?
   - `no-third-party-platform`: URL doesn't contain notion.so, greenhouse.io, etc.
   - `overall-score`: Weighted combination

3. **Traces**: Full LLM call details (input, output, latency, cost)

### Example Output

```
🧪 Running Company URL Extraction Evaluation
📊 Test cases: 10

Testing: WellTheory on Notion.so...
  ✅ Score: 100/100

Testing: Stripe on Greenhouse...
  ✅ Score: 100/100

📈 Summary:
  Average Score: 95.0/100
  Perfect Scores: 9/10 (90.0%)
  Average Latency: 847ms

📊 Breakdown by Category:
  notion: 100.0/100 (1/1 perfect)
  greenhouse: 100.0/100 (2/2 perfect)
  lever: 100.0/100 (1/1 perfect)
```

## Adding New Evaluations

### 1. Create Dataset

```typescript
// evals/your-feature/dataset.ts
export const testDataset = [
  {
    id: 'test-1',
    input: { /* ... */ },
    expected: { /* ... */ },
  },
  // ...
];
```

### 2. Create Eval Script

```typescript
// evals/your-feature/run-eval.ts
import { Langfuse } from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
});

// Score result
function scoreResult(expected, actual) {
  // Your scoring logic
}

// Run evaluation
async function runEvaluation() {
  for (const testCase of testDataset) {
    const result = await yourFunction(testCase.input);
    const scores = scoreResult(testCase.expected, result);

    langfuse.trace({
      name: 'your-feature-eval',
      // ...
    }).score({
      name: 'accuracy',
      value: scores.accuracy,
    });
  }

  await langfuse.flushAsync();
}
```

### 3. Add npm Script

```json
{
  "scripts": {
    "eval:your-feature": "tsx evals/your-feature/run-eval.ts"
  }
}
```

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/evals.yml`:

```yaml
name: LLM Evaluations

on:
  pull_request:
    paths:
      - 'app/api/llm/**'
      - 'evals/**'

jobs:
  run-evals:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run dev &  # Start server
      - run: sleep 10  # Wait for server
      - run: npm run eval:company-extraction
        env:
          LANGFUSE_PUBLIC_KEY: ${{ secrets.LANGFUSE_PUBLIC_KEY }}
          LANGFUSE_SECRET_KEY: ${{ secrets.LANGFUSE_SECRET_KEY }}
```

## Best Practices

1. **Keep test cases real**: Use actual examples from production
2. **Update when fixing bugs**: Add a test case for each bug you fix
3. **Run before deploying**: Ensure no regressions in prompt changes
4. **Monitor in production**: Use Langfuse to track real user interactions

## Troubleshooting

**"Missing Langfuse credentials"**
- Ensure `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` are in `.env.local`
- Check they're valid at https://cloud.langfuse.com

**"API connection failed"**
- Is the dev server running? (`npm run dev`)
- Check port 3000 is accessible

**"All tests failing"**
- Check `ANTHROPIC_API_KEY` is configured
- Verify API has sufficient credits

## Learn More

- [Langfuse Docs](https://langfuse.com/docs)
- [LLM Evaluation Guide](https://langfuse.com/docs/evaluation/overview)
- [Prompt Management](https://langfuse.com/docs/prompts)
