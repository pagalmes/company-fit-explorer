import { NextRequest, NextResponse } from 'next/server';
import { getModelForTask } from '@/utils/llm/config';
import { extractText } from 'unpdf';
import { isPDF, parseProfileResponse, calculateCost } from './utils';

/**
 * Profile Extraction Endpoint
 *
 * Uses Claude to extract structured UserCMF data from resume and career goals documents.
 * Supports PDF files via base64 encoding.
 *
 * Claude self-evaluates extraction confidence so we can surface low-confidence
 * results to the user without relying on brittle heuristics.
 *
 * Request body:
 * {
 *   resume: { data: string (base64), type: string (mime type), name: string },
 *   careerGoals: { data: string (base64), type: string (mime type), name: string }
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   cmf: UserCMF,
 *   extractionConfidence: 'high' | 'medium' | 'low',
 *   extractionIssues: string[],
 *   usage: { inputTokens, outputTokens, totalCost }
 * }
 */

interface FileData {
  data: string;      // base64 encoded content
  type: string;      // mime type (application/pdf, text/plain, etc.)
  name: string;      // original filename
}

interface ExtractProfileRequest {
  resume: FileData;
  careerGoals: FileData;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExtractProfileRequest = await request.json();
    const { resume, careerGoals } = body;

    if (!resume?.data || !careerGoals?.data) {
      return NextResponse.json(
        { success: false, error: 'Both resume and career goals documents are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'ANTHROPIC_API_KEY not configured in environment variables' },
        { status: 400 }
      );
    }

    // Extract text and build messages (PDF text extraction reduces token usage)
    const messages = await buildMessagesWithDocuments(resume, careerGoals);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'structured-outputs-2025-11-13'
      },
      body: JSON.stringify({
        model: getModelForTask('PROFILE_EXTRACTION'),
        max_tokens: 4096,
        temperature: 0.3, // Lower temperature for consistent extraction
        messages,
        output_format: {
          type: 'json_schema',
          schema: getProfileExtractionSchema()
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Claude API error:', errorData);
      throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const responseText = data.content[0]?.text;

    if (!responseText) {
      throw new Error('No response content from Claude API');
    }

    console.log('📝 Profile extraction response length:', responseText.length, 'characters');
    console.log('⏹️  Stop reason:', data.stop_reason);

    const result = parseProfileResponse(responseText);

    // Log confidence and any issues Claude flagged
    console.log('✅ Profile extracted:', {
      name: result.name,
      targetRole: result.targetRole,
      mustHavesCount: result.mustHaves.length,
      wantToHaveCount: result.wantToHave.length,
      experienceCount: result.experience.length,
      extractionConfidence: result.extractionConfidence,
      extractionIssues: result.extractionIssues,
    });

    if (result.extractionConfidence === 'low') {
      console.error('❌ Claude reported low extraction confidence:', result.extractionIssues);
      throw new Error(
        `Profile extraction confidence is low. Issues: ${result.extractionIssues.join(', ')}. ` +
        'Please ensure documents contain specific information about target role, companies, and requirements.'
      );
    }

    if (result.extractionConfidence === 'medium') {
      console.warn('⚠️  Claude reported medium extraction confidence:', result.extractionIssues);
    }

    // Strip internal fields before returning — callers don't need them in cmf
    const { extractionConfidence, extractionIssues, ...cmfData } = result;

    return NextResponse.json({
      success: true,
      cmf: cmfData,
      extractionConfidence,
      extractionIssues,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
        totalCost: calculateCost(data.usage?.input_tokens || 0, data.usage?.output_tokens || 0)
      }
    });

  } catch (error) {
    console.error('Profile extraction error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract profile'
      },
      { status: 500 }
    );
  }
}

/**
 * Extract text from a file (supports PDF and text files)
 * For PDFs, uses unpdf to extract text content - more efficient than sending images
 */
async function extractTextFromFile(file: FileData): Promise<string> {
  const buffer = Buffer.from(file.data, 'base64');

  if (isPDF(file.type)) {
    try {
      console.log(`📄 Extracting text from PDF: ${file.name}`);
      const uint8Array = new Uint8Array(buffer);
      const { text } = await extractText(uint8Array, { mergePages: true });
      console.log(`   Extracted ${text.length} characters from PDF`);
      return text;
    } catch (error) {
      console.error(`Failed to extract text from PDF ${file.name}:`, error);
      throw new Error(`Failed to extract text from PDF: ${file.name}`);
    }
  } else {
    return buffer.toString('utf-8');
  }
}

/**
 * Build messages array with extracted text content for Claude API
 */
async function buildMessagesWithDocuments(resume: FileData, careerGoals: FileData) {
  const resumeText = await extractTextFromFile(resume);
  const careerGoalsText = await extractTextFromFile(careerGoals);

  const content = [
    {
      type: 'text',
      text: `=== RESUME (${resume.name}) ===\n\n${resumeText}`
    },
    {
      type: 'text',
      text: `=== CAREER GOALS / CMF (${careerGoals.name}) ===\n\n${careerGoalsText}`
    },
    {
      type: 'text',
      text: buildExtractionPrompt()
    }
  ];

  return [{ role: 'user', content }];
}

