import { NextRequest, NextResponse } from 'next/server';
import { getModelForTask } from '@/utils/llm/config';
import { getCMFCombinedText } from '@/types';

interface EnrichmentCompanyInput {
  id: number;
  name: string;
  industry: string;
  stage: string;
  location: string;
  employees: string;
  remote: string;
  openRoles: number;
  discoveryEvidence?: string[];
  careerUrl?: string;
  externalLinks?: Record<string, string>;
}

interface EnrichmentRequest {
  cmf: {
    name?: string;
    targetRole?: string;
    targetCompanies?: string;
    mustHaves?: (string | { short: string; detailed: string })[];
    wantToHave?: (string | { short: string; detailed: string })[];
    experience?: string[];
  };
  companies: EnrichmentCompanyInput[];
}

/**
 * Phase 3: Batch company enrichment with Claude
 *
 * Takes all discovered companies from Phase 2 + user's CMF profile,
 * returns high-quality matchScore, matchReasons, and cross-company connections
 * for each company in a single API call.
 */
export async function POST(request: NextRequest) {
  try {
    const { cmf, companies }: EnrichmentRequest = await request.json();

    if (!cmf || !companies || companies.length === 0) {
      return NextResponse.json(
        { success: false, error: 'CMF and companies array are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'ANTHROPIC_API_KEY not configured' },
        { status: 400 }
      );
    }

    console.log(`🎯 Phase 3: Enriching ${companies.length} companies with Claude...`);

    const prompt = buildEnrichmentPrompt(cmf, companies);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'structured-outputs-2025-11-13'
      },
      body: JSON.stringify({
        model: getModelForTask('BATCH_ENRICHMENT'),
        max_tokens: 16384,
        temperature: 0.5,
        messages: [{ role: 'user', content: prompt }],
        output_format: {
          type: 'json_schema',
          schema: getEnrichmentSchema(companies.map(c => c.id))
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || 'Unknown error';
      console.error('❌ Claude API error:', response.status, errorData);

      // Graceful degradation for auth/billing errors
      if ([401, 402, 429].includes(response.status)) {
        const warnings: Record<number, string> = {
          401: 'Anthropic API key is invalid or expired.',
          402: 'Anthropic API has no remaining credits.',
          429: 'Anthropic API rate limit exceeded.'
        };
        const warning = `${warnings[response.status]} Company enrichment is temporarily unavailable.`;
        console.warn(`⚠️ ${warning}`);
        return NextResponse.json({
          success: true,
          warning,
          enrichments: [],
          usage: { inputTokens: 0, outputTokens: 0, totalCost: 0 }
        });
      }

      throw new Error(`Claude API error: ${response.status} - ${errorMessage}`);
    }

    const data = await response.json();
    const responseText = data.content[0]?.text;

    if (!responseText) {
      throw new Error('No response content from Claude API');
    }

    console.log(`📏 Enrichment response: ${responseText.length} characters`);
    console.log(`⏹️  Stop reason: ${data.stop_reason}`);

    if (data.stop_reason === 'max_tokens') {
      console.warn('⚠️ Enrichment response truncated — some companies may lack enrichment');
    }

    const parsed = JSON.parse(responseText);

    if (!parsed.enrichments || !Array.isArray(parsed.enrichments)) {
      throw new Error('Invalid response: missing enrichments array');
    }

    // Sanitize enrichment values
    const enrichments = parsed.enrichments.map((e: any) => ({
      id: e.id,
      matchScore: Math.max(0, Math.min(100, Math.round(e.matchScore || 0))),
      matchReasons: (e.matchReasons || []).slice(0, 5).map((r: string) => String(r).slice(0, 300)),
      connections: (e.connections || []).filter((id: number) => typeof id === 'number'),
      connectionTypes: sanitizeConnectionTypes(e.connectionTypes || {})
    }));

    console.log(`✅ Enriched ${enrichments.length} / ${companies.length} companies`);

    return NextResponse.json({
      success: true,
      enrichments,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
        totalCost: calculateCost(data.usage?.input_tokens || 0, data.usage?.output_tokens || 0)
      }
    });

  } catch (error) {
    console.error('❌ Company enrichment error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enrich companies'
      },
      { status: 500 }
    );
  }
}

