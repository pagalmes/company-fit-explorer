import { NextRequest, NextResponse } from 'next/server';
import { getCompanyLogo } from '@/utils/logoProvider';

interface CompanyDiscoveryRequest {
  candidateName: string;
  targetRole: string;
  experience: string[];
  targetCompanies: string;
  mustHaves: string[];
  wantToHave: string[];
}

/**
 * Sanitize user input to prevent injection attacks
 * - Removes SQL injection attempts
 * - Limits string length
 * - Strips dangerous characters
 * - Prevents XSS
 */
function sanitizeString(input: string, maxLength: number = 500): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove null bytes and control characters
  let sanitized = input.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Remove SQL injection patterns (common keywords and syntax)
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
    /(--|;|\/\*|\*\/|xp_|sp_)/gi,
    /('|\"|`|\\)/g // Remove quotes and backslashes
  ];

  sqlPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Remove HTML/script tags for XSS prevention
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/<[^>]+>/g, '');

  // Limit length
  sanitized = sanitized.substring(0, maxLength).trim();

  return sanitized;
}

/**
 * Sanitize array of strings
 */
function sanitizeArray(arr: string[], maxLength: number = 200): string[] {
  if (!Array.isArray(arr)) {
    return [];
  }

  return arr
    .filter(item => typeof item === 'string')
    .map(item => sanitizeString(item, maxLength))
    .filter(item => item.length > 0)
    .slice(0, 20); // Limit array size
}

/**
 * Validate and sanitize the discovery request
 */
function validateAndSanitizeRequest(raw: any): CompanyDiscoveryRequest | null {
  try {
    // Validate required fields exist
    if (!raw.candidateName || !raw.targetRole) {
      return null;
    }

    return {
      candidateName: sanitizeString(raw.candidateName, 100),
      targetRole: sanitizeString(raw.targetRole, 200),
      experience: sanitizeArray(raw.experience || [], 150),
      targetCompanies: sanitizeString(raw.targetCompanies, 300),
      mustHaves: sanitizeArray(raw.mustHaves || [], 200),
      wantToHave: sanitizeArray(raw.wantToHave || [], 200)
    };
  } catch (error) {
    console.error('Validation error:', error);
    return null;
  }
}

/**
 * Use Perplexity Sonar API to discover companies matching candidate profile
 * This endpoint searches the web in real-time to find companies with verified open roles
 */