/**
 * JSON Schema for profile extraction.
 *
 * Includes extractionConfidence and extractionIssues so Claude can self-evaluate
 * the quality of its own output — avoiding the need for brittle post-hoc heuristics.
 */
function getProfileExtractionSchema() {
  const cmfItemSchema = {
    type: 'object',
    properties: {
      short: {
        type: 'string',
        description: 'Short label for UI display (2-6 words, e.g., "High Velocity of Execution")'
      },
      detailed: {
        type: 'string',
        description: 'Full description with context for matching (1-2 sentences explaining what this means)'
      }
    },
    required: ['short', 'detailed'],
    additionalProperties: false
  };

  return {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'The candidate\'s full name'
      },
      targetRole: {
        type: 'string',
        description: 'The specific job title or role they are seeking'
      },
      targetCompanies: {
        type: 'string',
        description: 'Description of what type of companies they want to work at'
      },
      mustHaves: {
        type: 'array',
        items: cmfItemSchema,
        description: 'Non-negotiable requirements with short labels and detailed descriptions'
      },
      wantToHave: {
        type: 'array',
        items: cmfItemSchema,
        description: 'Nice-to-have preferences with short labels and detailed descriptions'
      },
      experience: {
        type: 'array',
        items: { type: 'string' },
        description: 'Key skills, domains, and experience areas - short labels only (2-4 words each)'
      },
      extractionConfidence: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: 'Your confidence that the extracted profile reflects real information from the documents. "high" = specific data clearly present; "medium" = some inference required; "low" = documents too vague to extract meaningful specifics'
      },
      extractionIssues: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of specific fields or items where you had to guess or fall back to generic values. Empty array if confidence is high.'
      }
    },
    required: ['name', 'targetRole', 'targetCompanies', 'mustHaves', 'wantToHave', 'experience', 'extractionConfidence', 'extractionIssues'],
    additionalProperties: false
  };
}

/**
 * Build the extraction prompt.
 * Note: Output format is enforced by the JSON schema above.
 */
function buildExtractionPrompt(): string {
  return `Based on the resume and career goals documents above, extract the candidate's profile information.

## CRITICAL REQUIREMENTS

🚫 **NEVER use these generic/placeholder values:**
- "Professional Role" / "Professional" / "User"
- "No experience specified" / "Experience" / "Skills"
- "Growth-oriented companies" / "Tech companies"
- "High-quality team culture" / "Competitive compensation"
- Any vague or generic descriptions

✅ **ALWAYS extract SPECIFIC information from the actual documents:**
- Actual names, roles, and company types from the text
- Specific technologies, skills, and domains mentioned
- Concrete requirements stated in career goals
- Real experience and achievements from resume

## EXTRACTION INSTRUCTIONS

### 1. Name (REQUIRED)
- Extract the candidate's actual full name from the resume
- Look at the top of resume, email signature, or "Name:" field
- If not found, use filename without extension

### 2. Target Role (REQUIRED - BE SPECIFIC)
- Extract the EXACT role they're seeking from career goals or resume objective
- Examples of GOOD extractions: "Senior Product Manager - AI/ML", "Staff Software Engineer", "VP of Engineering"
- Examples of BAD extractions: "Professional Role", "Manager", "Engineer" ❌
- If not explicitly stated, infer from their experience level and domain

### 3. Target Companies (REQUIRED - BE SPECIFIC)
- Extract their actual company preferences from career goals
- Examples of GOOD extractions: "Series B-D startups in AI/ML space", "Late-stage fintech companies", "Healthcare tech startups in San Diego"
- Examples of BAD extractions: "Growth-oriented companies", "Tech companies", "Startups" ❌
- Include: company stage, industry, location if mentioned

### 4. Must-Haves (EXTRACT 4-6 SPECIFIC ITEMS)
- Extract their actual non-negotiable requirements from career goals
- Each item needs a "short" label (2-6 words) and a "detailed" description (1-2 sentences)
- Example: { "short": "Remote-First Culture", "detailed": "A company that embraces remote work as a first-class option with async communication and flexible hours" }
- If career goals list explicit must-haves, USE THOSE verbatim

### 5. Want-to-Haves (EXTRACT 4-6 SPECIFIC ITEMS)
- Extract their nice-to-have preferences from career goals
- Same format as Must-Haves
- Example: { "short": "Equity Package", "detailed": "Meaningful equity stake with transparent vesting schedule and potential for significant upside" }

### 6. Experience (EXTRACT 6-10 SPECIFIC ITEMS)
- Extract key skills, technologies, and domains from resume
- Short labels only (2-4 words each)
- Examples: "Python/Django", "AWS/Kubernetes", "Team Leadership (10+)", "Startup 0-1 Products"
- Include years if mentioned

## SELF-EVALUATION (REQUIRED)

After extracting, assess your own output:

**extractionConfidence:**
- "high" — You found specific, concrete information for all fields directly in the documents
- "medium" — Most fields are specific but 1-2 required reasonable inference or the documents were somewhat vague
- "low" — The documents lack enough specific information; you had to use generic fallbacks for multiple fields

**extractionIssues:**
- List each field where you had to guess or use a generic value
- Example: ["targetRole was inferred from job titles only — no explicit target stated", "targetCompanies defaulted to general preference — no company type specified"]
- Leave empty if confidence is "high"`;
}