function sanitizeConnectionTypes(types: Record<string, string>): Record<number, string> {
  const result: Record<number, string> = {};
  for (const [key, value] of Object.entries(types)) {
    const numKey = Number(key);
    if (!isNaN(numKey) && typeof value === 'string') {
      result[numKey] = String(value).slice(0, 100);
    }
  }
  return result;
}

function buildEnrichmentPrompt(cmf: EnrichmentRequest['cmf'], companies: EnrichmentCompanyInput[]): string {
  const mustHavesText = (cmf.mustHaves || []).map(getCMFCombinedText).join('\n  - ');
  const wantToHaveText = (cmf.wantToHave || []).map(getCMFCombinedText).join('\n  - ');
  const experienceText = (cmf.experience || []).join(', ');

  const companiesBlock = companies.map(c => {
    const lines = [
      `Company ID ${c.id}: ${c.name}`,
      `  Industry: ${c.industry} | Stage: ${c.stage} | Location: ${c.location}`,
      `  Employees: ${c.employees} | Remote: ${c.remote} | Open Roles: ${c.openRoles}`
    ];
    if (c.discoveryEvidence && c.discoveryEvidence.length > 0) {
      lines.push(`  Evidence: ${c.discoveryEvidence.join('; ')}`);
    }
    return lines.join('\n');
  }).join('\n\n');

  return `You are a career matching specialist. Analyze each company below against the candidate's profile and provide calibrated match scoring.

## CANDIDATE PROFILE

Name: ${cmf.name || 'Candidate'}
Target Role: ${cmf.targetRole || 'Not specified'}
Target Companies: ${cmf.targetCompanies || 'Not specified'}

Must-Have Criteria (non-negotiable):
  - ${mustHavesText || 'None specified'}

Want-to-Have Criteria (nice-to-have):
  - ${wantToHaveText || 'None specified'}

Experience: ${experienceText || 'Not specified'}

## COMPANIES (${companies.length} total)

${companiesBlock}

## INSTRUCTIONS

For EACH company, produce:

1. **matchScore** (0-100): Calibrated score reflecting CMF alignment.
   Weights: must-haves 40%, target role 25%, experience 20%, want-to-haves 15%.
   - 90-100: Excellent — all must-haves met + most want-to-haves
   - 80-89: Good — all must-haves met + some want-to-haves
   - 70-79: Fair — most must-haves met
   - 60-69: Consider — some must-haves met
   - <60: Weak — significant gaps

2. **matchReasons** (3-4 strings): Specific reasons referencing CMF criteria by name.
   Example: "Strong fit for 'High Velocity of Execution' — Series B startup with 15 open roles and rapid growth trajectory"

3. **connections** (array of 2-4 company IDs from THIS batch): Related companies.
   Only use IDs from the list above. Consider: same industry, similar stage, complementary products, shared tech stack.

4. **connectionTypes** (object mapping connected company ID to relationship label):
   Example: { "5": "Industry Peer", "12": "Similar Stage & Mission" }

IMPORTANT:
- Be honest — not every company should score high.
- Use discovery evidence when available to support your reasoning.
- Connection IDs must reference companies in this batch (IDs: ${companies.map(c => c.id).join(', ')}).
- Calibrate scores relative to each other so the distribution is meaningful.`;
}

function getEnrichmentSchema(companyIds: number[]) {
  return {
    type: 'object',
    properties: {
      enrichments: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Company ID from input'
            },
            matchScore: {
              type: 'number',
              description: 'Match score 0-100 based on CMF alignment'
            },
            matchReasons: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific reasons referencing CMF criteria'
            },
            connections: {
              type: 'array',
              items: { type: 'number' },
              description: 'Related company IDs from this batch'
            },
            connectionTypes: {
              type: 'object',
              additionalProperties: { type: 'string' },
              description: 'Map of company ID to relationship type'
            }
          },
          required: ['id', 'matchScore', 'matchReasons', 'connections', 'connectionTypes'],
          additionalProperties: false
        }
      }
    },
    required: ['enrichments'],
    additionalProperties: false
  };
}

function calculateCost(inputTokens: number, outputTokens: number): number {
  // Sonnet 4.5 pricing: $3/1M input, $15/1M output
  const inputCost = (inputTokens / 1_000_000) * 3;
  const outputCost = (outputTokens / 1_000_000) * 15;
  return inputCost + outputCost;
}
