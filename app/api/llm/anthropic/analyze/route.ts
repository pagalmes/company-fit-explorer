import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_ANTHROPIC_MODEL } from '@/utils/llm/config';

export async function POST(request: NextRequest) {
  try {
    const { request: analysisRequest } = await request.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'ANTHROPIC_API_KEY not configured in environment variables'
        },
        { status: 400 }
      );
    }

    const prompt = buildAnthropicPrompt(analysisRequest);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: DEFAULT_ANTHROPIC_MODEL,
        max_tokens: 1500,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          },
          {
            role: 'assistant',
            content: '{'
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const responseText = data.content[0]?.text;

    if (!responseText) {
      throw new Error('No response content from Claude API');
    }

    // Parse the JSON response
    const companyData = parseAnthropicResponse(responseText);

    // Generate Google search URLs for external links
    const externalLinks = await searchCompanyUrls(analysisRequest.companyName);

    // Add external links with company data
    if (externalLinks && Object.keys(externalLinks).length > 0) {
      companyData.externalLinks = externalLinks;
    }

    return NextResponse.json({
      success: true,
      data: companyData,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
        totalCost: calculateAnthropicCost(data.usage?.input_tokens || 0, data.usage?.output_tokens || 0)
      }
    });

  } catch (error) {
    console.error('Anthropic API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze company with Claude'
      },
      { status: 500 }
    );
  }
}

// Helper function to build Anthropic prompt
function buildAnthropicPrompt(request: any) {
  return `Analyze "${request.companyName}" and provide comprehensive company information as JSON.

User's Candidate Market Fit (CMF) Criteria:
- Target Role: ${request.userCMF.targetRole}
- Must-Haves: ${request.userCMF.mustHaves.join(', ')}
${request.userCMF.wantToHave?.length ? `- Want-to-Have: ${request.userCMF.wantToHave.join(', ')}` : ''}
${request.userCMF.experience?.length ? `- Experience: ${request.userCMF.experience.join(', ')}` : ''}
${request.userCMF.targetCompanies ? `- Target Companies: ${request.userCMF.targetCompanies}` : ''}

Provide a JSON response with this exact structure:

{
  "name": "Company Name",
  "industry": "Primary industry (e.g., AI/ML, Fintech, Gaming, Healthcare)",
  "stage": "Company stage (Early Stage, Late Stage, Public, Mature)",
  "location": "Primary location (e.g., San Francisco, CA)",
  "employees": "Employee range (e.g., ~500, 1000-5000, 10000+)",
  "remote": "Remote policy (Remote-Friendly, Hybrid, In-Office)",
  "openRoles": 15,
  "matchScore": 85,
  "matchReasons": [
    "Specific reason why this company matches user's criteria",
    "Another specific alignment with their requirements",
    "Additional match reason based on their experience"
  ],
  "connections": ["Company1", "Company2", "Company3"],
  "connectionTypes": {
    "Company1": "Direct Competitor",
    "Company2": "Industry Partner",
    "Company3": "Similar Stage"
  },
  "description": "Brief company description focusing on what they do and their mission"
}

Calculate matchScore (0-100) by evaluating:
1. Alignment with must-have criteria (weighted most heavily)
2. Fit with target role and company stage
3. Relevance to experience background
4. Match with want-to-have preferences

Be accurate and base analysis on real company information. Return only valid JSON.`;
}

// Helper function to parse Anthropic response
function parseAnthropicResponse(responseText: string) {
  try {
    // Since we prefilled with '{', prepend it to complete the JSON
    const fullJson = '{' + responseText;

    // Clean up potential markdown formatting
    let cleanedResponse = fullJson
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Remove markdown bold/italic from JSON keys (e.g., **"key"** -> "key")
    cleanedResponse = cleanedResponse.replace(/\*\*"([^"]+)"\*\*/g, '"$1"');
    cleanedResponse = cleanedResponse.replace(/\*"([^"]+)"\*/g, '"$1"');

    const parsed = JSON.parse(cleanedResponse);

    // Remove any externalLinks that Claude might have added (we generate these separately)
    if (parsed.externalLinks) {
      delete parsed.externalLinks;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse Claude response:', responseText);
    console.error('Parse error:', error);
    throw new Error('Invalid JSON response from Claude API');
  }
}

// Helper function to calculate costs
function calculateAnthropicCost(inputTokens: number, outputTokens: number): number {
  // Claude 3.5 Sonnet pricing
  const inputPrice = 3; // $3 per 1M tokens
  const outputPrice = 15; // $15 per 1M tokens

  const inputCost = (inputTokens / 1000000) * inputPrice;
  const outputCost = (outputTokens / 1000000) * outputPrice;
  return inputCost + outputCost;
}

// Helper function to generate search URLs for company platforms
async function searchCompanyUrls(companyName: string, websiteUrl?: string): Promise<Record<string, string> | null> {
  try {
    console.log(`🔍 Generating search URLs for ${companyName}...`);

    // Call our internal endpoint to generate Google search URLs
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/llm/perplexity/search-company-urls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ companyName, websiteUrl })
    });

    if (!response.ok) {
      console.error('URL generation failed:', response.status);
      return null;
    }

    const result = await response.json();

    if (result.success && result.data) {
      console.log('✅ Generated URLs:', result.data);
      return result.data;
    }

    return null;
  } catch (error) {
    console.error('Error generating company URLs:', error);
    return null;
  }
}