export async function POST(request: NextRequest) {
  try {
    const rawRequest = await request.json();

    // Validate and sanitize all input
    const discoveryRequest = validateAndSanitizeRequest(rawRequest);

    if (!discoveryRequest) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request: candidateName and targetRole are required'
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.PERPLEXITY_API_KEY;

    if (!apiKey) {
      // Graceful degradation: return empty profile with warning instead of error
      console.warn('⚠️ PERPLEXITY_API_KEY not configured - returning empty company list');
      return NextResponse.json({
        success: true,
        warning: 'PERPLEXITY_API_KEY not configured. Company discovery is disabled. Add the key to your environment variables to enable AI-powered company discovery.',
        data: {
          baseCompanies: []
        },
        citations: [],
        usage: {
          model: 'none',
          tokensUsed: 0
        }
      });
    }

    console.log(`🔍 Starting Perplexity company discovery for: ${discoveryRequest.candidateName}`);
    console.log(`🎯 Target Role: ${discoveryRequest.targetRole}`);

    // Build the discovery prompt
    const prompt = buildDiscoveryPrompt(discoveryRequest);

    // Call Perplexity Chat Completions API (Sonar model) with structured outputs
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a Company Discovery Specialist with deep knowledge of the US company ecosystem. You search the web in real-time to find companies with verified open roles and provide detailed, accurate company information in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2, // Low temperature for consistent, factual responses
        max_tokens: 16000, // Increased for 30-40 companies with detailed information
        return_citations: true,
        search_recency_filter: 'month', // Focus on recent job postings
        response_format: {
          type: 'json_schema',
          json_schema: {
            schema: getDiscoveryResponseSchema()
          }
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Perplexity API error:', response.status, errorData);
      throw new Error(`Perplexity API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content;
    const finishReason = data.choices?.[0]?.finish_reason;
    const citations = data.citations || [];

    if (!responseText) {
      throw new Error('No response content from Perplexity API');
    }

    // Check if response was truncated
    if (finishReason === 'length') {
      console.warn('⚠️ Response was truncated due to max_tokens limit');
      throw new Error('Response was truncated. Please reduce the number of companies requested or increase max_tokens.');
    }

    console.log('✅ Perplexity discovery complete');
    console.log(`📊 Response length: ${responseText.length} characters`);
    console.log(`📚 Citations: ${citations.length} sources`);
    console.log(`🔚 Finish reason: ${finishReason || 'unknown'}`);
    console.log('📝 First 500 chars of response:', responseText.substring(0, 500));

    // Parse the JSON response from Perplexity
    const discoveredData = parseDiscoveryResponse(responseText);

    return NextResponse.json({
      success: true,
      data: discoveredData,
      citations,
      usage: {
        model: data.model,
        tokensUsed: data.usage?.total_tokens || 0
      }
    });

  } catch (error) {
    console.error('Company discovery error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to discover companies'
      },
      { status: 500 }
    );
  }
}

/**
 * Generate JSON Schema for structured output
 * This ensures Perplexity returns valid JSON matching our expected structure
 */
function getDiscoveryResponseSchema(): any {
  return {
    type: 'object',
    required: ['baseCompanies'],
    properties: {
      baseCompanies: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'name', 'matchScore'],
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            logo: { type: 'string' },
            careerUrl: { type: 'string' },
            matchScore: { type: 'number', minimum: 0, maximum: 100 },
            industry: { type: 'string' },
            stage: { type: 'string' },
            location: { type: 'string' },
            employees: { type: 'string' },
            remote: { type: 'string' },
            openRoles: { type: 'number', minimum: 0 },
            connections: {
              type: 'array',
              items: { type: 'number' }
            },
            connectionTypes: {
              type: 'object',
              additionalProperties: { type: 'string' }
            },
            matchReasons: {
              type: 'array',
              items: { type: 'string' }
            },
            externalLinks: {
              type: 'object',
              properties: {
                website: { type: 'string' },
                linkedin: { type: 'string' },
                glassdoor: { type: 'string' },
                crunchbase: { type: 'string' }
              }
            }
          }
        }
      }
    }
  };
}

/**
 * Build the company discovery prompt based on user's profile
 *
 * NOTE: Profile extraction is now handled by Claude (extract-profile endpoint).
 * This prompt receives pre-extracted CMF data and focuses purely on company discovery.
 */
function buildDiscoveryPrompt(request: CompanyDiscoveryRequest): string {
  return `You are a Company Discovery Specialist with deep knowledge of the US company ecosystem. Your task is to identify companies that match a candidate's profile and requirements.

## CANDIDATE PROFILE (Pre-extracted)
Name: ${request.candidateName}
Target Role: ${request.targetRole}
Experience: ${request.experience.length > 0 ? request.experience.join(', ') : 'Not specified'}
Target Companies: ${request.targetCompanies}

## MUST-HAVE CRITERIA (All must be met)
${request.mustHaves.length > 0 ? request.mustHaves.map((item, i) => `${i + 1}. ${item}`).join('\n') : 'Not specified'}

## WANT-TO-HAVE CRITERIA (More = better match)
${request.wantToHave.length > 0 ? request.wantToHave.map((item, i) => `${i + 1}. ${item}`).join('\n') : 'Not specified'}

## DISCOVERY TASK
Find 30-40 companies that match this profile. Include a mix of:
- 15%-20% obvious top-tier matches (well-known companies)
- 30%-40% strong matches (growing companies with good fit)
- 20%-30% local gems (companies with physical presence in candidate's preferred locations)
- 15%-20% hidden gem discoveries (lesser-known but excellent matches)
- 10%-15% stretch opportunities (aspirational but possible matches)

## RESEARCH REQUIREMENTS
For each company, verify by searching the web:
1. **Current open roles** matching the target position level (verify on company career pages, LinkedIn Jobs, or ATS platforms)
2. **Location policies** and remote work options (prioritize companies with physical presence in candidate's preferred cities)
3. **Company stage** (funding round, public/private status)
4. **Recent growth indicators** (hiring trends, funding news, expansion)
5. **Cultural values** and work environment fit
6. **Technical innovation areas** relevant to candidate experience and career goals

## CRITICAL VERIFICATION RULES
- ONLY include companies with **verified open roles at the target level**
- Confirm jobs are visible on:
  - Company career pages (e.g., company.com/careers)
  - LinkedIn Jobs
  - ATS platforms (Greenhouse, Lever, Ashby, etc.)
- AVOID job aggregators like Teal, BeeBee, ZipRecruiter, Indeed (use these to find companies, but verify on official sources)
- Check that job postings are recent (within last 30 days preferred)

## OUTPUT FORMAT
Return valid JSON matching the specified schema structure. The response must conform to the JSON schema provided:

{
  "baseCompanies": [
    {
      "id": 1,
      "name": "Company Name",
      "logo": "company.com",
      "careerUrl": "https://company.com/careers",
      "matchScore": 95,
      "industry": "Industry Category",
      "stage": "Series C / Public / Late Stage",
      "location": "City, State",
      "employees": "~500 / 1000-5000",
      "remote": "Remote-Friendly / Hybrid / In-Office",
      "openRoles": 3,
      "connections": [2, 3, 4],
      "connectionTypes": {
        "2": "Similar Industry",
        "3": "Similar Stage",
        "4": "Similar Culture"
      },
      "matchReasons": [
        "Specific role title posted with salary range",
        "Remote policy matches requirements",
        "Company stage and growth trajectory align",
        "Cultural values match candidate priorities"
      ],
      "externalLinks": {
        "website": "https://company.com"
      }
    }
  ]
}

## IMPORTANT GUIDELINES
1. **Match Score Calculation (0-100)**:
   - 90-100: Excellent match (all must-haves + most want-to-haves)
   - 80-89: Good match (all must-haves + some want-to-haves)
   - 70-79: Fair match (all must-haves, few want-to-haves)
   - 60-69: Consider carefully (most must-haves)

2. **Match Reasons**: Provide 3-4 specific, evidence-based reasons with concrete details (role names, policies, metrics)

3. **Connections**: Reference other company IDs in the list that are related (similar industry, stage, or culture)

4. **Logo URLs**: Simply provide the company domain (e.g., "stripe.com", "openai.com"). The logo will be fetched automatically.

6. **Career URLs**: Provide direct links to company career pages (not job boards)

7. **Verify Everything**: All information must be current and verifiable via web search

Research thoroughly and provide specific evidence for each company. Return ONLY the JSON object, no additional text.`;
}

/**
 * Extract domain from various URL formats
 * Tries to extract from careerUrl, website, or logo URL
 */
function extractDomain(company: any): string | undefined {
  const urlSources = [
    company.careerUrl,
    company.externalLinks?.website,
    company.logo
  ];

  for (const url of urlSources) {
    if (!url || typeof url !== 'string') continue;

    try {
      const parsed = new URL(url);
      // Only extract from valid HTTPS URLs
      if (parsed.protocol === 'https:') {
        return parsed.hostname;
      }
    } catch {
      // Invalid URL, try next source
      continue;
    }
  }

  return undefined;
}

/**
 * Sanitize a single company object from Perplexity response
 */
function sanitizeCompany(company: any, index: number): any {
  // Validate URL format (must be valid HTTPS URLs)
  const sanitizeUrl = (url: string | undefined): string => {
    if (!url || typeof url !== 'string') return '';

    try {
      const parsed = new URL(url);
      // Block dangerous protocols
      if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') return '';
      // Only allow https URLs
      if (parsed.protocol !== 'https:') return '';
      return url;
    } catch {
      return '';
    }
  };

  // Validate and clamp numeric values
  const sanitizeNumber = (val: any, min: number, max: number, defaultVal: number): number => {
    const num = Number(val);
    if (isNaN(num)) return defaultVal;
    return Math.max(min, Math.min(max, num));
  };

  // Extract domain and generate logo URL using our logo provider
  const domain = extractDomain(company);
  const companyName = sanitizeString(company.name || 'Unknown Company', 100);
  const logoUrl = getCompanyLogo(domain, companyName);

  return {
    id: sanitizeNumber(company.id, 1, 10000, index + 1),
    name: companyName,
    logo: logoUrl,
    careerUrl: sanitizeUrl(company.careerUrl),
    matchScore: sanitizeNumber(company.matchScore, 0, 100, 50),
    industry: sanitizeString(company.industry || '', 100),
    stage: sanitizeString(company.stage || '', 100),
    location: sanitizeString(company.location || '', 150),
    employees: sanitizeString(company.employees || '', 50),
    remote: sanitizeString(company.remote || '', 100),
    openRoles: sanitizeNumber(company.openRoles, 0, 1000, 0),
    connections: Array.isArray(company.connections)
      ? company.connections.filter((c: any) => typeof c === 'number').slice(0, 10)
      : [],
    connectionTypes: typeof company.connectionTypes === 'object' && company.connectionTypes !== null
      ? Object.fromEntries(
          Object.entries(company.connectionTypes)
            .filter(([key, val]) => typeof key === 'string' && typeof val === 'string')
            .map(([key, val]) => [sanitizeString(key, 20), sanitizeString(val as string, 100)])
            .slice(0, 10)
        )
      : {},
    matchReasons: Array.isArray(company.matchReasons)
      ? company.matchReasons
          .filter((r: any) => typeof r === 'string')
          .map((r: string) => sanitizeString(r, 500))
          .slice(0, 10)
      : [],
    externalLinks: typeof company.externalLinks === 'object' && company.externalLinks !== null
      ? {
          website: sanitizeUrl(company.externalLinks.website),
          linkedin: sanitizeUrl(company.externalLinks.linkedin),
          glassdoor: sanitizeUrl(company.externalLinks.glassdoor),
          crunchbase: sanitizeUrl(company.externalLinks.crunchbase)
        }
      : {}
  };
}

/**
 * Find and log the context around a JSON parse error
 */
function getJSONErrorContext(jsonText: string, error: SyntaxError): string {
  const positionMatch = error.message.match(/position (\d+)/);
  if (!positionMatch) return '';
  
  const position = parseInt(positionMatch[1], 10);
  const start = Math.max(0, position - 100);
  const end = Math.min(jsonText.length, position + 100);
  const context = jsonText.substring(start, end);
  const pointer = ' '.repeat(Math.max(0, position - start)) + '^';
  
  return `\nError at position ${position}:\n${context}\n${pointer}`;
}

/**
 * Extract JSON from text that may contain conversational content before/after
 * Handles cases where LLM adds explanatory text around the JSON
 * Also handles reasoning model outputs with <think> tags
 */
function extractJSON(text: string): string {
  let jsonText = text.trim();

  // Remove reasoning tags if present (for reasoning models like sonar-reasoning-pro)
  // Format: <think>...</think>{...json...}
  if (jsonText.includes('<think>')) {
    const reasoningEnd = jsonText.indexOf('</think>');
    if (reasoningEnd !== -1) {
      jsonText = jsonText.substring(reasoningEnd + '</think>'.length).trim();
    }
  }

  // First, try to remove markdown code blocks if present
  if (jsonText.includes('```json')) {
    const jsonBlockMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      return jsonBlockMatch[1].trim();
    }
  }
  if (jsonText.includes('```')) {
    const codeBlockMatch = jsonText.match(/```[a-z]*\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
  }

  // If no code blocks, try to find JSON object by finding the first {
  const firstBraceIndex = jsonText.indexOf('{');
  if (firstBraceIndex === -1) {
    throw new Error('No JSON object found in response');
  }

  // Find the matching closing brace by tracking brace depth
  let braceDepth = 0;
  let inString = false;
  let escapeNext = false;
  let lastQuote = '';

  for (let i = firstBraceIndex; i < jsonText.length; i++) {
    const char = jsonText[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      lastQuote = char;
      continue;
    }

    if (inString && char === lastQuote) {
      inString = false;
      lastQuote = '';
      continue;
    }

    if (!inString) {
      if (char === '{') {
        braceDepth++;
      } else if (char === '}') {
        braceDepth--;
        if (braceDepth === 0) {
          // Found the complete JSON object
          return jsonText.substring(firstBraceIndex, i + 1);
        }
      }
    }
  }

  // If we couldn't find a complete JSON object, try parsing from first brace to end
  // (sometimes the closing brace might be there but our parser missed it)
  const potentialJSON = jsonText.substring(firstBraceIndex);
  return potentialJSON.trim();
}

/**
 * Parse and sanitize the Perplexity response
 * IMPORTANT: This validates and sanitizes ALL data from the LLM before database storage
 */
function parseDiscoveryResponse(responseText: string): any {
  try {
    // Extract JSON from response (handles conversational text before/after)
    const jsonText = extractJSON(responseText);
    
    // Log JSON length for debugging
    console.log(`📋 Extracted JSON length: ${jsonText.length} characters`);
    
    // Validate JSON structure before parsing
    // Check if JSON might be truncated (common issue with large responses)
    const openBraces = (jsonText.match(/{/g) || []).length;
    const closeBraces = (jsonText.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      const braceDiff = openBraces - closeBraces;
      console.error(`❌ JSON brace mismatch: ${openBraces} open, ${closeBraces} close (difference: ${braceDiff})`);
      console.error('Last 500 chars of JSON:', jsonText.substring(Math.max(0, jsonText.length - 500)));
      throw new Error(`JSON appears to be truncated or malformed. Brace mismatch: ${openBraces} open vs ${closeBraces} close.`);
    }
    
    // Check for common JSON syntax issues
    // Look for unclosed strings or arrays
    const openBrackets = (jsonText.match(/\[/g) || []).length;
    const closeBrackets = (jsonText.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      console.error(`❌ JSON bracket mismatch: ${openBrackets} open, ${closeBrackets} close`);
      throw new Error(`JSON appears to be truncated or malformed. Bracket mismatch: ${openBrackets} open vs ${closeBrackets} close.`);
    }
    
    const parsed = JSON.parse(jsonText);

    // Validate the structure
    if (!parsed.baseCompanies || !Array.isArray(parsed.baseCompanies)) {
      throw new Error('Invalid response structure: missing baseCompanies array');
    }

    // Sanitize each company
    const sanitizedCompanies = parsed.baseCompanies
      .filter((c: any) => c && typeof c === 'object')
      .map((company: any, index: number) => sanitizeCompany(company, index))
      .filter((c: any) => c.name && c.name !== 'Unknown Company')
      .slice(0, 50); // Limit to 50 companies max

    console.log(`✅ Parsed and sanitized ${sanitizedCompanies.length} companies successfully`);

    return {
      baseCompanies: sanitizedCompanies
    };
  } catch (error) {
    console.error('❌ Failed to parse Perplexity response:', error);
    
    // Extract error position if it's a JSON parse error
    let errorContext = '';
    if (error instanceof SyntaxError) {
      try {
        const jsonText = extractJSON(responseText);
        errorContext = getJSONErrorContext(jsonText, error);
        console.error('JSON parse error context:', errorContext);
      } catch (extractError) {
        // If extraction fails, just log the original error
        console.error('Could not extract JSON for error context:', extractError);
      }
    }
    
    console.error('Raw response (first 1000 chars):', responseText.substring(0, 1000));
    console.error('Raw response (last 500 chars):', responseText.substring(Math.max(0, responseText.length - 500)));
    
    // Check if response was truncated
    const data = responseText;
    if (data.length > 7000) {
      console.warn('⚠️ Response is very long - may have hit max_tokens limit');
    }
    
    throw new Error(`Failed to parse company discovery response: ${error instanceof Error ? error.message : 'Invalid JSON'}${errorContext}`);
  }
}
